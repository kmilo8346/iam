import { z } from 'zod';

const oneYearInMinutes = 60 * 24 * 365;

const GetSchema = z.object({
  _id: z.string(),
});

const UpdateSchema = z.object({
  roles: z.array(z.string()),
  scopes: z.array(z.string()),
  description: z.string(),
  expiration_in_minutes: z.number().min(1).max(
    oneYearInMinutes * 2 // max allowed 2 years
    ).optional().default(oneYearInMinutes),
});

const CreateSchema = GetSchema.merge(UpdateSchema).extend({
  created_at: z.string().datetime().default(new Date().toISOString()),
});

const Schema = GetSchema.merge(UpdateSchema).merge(CreateSchema).extend({
  access_token: z.string(),
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
};
