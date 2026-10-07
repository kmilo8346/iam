import { Module } from '@nestjs/common';
import { join } from 'path';

import { OAuth2Module } from './oauth2/module';
import { ApplicationsModule } from './applications';
import { JwtModule } from '@team_seki/nestjs-jwt-module';

const privateKeyName = `private_key.pem`;
const publicKeyName = `public_key.pub`;
const configPath = join(__dirname, 'config');

@Module({
  imports: [
    JwtModule.forRoot({
      allowedIssuer: 'admin',
      privateKeyPath: join(configPath, privateKeyName),
      publicKeyPath: join(configPath, publicKeyName),
      expiration_in_minutes: 60,
      algorithm: 'RS512',
    }),
    ApplicationsModule,
    OAuth2Module,
  ],
  exports: [],
})
export class V1ApiModule {}
