import { HttpException } from "@nestjs/common";

export class UserAlreadyExists extends HttpException {
  constructor(application: string, identifier: string, provider: string) {
    super({
      error: {
        application,
        identifier,
        provider,
        code: 'USER_ALREADY_EXISTS',
        message: 'User already exist in database by provided keys' 
      }
    }, 400)
  }
}