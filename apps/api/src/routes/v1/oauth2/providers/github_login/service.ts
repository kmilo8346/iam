import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as md5 from 'md5';
import { OAuth2, Users } from '@iam/models';
import { HttpService } from '@nestjs/axios';

import secrets from '../../../../../config/secrets';
import { Http } from '@iam/core';
import UsersService from '../../../applications/users/service';
import ApplicationService from '../../../applications/service';
import PublisherClient from './../../../../../clients/PublisherClient';

const PROVIDER_IDENTIFIER = 'github_login';
const PROVIDER_DIALOG_URL = 'https://github.com/login/oauth/authorize';
const PROVIDER_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const PROVIDER_USER_URL = 'https://api.github.com/user';

@Injectable()
export class GithubLoginService {
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
      `?client_id=${secrets.PROVIDER_GITHUB_LOGIN_CLIENT_ID}`,
      `&redirect_uri=${callbackUri}`,
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
    const responseToken = await this.httpService.axiosRef.post(
      PROVIDER_TOKEN_URL,
      {
        client_id: secrets.PROVIDER_GITHUB_LOGIN_CLIENT_ID,
        client_secret: secrets.PROVIDER_GITHUB_LOGIN_CLIENT_SECRET,
        code: model.code,
        redirect_uri: state.callback_uri,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    // Check if access token is in response
    if (!responseToken?.data?.access_token) {
      throw new Http.Exceptions.RequiredData(PROVIDER_IDENTIFIER, 'access_token');
    }

    // GET USER INFORMATION USING THE ACCESS TOKEN
    const responseUser = await this.httpService.axiosRef.get(PROVIDER_USER_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${responseToken.data.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // Find in the db "app_id" (example: arcus, connect, mimall, etc)
    // for the user via his identifier
    const payload: OAuth2.Providers.Github.User.TModel = responseUser.data;

    // First: Get the information from the application
    // because we need to get if the "authorization" is external or internal
    // that information its in the "one record collection" (manifiest)
    const appInfo = await this.applicationsService.getBydId(state.client_id);

    // If the application info exists (if not the previous call throw an error)
    // get the user in the application database
    let user: Users.User.TModel | undefined = undefined;
    try {
      user = await this.usersService.getBydId(state.client_id, {
        identifier: payload.login,
        provider: PROVIDER_IDENTIFIER,
      });
    } catch (ex) {
      if (!(ex instanceof Http.Exceptions.UserNotFound)) {
        throw ex;
      }
    }

    // Create a "possible Schema" for the user
    const possibleNewUser: Users.User.TModel = {
      avatar: payload.avatar_url,
      email: payload.email,
      identifier: payload.login,
      provider: PROVIDER_IDENTIFIER,
      locale: 'es',
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
              'Invalid user data received from Github Indentity Provider',
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
            responseToken.data.access_token
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
      responseToken.data.access_token
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
}

export default GithubLoginService;
