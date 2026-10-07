import { z } from 'zod';

const availableResponseTypes = ['token', 'code'] as const;
const availablePrompts = ['consent', 'login', 'none'] as const;

const Schema = z.object({
  redirect_uri: z.string(),
  response_type: z.enum(availableResponseTypes),
  prompt: z.enum(availablePrompts),
  state: z.string().optional(),
  scope: z.string().optional()
});

type TModel = z.infer<typeof Schema>

export {
  TModel,
  Schema
}