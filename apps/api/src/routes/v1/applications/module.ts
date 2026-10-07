import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { UsersModule } from './users';
import { ApiKeysModule } from './apikeys';

import ApplicationsService from './service';
import Controller from './controller';

@Module({
  imports: [HttpModule, UsersModule, ApiKeysModule],
  controllers: [Controller],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
