import { z } from 'zod';

const Schema = z.object({
  SAMLResponse: z.string(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
