import { Http, Nest } from '@iam/core';
import { Rest, Users } from '@iam/models';
import { Injectable } from '@nestjs/common';
import { ISignOptions, JwtService } from '@team_seki/nestjs-jwt-module';

import { Filter, MongoServerError } from 'mongodb';
import secrets from '../../../../config/secrets';
import { IAM_DATABASE_PREFIX, USERS_COLLECTION_NAME } from '../service';

@Injectable()
export class UsersService {
  constructor(
    private readonly mongoService: Nest.Modules.Mongo.MongoService,
    private readonly jwtService: JwtService
  ) {}

  async getAll(
    client_id: string,
    queryParams: Rest.IQueryParams
  ): Promise<Rest.ICollection<Users.User.TModel>> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<Users.User.TModel>(USERS_COLLECTION_NAME);

    const filter: Filter<Users.User.TModel> = queryParams.filters || {};
    if (queryParams.search) {
      filter['$or'] = [
        { name: { $regex: `\\b${queryParams.search}`, $options: 'i' } },
        { email: { $regex: `\\b${queryParams.search}`, $options: 'i' } },
      ];
    }

    const users = await usersCollection
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

  async existsById(client_id: string, model: Users.User.TGetModel): Promise<boolean> {
    try {
      await this.getBydId(client_id, model);
      return true;
    } catch (ex) {
      if (ex instanceof Http.Exceptions.UserNotFound) {
        return false;
      }
      throw ex;
    }
  }

  async getBydId(client_id: string, model: Users.User.TGetModel): Promise<Users.User.TModel> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<Users.User.TModel>(USERS_COLLECTION_NAME);

    const user = await usersCollection.findOne(model);

    if (!user) {
      throw new Http.Exceptions.UserNotFound(client_id, model.identifier, model.provider);
    }

    return user;
  }

  async create(client_id: string, model: Users.User.TModel): Promise<void> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<Users.User.TModel>(USERS_COLLECTION_NAME);

    try {
      await usersCollection.insertOne(model);
    } catch (error) {
      // Duplicate key error
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new Http.Exceptions.UserAlreadyExists(client_id, model.identifier, model.provider);
      } else {
        throw error;
      }
    }
  }

  async update(client_id: string, model: Users.User.TModel): Promise<void> {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<Users.User.TModel>(USERS_COLLECTION_NAME);

    const ack = await usersCollection.updateOne(
      {
        identifier: model.identifier,
        provider: model.provider,
      },
      {
        $set: model,
      }
    );

    if (ack.matchedCount === 0) {
      throw new Http.Exceptions.UserNotFound(client_id, model.identifier, model.provider);
    }
  }

  async deleteById(client_id: string, model: Users.User.TGetModel) {
    const db = this.mongoService.useDb(`${IAM_DATABASE_PREFIX}${client_id.toLocaleLowerCase()}`);
    const usersCollection = db.collection<Users.User.TModel>(USERS_COLLECTION_NAME);

    await usersCollection.deleteOne(model);
  }

  createToken(client_id: string, model: Users.User.TModel, options?: ISignOptions) {
    return this.jwtService.createToken(
      {
        primarysid: model.identifier,
        unique_name: model.name,
        email: model.email,
        avatar: model.avatar,
        groupsid: model.provider,
        iss: client_id,
        aud: 'Web',
        acr: secrets.PRODUCT_NAME,
        scopes: model.scopes,
        roles: model.roles,
      },
      options
    );
  }
}

export default UsersService;
