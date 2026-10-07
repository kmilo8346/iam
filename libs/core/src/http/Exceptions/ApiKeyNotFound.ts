import { HttpException } from "@nestjs/common";

export class ApiKeyNotFound extends HttpException {
  constructor(client_id: string, id: string) {
    super({
      error: {
        client_id,
        id,
        code: 'APIKEY_NOT_FOUND',
        message: 'apikey dont exists for the application'
      },
    }, 404)
  }
}