import { z } from 'zod';
import * as Enums from './Enums';

const GetSchema = z.object({
  identifier: z.string().toLowerCase(),
  provider: z.string(),
});

const UpdateSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(),
  email: z.string().toLowerCase(),
  locale: z.enum(Enums.availableLocales),
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  created_at: z.string().datetime().default(new Date().toISOString()),
});

const Schema = GetSchema.merge(UpdateSchema);

type TGetModel = z.infer<typeof GetSchema>;
type TModel = z.infer<typeof Schema>;
type TUpdateModel = z.infer<typeof UpdateSchema>;

export { TModel, Schema, TGetModel, GetSchema, UpdateSchema, TUpdateModel, Enums };
