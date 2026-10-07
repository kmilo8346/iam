import { HttpException } from "@nestjs/common";

export class RequiredData extends HttpException {
  constructor(provider: string, missedValue: string) {
    super({
      error: {
        provider,
        missed: missedValue,
        code: 'REQUIRED_DATA_IS_MISSING',
        message: 'The required data to process the request is missing'
      }
    }, 400)
  }
}