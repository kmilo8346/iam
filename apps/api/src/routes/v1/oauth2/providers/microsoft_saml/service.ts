import { OAuth2, Users } from '@iam/models';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RedisService } from '@team_seki/nestjs-redis-module';
import { Request } from 'express';
import { readFileSync } from 'fs';
import * as md5 from 'md5';
import * as samlify from 'samlifyx';

import { Http } from '@iam/core';
import secrets from '../../../../../config/secrets';
import ApplicationService from '../../../applications/service';
import UsersService from '../../../applications/users/service';
import { IOptions } from './IOptions';
import { ServiceProvider } from 'samlifyx/types/src/entity-sp';
import PublisherClient from '../../../../../clients/PublisherClient';

const PROVIDER_IDENTIFIER = 'microsoft_saml';

@Injectable()
export class MicrosoftSamlService {
  private samlDefinition: string;
  private certificate: string;
  private identityProvider: samlify.IdentityProviderInstance;

  constructor(
    @Inject('CONFIG_OPTIONS') private options: IOptions,
    private readonly usersService: UsersService,
    private readonly applicationsService: ApplicationService,
    private readonly redisService: RedisService
  ) {
    const { paths } = options;

    this.samlDefinition = readFileSync(paths.samlDefintion).toString();
    this.certificate = readFileSync(paths.certificate).toString();

    samlify.setSchemaValidator({
      validate: (response: string) => {
        return Promise.resolve(response);
      },
    });

    this.identityProvider = samlify.IdentityProvider({
      metadata: this.samlDefinition,
      wantAuthnRequestsSigned: true,
      wantLogoutRequestSigned: true,
      isAssertionEncrypted: true,
    });

    // Used to send service provider metadata to the ADFS team
    // console.log('this.serviceProvider.metadata', this.serviceProvider.getMetadata());
  }

  /**
   * Create a signature from some parameters
   * @returns
   */
  createSignature(
    model: Omit<OAuth2.Providers.SAML.State.TModel, 'signature' | 'callback_uri'>
  ): string {
    return md5(`${model.client_id}${model.redirect_uri}${secrets.API_SIGNATURE_SECRET}`);
  }

  async getDialogUrl(
    originUri: string,
    model: OAuth2.Providers.SAML.Authorize.TModel
  ): Promise<string> {
    // At the end of the "oauth2" process, we need to redirect here agin to
    // validate the data , and then process and return to user redirect uri
    const callbackUri = [
      originUri.substring(0, originUri.lastIndexOf('/dialog?')),
      '/callback',
    ].join('');

    // Create an state for future validation
    // And to get the data from the user
    const stateToSend: OAuth2.Providers.SAML.State.TModel = {
      client_id: model.client_id,
      redirect_uri: model.redirect_uri,
      callback_uri: callbackUri,
      signature: this.createSignature({
        client_id: model.client_id,
        redirect_uri: model.redirect_uri,
      }),
    };

    const state = Buffer.from(JSON.stringify(stateToSend)).toString('base64');
    const { id, context } = this.getSAMLServiceProvider(originUri).createLoginRequest(
      this.identityProvider,
      'redirect'
    );

    // Save oauth2 state in redis using the id as key
    await this.redisService
      .getClient()
      .set(
        `provider_${PROVIDER_IDENTIFIER}_state_${id}`,
        state,
        'EX',
        60 * 60 * 1 /*1 hour is enough time*/
      );

    return context;
  }

  /**
   * Create a service provider according to the originUri
   * @param originUri original Url (introspection)
   * @returns
   */
  private getSAMLServiceProvider(originUri: string): ServiceProvider {
    const providerFragment = '/microsoft/saml';

    const queryStart = originUri.indexOf(providerFragment) + providerFragment.length;
    const pureURL = queryStart >= 0 ? originUri.substring(0, queryStart) : originUri;

    const callbackURL = `${pureURL}/callback`;
    const logoutCallbackURL = `${pureURL}/logout_callback`;

    /*
    console.debug({
      pureURL,
      callbackURL,
      logoutCallbackURL,
    });
    */

    return samlify.ServiceProvider({
      entityID: secrets.PROVIDER_MICROSOFT_SAML_CLIENT_ID,
      authnRequestsSigned: true,
      wantAssertionsSigned: false,
      wantMessageSigned: true,
      wantLogoutResponseSigned: false,
      wantLogoutRequestSigned: true,
      isAssertionEncrypted: true,
      clockDrifts: [-300000, 300000],
      privateKey: readFileSync(this.options.paths.privateKey),
      requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      encPrivateKey: readFileSync(this.options.paths.privateKey),
      signingCert: this.certificate,
      encryptCert: this.certificate,
      logoutRequestTemplate: {
        context:
          '<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="{ID}" Version="2.0" IssueInstant="{IssueInstant}" Destination="{Destination}"><saml:Issuer>{Issuer}</saml:Issuer><saml:NameID>{NameID}</saml:NameID></samlp:LogoutRequest>',
      },
      nameIDFormat: [
        'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      ],
      assertionConsumerService: [
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: callbackURL,
        },
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: callbackURL,
        },
      ],
      singleLogoutService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: logoutCallbackURL,
        },
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: logoutCallbackURL,
        },
      ],
    });
  }

  async authenticateAndGetCallbackUrl(originUri: string, req: Request): Promise<string> {
    // Parse the response from the SAML provider
    const { extract } = await this.getSAMLServiceProvider(originUri).parseLoginResponse(
      this.identityProvider,
      'post',
      req
    );

    // Get the state from redis
    // If not exists, is the same as the state is invalid
    const rawState = await this.redisService
      .getClient()
      .get(`provider_${PROVIDER_IDENTIFIER}_state_${extract.response.inResponseTo}`);

    if (!rawState) {
      throw new Http.Exceptions.InvalidSignature(PROVIDER_IDENTIFIER);
    }

    const state: OAuth2.Providers.SAML.State.TModel = JSON.parse(
      Buffer.from(rawState, 'base64').toString('utf8')
    );

    // attributes: {
    //   'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Camilo',
    //   'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Cabrera',
    //   cargo: 'Sr Full Stack Engineer',
    //   RUT: '248581514',
    //   CC: 'CGO1007312',
    //   mail: 'camilo.cabrera@externos-cl.cencosud.com',
    //   Departamento: 'Eficiencia e Innovacion',
    //   'http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname': 'EF0177'
    // }

    // console.debug('SAML EXTRACT', extract);

    const payload = {
      email: extract.attributes.mail.toLowerCase(),
      identifier: extract.attributes.mail.toLowerCase(),
      provider: PROVIDER_IDENTIFIER,
      locale: 'es',
      name: [
        extract.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
        extract.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
      ].join(' '),
      scopes: [],
      created_at: new Date().toISOString(),
    };

    // First: Get the information from the application
    // because we need to get if the "authorization" is external or internal
    // that information its in the "one record collection" (manifiest)
    const appInfo = await this.applicationsService.getBydId(state.client_id);

    // If the application info exists (if not the previous call throw an error)
    // get the user in the application database
    let user: Users.User.TModel | undefined = undefined;
    try {
      user = await this.usersService.getBydId(state.client_id, {
        identifier: payload.email,
        provider: PROVIDER_IDENTIFIER,
      });
    } catch (ex) {
      if (!(ex instanceof Http.Exceptions.UserNotFound)) {
        throw ex;
      }
    }

    // Create a "possible Schema" for the user
    const possibleNewUser: Users.User.TModel = {
      email: payload.email as string,
      identifier: payload.email as string,
      provider: PROVIDER_IDENTIFIER,
      locale: (() => {
        switch (payload.locale) {
          case 'en':
          case 'es':
          case 'pt':
            return payload.locale as Users.User.Enums.TAvailableLocales;
          default:
            return 'en';
        }
      })(),
      name: payload.name,
      roles: [],
      scopes: [],
      created_at: new Date().toISOString(),
    };

    switch (appInfo.mode) {
      case 'external':
        if (!user) {
          // We need to auto-create in the application,
          // because is external, so Insert the user in the db
          user = possibleNewUser;

          // Validate the user data from ADFS because
          // someone can change claim rules and send invalid data
          const parseResult = Users.User.Schema.safeParse(user);
          if (!parseResult.success) {
            throw new HttpException(
              'Invalid user data received from ADFS',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }
          await this.usersService.create(state.client_id, parseResult.data);
        }
        break;
      case 'internal':
        // Throw an User not in application exception
        // because when the application is "external" the user
        // must be registered in the app

        if (!user) {
          // --[ Authentication Failed
          await PublisherClient.authenticationFailed(
            state.client_id,
            PROVIDER_IDENTIFIER,
            'USER_NOT_REGISTERED_IN_APP',
            possibleNewUser,
            JSON.stringify(extract)
          );

          // RETRIEVE THE LINK FORMAT WITH THE ERROR APPENDED
          return [
            `${state.redirect_uri}`,
            `#status_code=404`,
            `&message=When application mode is internal, the user must be registered in the application`,
            `&code=USER_NOT_REGISTERED_IN_APP`,
          ].join('');
        }
        break;
    }

    // --[ Authentication Success
    await PublisherClient.authenticationSuccessful(
      state.client_id,
      PROVIDER_IDENTIFIER,
      user,
      JSON.stringify(extract)
    );

    // If the user exists in the database ,
    // we need to create and sign the jwt token
    const jwtToken = this.usersService.createToken(state.client_id, user, {
      expirationInMinutes: appInfo.jwt_expiration_in_minutes,
    });

    // RETRIEVE THE LINK FORMAT
    const url = [
      `${state.redirect_uri}`,
      `#access_token=${jwtToken.accessToken}`,
      `&expires_in=${jwtToken.expiresIn}`,
      `&token_type=${jwtToken.type}`,
    ].join('');

    return url;
  }

  async logout(
    originUri: string,
    logoutId: string,
    model: OAuth2.Providers.SAML.Logout.TModel
  ): Promise<string> {
    const replaceTagsByValue = (rawXML: string, tagValues: Record<string, unknown>) => {
      return {
        id: tagValues['ID'],
        context: samlify.SamlLib.replaceTagsByValue(rawXML, tagValues),
      };
    };

    const { id, context: redirectUrl } = await this.getSAMLServiceProvider(
      originUri
    ).createLogoutRequest(
      this.identityProvider,
      'redirect',
      { logoutNameID: logoutId },
      '',
      replaceTagsByValue
    );

    const state = Buffer.from(JSON.stringify(model)).toString('base64');

    await this.redisService
      .getClient()
      .set(
        `provider_${PROVIDER_IDENTIFIER}_logout_state_${id}`,
        state,
        'EX',
        60 * 60 * 1 /*1 hour is enough time*/
      );

    console.log('LOGOUT REQUEST', {
      state,
      redirectUrl,
    });
    return redirectUrl;
  }

  async logoutCallback(originUri: string, req: Request) {
    const result = await this.getSAMLServiceProvider(originUri).parseLogoutResponse(
      this.identityProvider,
      'redirect',
      req
    );

    const rawState = await this.redisService
      .getClient()
      .get(`provider_${PROVIDER_IDENTIFIER}_logout_state_${result.extract.response.inResponseTo}`);

    if (!rawState) {
      throw new Http.Exceptions.InvalidSignature(PROVIDER_IDENTIFIER);
    }

    const state: OAuth2.Providers.SAML.Logout.TModel = JSON.parse(
      Buffer.from(rawState, 'base64').toString('utf8')
    );

    const url = [`${state.redirect_uri}`].join('');

    console.log('LOGOUT CALLBACK', {
      state,
      url,
    });

    return url;
  }
}

export default MicrosoftSamlService;
