import { HttpException } from "@nestjs/common";

export class UserNotFound extends HttpException {
  constructor(client_id: string, identifier: string, provider: string) {
    super({
      error: {
        client_id,
        identifier,
        provider,
        code: 'USER_NOT_FOUND',
        message: 'user dont exists in the application'
      },
    }, 404)
  }
}