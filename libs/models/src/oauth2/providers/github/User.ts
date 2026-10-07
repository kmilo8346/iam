import { z } from 'zod';

const Schema = z.object({
  login: z.string(),
  avatar_url: z.string(),
  email: z.string(),
  name: z.string(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
