import { Module } from '@nestjs/common';
import { Nest } from '@iam/core';
import { RedisModule } from '@team_seki/nestjs-redis-module';
import { HealthModule } from './health/health.module';
import { V1ApiModule } from './v1/module';

@Module({
  imports: [
    HealthModule,
    V1ApiModule,
    RedisModule.forRoot(),
    Nest.Modules.Mongo.MongoModule.forRoot({
      identifier: "admin"
    }),
  ],
})
export class ApiModule {}
