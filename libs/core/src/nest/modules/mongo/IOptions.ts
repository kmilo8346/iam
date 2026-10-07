import { MongoService } from './Service';
import { MongoClient } from 'mongodb';

export interface IOptions {
  timeoutMS?: number;
  identifier?: string;
  authentication?: {
    username: string;
    password: string;
  };
  onConnect?: (client: MongoService, nativeClient: MongoClient) => Promise<void>;
}
