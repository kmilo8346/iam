import { HttpException } from "@nestjs/common";

export class NotFound extends HttpException {
  constructor(message: string, metadata: Record<string, object | string | boolean | number>) {
    super({
      error: {
        message: message,
        code: 'NOT_FOUND',
      },
      metadata: {
        ...metadata
      }
    }, 404)
  }
}