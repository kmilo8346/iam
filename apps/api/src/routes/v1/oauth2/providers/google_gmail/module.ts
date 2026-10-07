import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import Service from './service';
import Controller from './controller';
import { UsersModule } from '../../../applications/users';
import { ApplicationsModule } from '../../../applications';

@Module({
  imports: [HttpModule, UsersModule, ApplicationsModule],
  controllers: [Controller],
  providers: [Service],
})
export class GoogleGmailModule {}
