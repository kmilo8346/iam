import { z } from 'zod';
import { Schema as SignInWithToken } from './../../SignInWithToken';

const Schema = SignInWithToken.extend({
  client_id: z.string(),
});

type TModel = z.infer<typeof Schema>;

export { TModel, Schema };
