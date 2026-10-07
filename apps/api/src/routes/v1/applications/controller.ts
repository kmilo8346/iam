import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Applications } from '@iam/models';
import { Nest } from '@iam/core';
import { Roles } from '@team_seki/nestjs-jwt-module';
import { ApplicationsService } from './service';

const READ_ROLE_NAME = 'applications:read';
const WRITE_ROLE_NAME = 'applications:write';

@Controller('v1/applications')
@Roles(WRITE_ROLE_NAME)
export class ApplicationController {
  constructor(private readonly service: ApplicationsService) {}

  @Get('/:client_id')
  @Roles(READ_ROLE_NAME)
  async getById(@Param('client_id') client_id: string) {
    return this.service.getBydId(client_id);
  }

  @Post()
  async create(
    @Body(new Nest.Pipes.ZodValidation(Applications.Manifiest.Schema))
    model: Applications.Manifiest.TModel
  ) {
    return this.service.create(model.client_id, model);
  }

  @Put('/:client_id')
  async update(
    @Param('client_id') client_id: string,
    @Body(new Nest.Pipes.ZodValidation(Applications.Manifiest.UpdateSchema))
    model: Applications.Manifiest.TUpdateModel
  ) {
    return this.service.update(client_id, model);
  }

  @Delete('/:client_id')
  async deleteById(@Param('client_id') client_id: string) {
    return this.service.deleteById(client_id);
  }
}

export default ApplicationController;
