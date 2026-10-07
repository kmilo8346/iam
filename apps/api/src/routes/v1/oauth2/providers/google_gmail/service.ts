import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as md5 from 'md5';
import { OAuth2, Users } from '@iam/models';
import { HttpService } from '@nestjs/axios';
import { OAuth2Client } from 'google-auth-library';

import secrets from '../../../../../config/secrets';
import { Http } from '@iam/core';
import UsersService from '../../../applications/users/service';
import ApplicationService from '../../../applications/service';
import PublisherClient from '../../../../../clients/PublisherClient';

const PROVIDER_IDENTIFIER = 'google_gmail';
const PROVIDER_DIALOG_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const PROVIDER_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';

@Injectable()
export class GoogleGmailService {
  constructor(
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
    private readonly applicationsService: ApplicationService
  ) {}

  /**
   * Create a signature from some parameters
   * @param application Application
   * @param clientId Client id to build the signature
   * @param redirectUri Redirect Uri to build the signature
   * @returns
   */
  createSignature(
    model: Omit<OAuth2.Providers.Gmail.State.TModel, 'signature' | 'callback_uri'>
  ): string {
    return md5(`${model.client_id}${model.redirect_uri}${secrets.API_SIGNATURE_SECRET}`);
  }

  getDialogUrl(originUri: string, model: OAuth2.Providers.Gmail.Authorize.TModel): string {
    // At the end of the "oauth2" process, we need to redirect here agin to
    // validate the data , and then process and return to user redirect uri
    const callbackUri = [
      originUri.substring(0, originUri.lastIndexOf('/dialog?')),
      '/callback',
    ].join('');

    // Create an state for future validation
    // And to get the data from the user
    const stateToSend: OAuth2.Providers.Gmail.State.TModel = {
      client_id: model.client_id,
      redirect_uri: model.redirect_uri,
      callback_uri: callbackUri,
      signature: this.createSignature({
        client_id: model.client_id,
        redirect_uri: model.redirect_uri,
      }),
    };

    const state = Buffer.from(JSON.stringify(stateToSend)).toString('base64');

    const url = [
      PROVIDER_DIALOG_URL,
      `?client_id=${secrets.PROVIDER_GOOGLE_GMAIL_CLIENT_ID}`,
      '&response_type=code',
      `&redirect_uri=${callbackUri}`,
      '&prompt=consent',
      '&scope=openid email profile',
      `&state=${state}`,
    ].join('');

    return url;
  }

  async authenticateAndGetCallbackUrl(
    model: OAuth2.Providers.Gmail.Callback.TModel
  ): Promise<string> {
    const state: OAuth2.Providers.Gmail.State.TModel = JSON.parse(
      Buffer.from(model.state, 'base64').toString('utf8')
    );
    const validSignature = this.createSignature({
      client_id: state.client_id,
      redirect_uri: state.redirect_uri,
    });

    if (validSignature !== state.signature) {
      throw new Http.Exceptions.InvalidSignature(PROVIDER_IDENTIFIER);
    }

    // EXCHANGE THE CODE FOR THE AUTHORIZATION CODE
    const response = await this.httpService.axiosRef.post(
      PROVIDER_TOKEN_URL,
      [
        `code=${model.code}`,
        `client_id=${secrets.PROVIDER_GOOGLE_GMAIL_CLIENT_ID}`,
        'grant_type=authorization_code',
        `client_secret=${secrets.PROVIDER_GOOGLE_GMAIL_CLIENT_SECRET}`,
        `redirect_uri=${state.callback_uri}`,
      ].join('&'),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // PARSE JWT
    if (!response.data || (response.data && !response.data.id_token)) {
      throw new Http.Exceptions.RequiredData(PROVIDER_IDENTIFIER, 'id_token');
    }

    // Find in the db "app_id" (example: arcus, connect, mimall, etc)
    // for the user via his identifier
    const payload: OAuth2.Providers.Gmail.IdToken.TModel = JSON.parse(
      Buffer.from(response.data.id_token.split('.')[1], 'base64').toString('utf8')
    );

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
      avatar: payload.picture,
      email: payload.email,
      identifier: payload.email,
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

          // Validate the user data from IDP
          const parseResult = Users.User.Schema.safeParse(user);
          if (!parseResult.success) {
            throw new HttpException(
              'Invalid user data received from Google Indentity Provider',
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
            response.data.id_token
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
      response.data.id_token
    );

    // If the user exists in the database ,
    // we need to create and sign the jwt token
    // const signature = await this.signAndCreateJWT(userData, token_expiration_in_minutes);
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

  async signInWithToken(model: OAuth2.Providers.Gmail.SignInWithToken.TModel) {
    // First: Get the information from the application
    // because we need to get if the "authorization" is external or internal
    // that information its in the "one record collection" (manifiest)
    const appInfo = await this.applicationsService.getBydId(model.client_id);

    if (!appInfo.external_token_validation?.google?.client_ids) {
      throw new Http.Exceptions.RequiredData(
        PROVIDER_IDENTIFIER,
        'external_token_validation.google.client_ids'
      );
    }

    try {
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({
        idToken: model.token,
        audience: appInfo.external_token_validation.google.client_ids,
      });
      ticket.getPayload();
    } catch (error) {
      Logger.error(error);
      throw new Http.Exceptions.InvalidSignature(PROVIDER_IDENTIFIER);
    }

    // Find in the db "app_id" (example: arcus, connect, mimall, etc)
    // for the user via his identifier
    const payload: OAuth2.Providers.Gmail.IdToken.TModel = JSON.parse(
      Buffer.from(model.token.split('.')[1], 'base64').toString('utf8')
    );

    // If the application info exists (if not the previous call throw an error)
    // get the user in the application database
    let user: Users.User.TModel | undefined = undefined;
    try {
      user = await this.usersService.getBydId(model.client_id, {
        identifier: payload.email,
        provider: PROVIDER_IDENTIFIER,
      });
    } catch (ex) {
      if (!(ex instanceof Http.Exceptions.UserNotFound)) {
        throw ex;
      }
    }

    switch (appInfo.mode) {
      case 'external':
        if (!user) {
          // We need to auto-create in the application,
          // because is external
          let userLocale: Users.User.Enums.TAvailableLocales = 'es';
          switch (payload.locale) {
            case 'en':
            case 'es':
            case 'pt':
              userLocale = payload.locale as Users.User.Enums.TAvailableLocales;
              break;
            default:
              userLocale = 'en';
              break;
          }

          // Insert the user in the db
          user = {
            avatar: payload.picture,
            email: payload.email,
            identifier: payload.email,
            provider: PROVIDER_IDENTIFIER,
            locale: userLocale,
            name: payload.name,
            roles: [],
            scopes: [],
            created_at: new Date().toISOString(),
          };
          await this.usersService.create(model.client_id, user);
        }
        break;
      case 'internal':
        // Throw an User not in application exception
        // because when the application is "external" the user
        // must be registered in the app

        if (!user) {
          throw new Http.Exceptions.UserNotFound(
            model.client_id,
            payload.email,
            PROVIDER_IDENTIFIER
          );
        }
        break;
    }

    // If the user exists in the database ,
    // we need to create and sign the jwt token
    // const signature = await this.signAndCreateJWT(userData, token_expiration_in_minutes);

    const jwtToken = this.usersService.createToken(model.client_id, user, {
      expirationInMinutes: appInfo.jwt_expiration_in_minutes,
    });

    return {
      access_token: jwtToken.accessToken,
      expires_in: jwtToken.expiresIn,
      token_type: jwtToken.type,
    };
  }
}

export default GoogleGmailService;
