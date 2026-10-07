import { HttpException } from "@nestjs/common";

export class UserNotInApplication extends HttpException {
  constructor(application: string, provider: string, identifier: string) {
    super({
      error: {
        application,
        provider,
        identifier,
        code: 'USER_NOT_REGISTERED_IN_APP',
        message: 'When application mode is internal, the user must be registered in the application'
      }
    }, 404)
  }
}