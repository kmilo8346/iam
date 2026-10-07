import { Injectable } from '@nestjs/common';
import { Applications } from '@iam/models';
import { Nest, Http } from '@iam/core';

const IAM_DATABASE_PREFIX = 'iam_';
const MANIFEST_COLLECTION_NAME = 'manifest';
const APIKEYS_COLLECTION_NAME = 'apikeys';
const USERS_COLLECTION_NAME = 'users';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly mongoService: Nest.Modules.Mongo.MongoService
  ) {}

  async existsById(client_id: string): Promise<boolean> {
    try {
      await this.getBydId(client_id);
      return true;
    } catch (ex) {
      if (ex instanceof Http.Exceptions.ApplicationNotFound) {
        return false;
      }
      throw ex;
    }
  }

  async getBydId(client_id: string): Promise<Applications.Manifiest.TModel> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const collection = db.collection<Applications.Manifiest.TModel>(MANIFEST_COLLECTION_NAME);

    const result = await collection.findOne();

    if (!result) {
      throw new Http.Exceptions.ApplicationNotFound(client_id);
    }

    return result;
  }

  async create(client_id: string, model: Applications.Manifiest.TModel): Promise<void> {
    const databases = await this.mongoService.useDb('admin').admin().listDatabases();
    const dbName = `${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`;
    const iamsDb = databases.databases.find((d) => d.name === dbName);
    if (iamsDb) {
      throw new Http.Exceptions.ApplicationAlreadyExists(client_id);
    }

    const db = this.mongoService.useDb(dbName);
    const manifest = db.collection(MANIFEST_COLLECTION_NAME);

    // Remove client_id from the model
    const newAppDef: Partial<Applications.Manifiest.TModel> = { ...model };
    delete newAppDef['client_id'];

    await manifest.insertOne(newAppDef);

    // Check if indexes exists!
    const exists = (await db.listCollections().toArray()).find(
      (t) => t.name === USERS_COLLECTION_NAME
    );
    if (!exists) {
      // User indexes
      const collection = await db.createCollection(USERS_COLLECTION_NAME);
      await Promise.all([
        collection.indexExists(`${USERS_COLLECTION_NAME}_index`).then(async (exists) => {
          if (!exists) {
            await collection.createIndex(
              {
                provider: 1,
                identifier: 1,
              },
              {
                name: `${USERS_COLLECTION_NAME}_index`,
                unique: true,
              }
            );
          }
        }),
        collection.indexExists(`${USERS_COLLECTION_NAME}_search_index`).then(async (exists) => {
          if (!exists) {
            await collection.createIndex(
              {
                name: 'text',
                email: 'text',
                scopes: 'text',
                roles: 'text',
              },
              {
                name: `${USERS_COLLECTION_NAME}_search_index`,
              }
            );
          }
        }),
      ]);

      // Application Collections
      await db.createCollection(APIKEYS_COLLECTION_NAME);
    }
  }

  async update(client_id: string, model: Applications.Manifiest.TUpdateModel): Promise<void> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const manifiest = db.collection<Applications.Manifiest.TModel>(MANIFEST_COLLECTION_NAME);

    const ack = await manifiest.updateOne(
      {},
      {
        $set: model,
      }
    );

    if (ack.matchedCount === 0) {
      throw new Http.Exceptions.ApplicationNotFound(client_id);
    }
  }

  async deleteById(client_id: string) {
    const dbName = `${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`;
    const db = this.mongoService.useDb(dbName);

    db.dropDatabase({
      dbName,
    });
  }
}

export default ApplicationsService;

export {
  IAM_DATABASE_PREFIX,
  USERS_COLLECTION_NAME,
  MANIFEST_COLLECTION_NAME,
  APIKEYS_COLLECTION_NAME,
};
