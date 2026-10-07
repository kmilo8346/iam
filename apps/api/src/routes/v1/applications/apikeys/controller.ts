import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiKeyService } from './service';
import { Nest } from '@iam/core';
import { ApiKeys, Rest } from '@iam/models';
import { Roles } from '@team_seki/nestjs-jwt-module';

const READ_ROLE_NAME = 'apikeys:read';
const WRITE_ROLE_NAME = 'apikeys:write';

@Controller('v1/applications/:client_id/apikeys')
@Roles(WRITE_ROLE_NAME)
export class ApiKeysController {
  constructor(private readonly service: ApiKeyService) {}

  @Get()
  @Roles(READ_ROLE_NAME)
  async getById(
    @Param('client_id') client_id: string,
    @Query(new Nest.Pipes.QueryParams()) queryParams: Rest.IQueryParams
  ) {
    return this.service.getAll(client_id, queryParams);
  }

  @Post()
  async create(
    @Param('client_id') client_id: string,
    @Body(new Nest.Pipes.ZodValidation(ApiKeys.ApiKey.UpdateSchema))
    model: ApiKeys.ApiKey.TUpdateModel
  ) {
    return this.service.create(client_id, model);
  }

  @Put('/:id')
  @HttpCode(204)
  async update(
    @Param('client_id') client_id: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new Nest.Pipes.ZodValidation(ApiKeys.ApiKey.UpdateSchema))
    model: ApiKeys.ApiKey.TUpdateModel
  ) {
    return this.service.update(client_id, id, model);
  }

  @Delete('/:id')
  @HttpCode(204)
  async deleteById(@Param('client_id') client_id: string, @Param('id') id: string) {
    return this.service.deleteById(client_id, id);
  }
}

export default ApiKeysController;
