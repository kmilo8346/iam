import { Injectable, Logger } from '@nestjs/common';
import { NativeDriverPlugin } from '@team_seki/mongodb-plugin';
import { IClientProps } from '@team_seki/mongodb-plugin/src/NativeDriverPlugin';
import { MongoClient } from 'mongodb';
import * as colors from 'ansi-colors';
import { IOptions } from './IOptions';

@Injectable()
export class MongoService {
  private readonly logger: Logger;
  private client: MongoClient;

  constructor(private readonly options: IOptions) {
    this.logger = new Logger('Mongo');
    const clientProps: IClientProps = {
      mongoClientOptions: {
        serverSelectionTimeoutMS: this.options.timeoutMS || 30000,
      },
    };

    this.client = new NativeDriverPlugin({
      identifier: options.identifier,
    }).getClient(clientProps);
  }

  protected async onModuleInit(): Promise<void> {
    // Here we need to test the connection before
    // give the pass to the application startup
    const startAt = process.hrtime();
    const stamp = () => {
      const diff = process.hrtime(startAt);
      const responseTime = diff[0] * 1e3 + diff[1] * 1e-6;
      return colors.yellow(`+${Math.round(responseTime)}ms`);
    };

    console.log('');
    this.logger.log('Testing connection...');
    try {
      await this.client.connect();

      if (this.options.onConnect) {
        try {
          await this.options.onConnect(this, this.client);
        } catch (ex) {
          console.error(ex);
          throw ex;
        }
      }
    } catch (ex) {
      this.logger.error(`Connection [FAILURE] ${stamp()}`);
      this.logger.error('Exiting application...');
      process.exit(1);
    }

    this.logger.log(`Connection [OK]... ${stamp()}`);
    console.log('');
  }

  protected getClient(): MongoClient {
    return this.client;
  }

  useDb(dbname: string) {
    return this.client.db(dbname);
  }
}
