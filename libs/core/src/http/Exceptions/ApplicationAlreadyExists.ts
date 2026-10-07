import { HttpException } from "@nestjs/common";

export class ApplicationAlreadyExists extends HttpException {
  constructor(application: string, metadata?: Record<string, object | string | boolean | number>) {
    super({
      error: {
        application,
        code: 'APPLICATION_ALREADY_EXISTS',
        message: 'the application already exists'
      },
      metadata: {
        ...metadata
      }
    }, 400)
  }
}