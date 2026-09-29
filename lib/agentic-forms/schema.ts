import { z } from 'zod';

export const FIELD_TYPES = [
  'short_text',
  'long_text',
  'email',
  'number',
  'single_select',
  'multi_select',
  'date',
  'rating',
  'file_upload',
  'video_response',
  'consent',
] as const;

export const FieldTypeSchema = z.enum(FIELD_TYPES);

export const ChoiceOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const VisibilityConditionSchema = z.object({
  field_id: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'includes']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const FormFieldSchema = z.object({
  id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  type: FieldTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(ChoiceOptionSchema).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    max_length: z.number().int().positive().optional(),
    min_length: z.number().int().positive().optional(),
    max_files: z.number().int().positive().optional(),
    max_file_mb: z.number().int().positive().optional(),
    max_duration_seconds: z.number().int().positive().optional(),
  }).default({}),
  visible_if: VisibilityConditionSchema.optional(),
});

export const FormPolicySchema = z.object({
  agent_can_ask_followups: z.boolean().default(false),
  requires_human_review: z.boolean().default(false),
  allowed_answer_modes: z.array(z.enum(['text', 'file', 'video'])).default(['text']),
  prohibited_inferences: z.array(z.string()).default([
    'facial appearance',
    'emotion',
    'accent',
    'protected traits',
    'non-job-related signals',
  ]),
});

export const FormSchemaDefinitionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema).min(1),
  policy: FormPolicySchema.default({}),
});

export const CreateFormInputSchema = FormSchemaDefinitionSchema.extend({
  owner_id: z.string().min(1).default('local-owner'),
});

export const UpdateFormInputSchema = FormSchemaDefinitionSchema.partial().extend({
  fields: z.array(FormFieldSchema).min(1).optional(),
});

export const AnswerValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.object({
    artifact_id: z.string().min(1),
    filename: z.string().min(1),
    content_type: z.string().min(1),
    size_bytes: z.number().int().nonnegative(),
    duration_seconds: z.number().int().positive().optional(),
  }),
]);

export const SubmitAnswerInputSchema = z.object({
  field_id: z.string().min(1),
  value: AnswerValueSchema,
  idempotency_key: z.string().min(1).optional(),
});

export const CreateArtifactUploadInputSchema = z.object({
  session_id: z.string().min(1),
  field_id: z.string().min(1),
  filename: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
  duration_seconds: z.number().int().positive().optional(),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;
export type VisibilityCondition = z.infer<typeof VisibilityConditionSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormPolicy = z.infer<typeof FormPolicySchema>;
export type FormSchemaDefinition = z.infer<typeof FormSchemaDefinitionSchema>;
export type CreateFormInput = z.infer<typeof CreateFormInputSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormInputSchema>;
export type AnswerValue = z.infer<typeof AnswerValueSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerInputSchema>;
export type CreateArtifactUploadInput = z.infer<typeof CreateArtifactUploadInputSchema>;
