import { HttpException } from "@nestjs/common";

export class ApplicationNotFound extends HttpException {
  constructor(application: string, metadata?: Record<string, object | string | boolean | number>) {
    super({
      error: {
        application,
        code: 'APPLICATION_NOT_FOUND',
        message: 'the application id dont exists'
      },
      metadata: {
        ...metadata
      }
    }, 404)
  }
}