import { z } from 'zod';
import { Schema as AuthorizeSchema } from './../../Authorize'

const Schema = AuthorizeSchema.extend({
  client_id: z.string(),
})

type TModel = z.infer<typeof Schema>

export {
  TModel,
  Schema
}