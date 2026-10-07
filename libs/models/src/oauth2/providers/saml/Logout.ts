import { z } from 'zod';

const Schema = z.object({
  redirect_uri: z.string(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
