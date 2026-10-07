import { Injectable } from '@nestjs/common';
import { ApiKeys, Applications, Rest } from '@iam/models';
import secrets from '../../../../config/secrets';
import { randomUUID } from 'crypto';
import { Nest, Http } from '@iam/core';
import { Filter } from 'mongodb';

import { APIKEYS_COLLECTION_NAME, IAM_DATABASE_PREFIX, MANIFEST_COLLECTION_NAME } from '../service';
import { ISignOptions, JwtService } from '@team_seki/nestjs-jwt-module';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly mongoService: Nest.Modules.Mongo.MongoService,
    private readonly jwtService: JwtService
  ) {}

  async getAll(
    client_id: string,
    queryParams: Rest.IQueryParams
  ): Promise<Rest.ICollection<ApiKeys.ApiKey.TModel>> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const apikeysCollection = db.collection<ApiKeys.ApiKey.TModel>(APIKEYS_COLLECTION_NAME);

    const filter: Filter<ApiKeys.ApiKey.TModel> = queryParams.filters || {};
    if (queryParams.search) {
      /*
      filter['$or'] = [
        { name: { $regex: `\\b${queryParams.search}`, $options: 'i' } },
        { email: { $regex: `\\b${queryParams.search}`, $options: 'i' } },
      ];
      */
    }

    const users = await apikeysCollection
      .find(filter)
      .skip(queryParams.offset)
      .limit(queryParams.limit)
      .toArray();

    return {
      items: users,
      limit: 0,
      offset: 0,
      total: users.length,
    };
  }

  async create(client_id: string, model: ApiKeys.ApiKey.TUpdateModel): Promise<void> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const collection = db.collection<ApiKeys.ApiKey.TModel>(APIKEYS_COLLECTION_NAME);

    // Get Application info
    const application = await db
      .collection<Applications.Manifiest.TModel>(MANIFEST_COLLECTION_NAME)
      .findOne();
    if (!application) {
      throw new Http.Exceptions.ApplicationNotFound(client_id);
    }

    application.client_id = client_id;
    const newApiKey: ApiKeys.ApiKey.TModel = {
      _id: randomUUID(),
      created_at: new Date().toISOString(),
      ...model,
      access_token: this.createToken(application, model, {
        expirationInMinutes: model.expiration_in_minutes,
      }).accessToken,
    };
    await collection.insertOne(newApiKey);
  }

  async update(client_id: string, id: string, model: ApiKeys.ApiKey.TUpdateModel): Promise<void> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const collection = db.collection<ApiKeys.ApiKey.TModel>(APIKEYS_COLLECTION_NAME);

    const ack = await collection.updateOne(
      {
        _id: id,
      },
      {
        $set: model,
      }
    );

    if (ack.matchedCount === 0) {
      throw new Http.Exceptions.ApiKeyNotFound(client_id, id);
    }
  }

  async deleteById(client_id: string, id: string) {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<ApiKeys.ApiKey.TModel>(APIKEYS_COLLECTION_NAME);

    await usersCollection.deleteOne({ _id: id });
  }

  createToken(
    application: Applications.Manifiest.TModel,
    model: ApiKeys.ApiKey.TUpdateModel,
    options?: ISignOptions
  ) {
    return this.jwtService.createToken(
      {
        primarysid: application.client_id,
        unique_name: application.display_name,
        groupsid: 'APPLICATION',
        iss: application.client_id,
        aud: 'Server',
        acr: secrets.PRODUCT_NAME,
        roles: model.roles,
        scopes: model.scopes,
      },
      options
    );
  }
}

export default ApiKeyService;
