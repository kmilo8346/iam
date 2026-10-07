import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from './routes/routes.module';
import secrets from './config/secrets';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule, { cors: true });
  const port = secrets.API_SERVER_PORT;

  await app.listen(port);

  Logger.log(`${secrets.PRODUCT_NAME}: 🚀 Api is running on: http://localhost:${port}    `);
}

bootstrap();
