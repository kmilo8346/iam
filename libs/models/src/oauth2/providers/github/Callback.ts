import { z } from 'zod';

const Schema = z.object({
  code: z.string(),
  state: z.string()
});

type TModel = z.infer<typeof Schema>

export {
  TModel,
  Schema
}