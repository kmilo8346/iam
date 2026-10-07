import { z } from 'zod';
import * as Enums from './Enums';

const GetSchema = z.object({
  client_id: z.string(),
});

const UpdateSchema = z.object({
  display_name: z.string(),
  description: z.string(),
  mode: z.enum(Enums.availableModes).default('internal'),
  jwt_expiration_in_minutes: z.number().int().default(60),
  external_token_validation: z
    .object({
      google: z
        .object({
          client_ids: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
});

const Schema = GetSchema.merge(UpdateSchema);
const CreateSchema = Schema.extend({
  created_at: z.string().datetime().default(new Date().toISOString()),
});

type TGetModel = z.infer<typeof GetSchema>;
type TModel = z.infer<typeof Schema>;
type TUpdateModel = z.infer<typeof UpdateSchema>;
type TCreateModel = z.infer<typeof CreateSchema>;

export {
  Schema,
  TModel,
  GetSchema,
  TGetModel,
  UpdateSchema,
  TUpdateModel,
  CreateSchema,
  TCreateModel,
  Enums,
};
