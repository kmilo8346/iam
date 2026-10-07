import { Module } from '@nestjs/common';
import { GoogleGmailModule } from './google_gmail';
import { MicrosoftSamlModule } from './microsoft_saml';
import { GithubLoginModule } from './github_login';
import { join } from 'path';

const privateKeyName = `provider_microsoft_private_key.pem`;
const samlDefintionName = `provider_microsoft_saml.xml`;
const certificateName = `provider_microsoft_certificate.cer`;
const configPath = join(__dirname, 'config');

@Module({
  imports: [
    GoogleGmailModule,
    MicrosoftSamlModule.forRoot({
      paths: {
        certificate: join(configPath, certificateName),
        privateKey: join(configPath, privateKeyName),
        samlDefintion: join(configPath, samlDefintionName),
      },
    }),
    GithubLoginModule,
  ],
})
export class ProvidersModule {}
