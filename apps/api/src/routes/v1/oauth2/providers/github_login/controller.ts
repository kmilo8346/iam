import { Nest } from '@iam/core';
import { OAuth2 } from '@iam/models';
import { Controller, Get, Query, Redirect, Req } from '@nestjs/common';
import { Public } from '@team_seki/nestjs-jwt-module';
import { Request } from 'express';

import OAuth2Service from '../../service';
import { GithubLoginService } from './service';

const Github = OAuth2.Providers.Github;

@Controller('v1/oauth2/providers/github/login')
@Public()
export class GithubLoginController {
  constructor(private readonly service: GithubLoginService) {}

  @Get('dialog')
  @Redirect(undefined, 302)
  async dialog(
    @Req() req: Request,
    @Query(new Nest.Pipes.ZodValidation(Github.Authorize.Schema))
    model: OAuth2.Providers.Github.Authorize.TModel
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
    @Query(new Nest.Pipes.ZodValidation(Github.Callback.Schema))
    model: OAuth2.Providers.Github.Callback.TModel
  ) {
    return {
      url: await this.service.authenticateAndGetCallbackUrl(model),
    };
  }
}

export default GithubLoginController;
