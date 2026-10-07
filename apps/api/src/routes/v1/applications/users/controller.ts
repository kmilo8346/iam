import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { UsersService } from './service';
import { Users, Rest } from '@iam/models';
import { Nest } from '@iam/core';
import { Roles } from '@team_seki/nestjs-jwt-module';

const READ_ROLE_NAME = 'users:read';
const WRITE_ROLE_NAME = 'users:write';

@Controller('v1/applications/:client_id/users')
@Roles(WRITE_ROLE_NAME)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(READ_ROLE_NAME)
  async getAll(
    @Param('client_id') client_id: string,
    @Query(new Nest.Pipes.QueryParams()) queryParams: Rest.IQueryParams
  ) {
    return this.service.getAll(client_id, queryParams);
  }

  @Get('/:provider/:identifier')
  @Roles(READ_ROLE_NAME)
  async getById(
    @Param('client_id') client_id: string,
    @Param('provider') provider: string,
    @Param('identifier') identifier: string
  ) {
    return this.service.getBydId(client_id, {
      identifier,
      provider,
    });
  }

  @Post()
  async create(
    @Param('client_id') client_id: string,
    @Body(new Nest.Pipes.ZodValidation(Users.User.Schema)) model: Users.User.TModel
  ) {
    return this.service.create(client_id, model);
  }

  @Put('/:provider/:identifier')
  @HttpCode(204)
  async update(
    @Param('client_id') client_id: string,
    @Param('provider') provider: string,
    @Param('identifier') identifier: string,
    @Body(new Nest.Pipes.ZodValidation(Users.User.UpdateSchema))
    model: Users.User.TUpdateModel
  ) {
    return this.service.update(client_id, {
      provider,
      identifier,
      ...model,
    });
  }

  @Delete('/:provider/:identifier')
  @HttpCode(204)
  async deleteById(
    @Param('client_id') client_id: string,
    @Param('provider') provider: string,
    @Param('identifier') identifier: string
  ) {
    return this.service.deleteById(client_id, {
      provider,
      identifier,
    });
  }
}

export default UsersController;
