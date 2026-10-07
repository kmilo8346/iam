import { z } from 'zod';

const Schema = z.object({
  iss: z.string(),
  hd: z.string(),
  email: z.string(),
  name: z.string(),
  picture: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  locale: z.string(),
  iat: z.number(),
  exp: z.number(),
});

type TModel = z.infer<typeof Schema>

export {
  TModel,
  Schema
}