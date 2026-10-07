import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import Service from './service';
import Controller from './controller';
import { UsersModule } from '../../../applications/users';
import { ApplicationsModule } from '../../../applications';
import { IOptions } from './IOptions';

@Module({})
export class MicrosoftSamlModule {
  static forRoot(config?: IOptions): DynamicModule {
    return {
      imports: [HttpModule, UsersModule, ApplicationsModule],
      controllers: [Controller],
      module: MicrosoftSamlModule,
      providers: [
        {
          provide: 'CONFIG_OPTIONS',
          useValue: config,
        },
        Service,
      ],
      exports: [Service],
    };
  }
}
