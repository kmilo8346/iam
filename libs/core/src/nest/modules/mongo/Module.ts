import { Module, DynamicModule, Global } from '@nestjs/common';
import { MongoService } from './Service'
import { IOptions } from './IOptions';

@Global()
@Module({
  providers: [],
})
export class MongoModule {
  static forRoot(config?: IOptions): DynamicModule {
    return {
      module: MongoModule,
      providers: [
        {
          provide: MongoService,
          useValue: new MongoService(config||{})
        },
      ],
      exports: [MongoService]
    };
  }
}