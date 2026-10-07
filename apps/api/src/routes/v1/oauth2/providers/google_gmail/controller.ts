import { Nest } from '@iam/core';
import { OAuth2 } from '@iam/models';
import { Body, Controller, Get, Post, Query, Redirect, Req } from '@nestjs/common';
import { Authenticated, Public } from '@team_seki/nestjs-jwt-module';
import { Request } from 'express';

import OAuth2Service from '../../service';
import { GoogleGmailService } from './service';

const Gmail = OAuth2.Providers.Gmail;

@Controller('v1/oauth2/providers/google/gmail')
@Public()
export class GoogleGmailController {
  constructor(private readonly service: GoogleGmailService) {}

  @Get('dialog')
  @Redirect(undefined, 302)
  async dialog(
    @Req() req: Request,
    @Query(new Nest.Pipes.ZodValidation(Gmail.Authorize.Schema))
    model: OAuth2.Providers.Gmail.Authorize.TModel
  ) {
    // The original Uri become from this Api (the entry point "Authorize")
    const uri = OAuth2Service.getOriginalRequestUrl(req);

    return {
      url: this.service.getDialogUrl(uri, model),
    };
  }

  @Get('callback')
  @Redirect(undefined, 302)
  async callback(
    @Query(new Nest.Pipes.ZodValidation(Gmail.Callback.Schema))
    model: OAuth2.Providers.Gmail.Callback.TModel
  ) {
    return {
      url: await this.service.authenticateAndGetCallbackUrl(model),
    };
  }

  @Post('sign_in_with_token')
  @Authenticated()
  async exchange(
    @Body(new Nest.Pipes.ZodValidation(Gmail.SignInWithToken.Schema))
    model: OAuth2.Providers.Gmail.SignInWithToken.TModel
  ) {
    return this.service.signInWithToken(model);
  }
}

export default GoogleGmailController;
