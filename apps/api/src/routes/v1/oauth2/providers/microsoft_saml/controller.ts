import { Nest } from '@iam/core';
import { OAuth2 } from '@iam/models';
import { Controller, Get, Param, Post, Query, Redirect, Req } from '@nestjs/common';
import { Public } from '@team_seki/nestjs-jwt-module';
import { Request } from 'express';
import { MicrosoftSamlService } from './service';
import OAuth2Service from '../../service';

@Controller('v1/oauth2/providers/microsoft/saml')
@Public()
export class MicrosoftSAMLController {
  constructor(private readonly service: MicrosoftSamlService) {}

  @Get('dialog')
  @Redirect(undefined, 302)
  async dialog(
    @Req() req: Request,
    @Query(new Nest.Pipes.ZodValidation(OAuth2.Providers.SAML.Authorize.Schema))
    model: OAuth2.Providers.SAML.Authorize.TModel
  ) {
    // The original Uri become from this Api (the entry point "Authorize")
    const uri = OAuth2Service.getOriginalRequestUrl(req);

    return {
      url: await this.service.getDialogUrl(uri, model),
    };
  }

  @Post('callback')
  @Redirect(undefined, 302)
  async callback(
    @Req() req: Request
  ) {
    // The original Uri become from this Api
    const uri = OAuth2Service.getOriginalRequestUrl(req);

    return {
      url: await this.service.authenticateAndGetCallbackUrl(uri, req),
    };
  }

  @Get('logout/:id')
  @Redirect(undefined, 302)
  async logout(
    @Req() req: Request,
    @Param('id') id: string,
    @Query(new Nest.Pipes.ZodValidation(OAuth2.Providers.SAML.Logout.Schema))
    model: OAuth2.Providers.SAML.Logout.TModel
  ) {
    // The original Uri become from this Api
    const uri = OAuth2Service.getOriginalRequestUrl(req);

    return {
      url: await this.service.logout(uri, id, model),
    };
  }

  @Get('logout_callback')
  @Redirect(undefined, 302)
  async logoutCallback(@Req() req: Request) {

    // The original Uri become from this Api
    const uri = OAuth2Service.getOriginalRequestUrl(req);

    return {
      url: await this.service.logoutCallback(uri, req),
    };
  }
}

export default MicrosoftSAMLController;
