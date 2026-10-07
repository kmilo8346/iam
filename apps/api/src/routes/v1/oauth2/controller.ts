import { Nest } from '@iam/core';
import { OAuth2 } from '@iam/models';
import { Controller, Get, Headers, Param, Query, Redirect } from '@nestjs/common';
import { Public } from '@team_seki/nestjs-jwt-module';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OAuth2Service } from './service';

@Controller('v1/oauth2')
@Public()
export class Oauth2Controller {
  private readonly templates: {
    oauth2_callback: string;
  };

  constructor(private readonly service: OAuth2Service) {
    this.templates = {
      oauth2_callback: readFileSync(join(__dirname, 'assets', 'oauth2_callback.hbs')).toString(),
    };
  }

  @Get('/:client_id/authorize/:provider')
  @Redirect(undefined, 302)
  async authorize(
    @Headers() headers: Record<string, string>,
    @Param('client_id') client_id: string,
    @Param('provider') provider: string,
    @Query(new Nest.Pipes.ZodValidation(OAuth2.Authorize.Schema))
    query: OAuth2.Authorize.TModel
  ) {
    const providerFragment = this.service.getProviderIdFragment(provider);
    const xForwardedPrefix = headers['x-forwarded-prefix'] || '';
    const url = [
      xForwardedPrefix, // Legacy variable (from sso legacy)
      '/v1/oauth2/providers/', // Authentication Method
      providerFragment, // Specific provider fragment
      '/dialog?', // Dialog endpoint to redirect
      Object.keys(query) // Send the same parameters from the original request
        .map((q: string) => {
          return `${q}=${query[q as keyof OAuth2.Authorize.TModel]}`;
        })
        // Because most of the Oauth2 redirect restriction dont support
        // dynamic url redirection , we need to pass the App Id as a Query
        .concat(`client_id=${client_id}`)
        .join('&'),
    ].join('');

    return {
      url,
    };
  }

  @Get('callback')
  async callback() {
    return this.templates.oauth2_callback;
  }
}

export default Oauth2Controller;
