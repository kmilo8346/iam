import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import OAuth2Service from './service';
import OAuth2Controller from './controller';
import { ProvidersModule } from './providers';

@Module({
  imports: [
    ProvidersModule,
    HttpModule,
  ],
  controllers: [OAuth2Controller],
  providers: [OAuth2Service],
})
export class OAuth2Module {}
