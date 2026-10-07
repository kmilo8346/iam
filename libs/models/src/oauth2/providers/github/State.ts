import { z } from 'zod';

const Schema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  callback_uri: z.string(),
  signature: z.string()
});

type TModel = z.infer<typeof Schema>

export {
  TModel,
  Schema
}