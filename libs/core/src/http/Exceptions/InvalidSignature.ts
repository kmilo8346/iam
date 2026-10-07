import { HttpException } from "@nestjs/common";

export class InvalidSignature extends HttpException {
  constructor(provider: string) {
    super({
      error: {
        provider,
        code: 'INVALID_SIGNATURE',
        message: 'the signature don`t match'
      },
    }, 400)
  }
}