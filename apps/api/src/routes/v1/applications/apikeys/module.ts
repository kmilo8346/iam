import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import ApiKeysService from './service';
import Controller from './controller';

@Module({
  imports: [HttpModule],
  controllers: [Controller],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
