import { z } from 'zod';

const Schema = z.object({
  token: z.string(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
