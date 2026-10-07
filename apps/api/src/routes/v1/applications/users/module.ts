import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import UsersService from './service';
import Controller from './controller';

@Module({
  imports: [HttpModule],
  controllers: [Controller],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
