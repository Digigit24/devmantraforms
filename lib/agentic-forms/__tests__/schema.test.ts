import { describe, expect, it } from 'vitest';
import {
  CreateFormInputSchema,
  FormSchemaDefinitionSchema,
  SubmitAnswerInputSchema,
  UpdateFormInputSchema,
} from '@/lib/agentic-forms/schema';
import { basicForm, conditionalForm } from './helpers';

describe('form schema: valid definitions', () => {
  it('accepts a valid form', () => {
    const parsed = FormSchemaDefinitionSchema.parse(basicForm);
    expect(parsed.title).toBe('Customer Intake');
    expect(parsed.fields).toHaveLength(5);
  });

  it('applies field defaults', () => {
    const parsed = FormSchemaDefinitionSchema.parse(basicForm);
    const tags = parsed.fields.find((field) => field.id === 'tags');
    expect(tags?.required).toBe(false);
    expect(tags?.validation).toEqual({});
  });

  it('applies policy defaults', () => {
    const parsed = FormSchemaDefinitionSchema.parse(basicForm);
    expect(parsed.policy.agent_can_ask_followups).toBe(false);
    expect(parsed.policy.requires_human_review).toBe(false);
    expect(parsed.policy.allowed_answer_modes).toEqual(['text']);
    expect(parsed.policy.prohibited_inferences).toContain('protected traits');
  });

  it('accepts a visibility condition', () => {
    const parsed = FormSchemaDefinitionSchema.parse(conditionalForm);
    expect(parsed.fields[1]?.visible_if).toEqual({ field_id: 'has_pet', operator: 'equals', value: 'yes' });
  });

  it('defaults owner_id on create input', () => {
    expect(CreateFormInputSchema.parse(basicForm).owner_id).toBe('local-owner');
  });

  it('accepts a partial update', () => {
    expect(UpdateFormInputSchema.parse({ title: 'Renamed' }).title).toBe('Renamed');
  });

  it('accepts a visible_if that targets an existing sibling field', () => {
    const result = FormSchemaDefinitionSchema.safeParse(conditionalForm);
    expect(result.success).toBe(true);
  });

  it('accepts single_select and multi_select fields with valid, distinct options', () => {
    const result = FormSchemaDefinitionSchema.safeParse(basicForm);
    expect(result.success).toBe(true);
    if (result.success) {
      const color = result.data.fields.find((field) => field.id === 'color');
      const tags = result.data.fields.find((field) => field.id === 'tags');
      expect(color?.options).toEqual([
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
      ]);
      expect(tags?.options).toEqual([
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]);
    }
  });

  it('still accepts the existing sample and fixture form definitions', () => {
    expect(FormSchemaDefinitionSchema.safeParse(basicForm).success).toBe(true);
    expect(FormSchemaDefinitionSchema.safeParse(conditionalForm).success).toBe(true);
  });
});

describe('form schema: invalid definitions', () => {
  it('rejects a missing title', () => {
    const result = FormSchemaDefinitionSchema.safeParse({ fields: basicForm.fields });
    expect(result.success).toBe(false);
  });

  it('rejects an empty title', () => {
    const result = FormSchemaDefinitionSchema.safeParse({ ...basicForm, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a form with no fields', () => {
    const result = FormSchemaDefinitionSchema.safeParse({ ...basicForm, fields: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field type', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'signature', label: 'Sign here' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a field id with unsupported characters', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'first name', type: 'short_text', label: 'Name' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a field without a label', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'short_text' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive length limit', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'short_text', label: 'Name', validation: { min_length: 0 } }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown visibility operator', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{
        id: 'q1',
        type: 'short_text',
        label: 'Name',
        visible_if: { field_id: 'q0', operator: 'greater_than', value: 1 },
      }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an update that empties the field list', () => {
    expect(UpdateFormInputSchema.safeParse({ fields: [] }).success).toBe(false);
  });

  it('rejects duplicate field ids within the same form', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [
        { id: 'q1', type: 'short_text', label: 'First question' },
        { id: 'q1', type: 'short_text', label: 'Second question, same id' },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('Duplicate field id'))).toBe(true);
    }
  });

  it('rejects a visible_if that targets a field id not present in the form', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [
        {
          id: 'q1',
          type: 'short_text',
          label: 'Name',
          visible_if: { field_id: 'does_not_exist', operator: 'equals', value: 'yes' },
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('does not match any field'))).toBe(true);
    }
  });

  it('rejects a single_select field with no options', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'single_select', label: 'Pick one' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a single_select field with an empty options array', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'single_select', label: 'Pick one', options: [] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a multi_select field with no options', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{ id: 'q1', type: 'multi_select', label: 'Pick some' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate option values within the same field', () => {
    const result = FormSchemaDefinitionSchema.safeParse({
      title: 'Bad',
      fields: [{
        id: 'q1',
        type: 'single_select',
        label: 'Pick one',
        options: [
          { label: 'Red', value: 'red' },
          { label: 'Also red', value: 'red' },
        ],
      }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('duplicate option value'))).toBe(true);
    }
  });
});

describe('answer input schema', () => {
  it('accepts text, number, boolean, list, and artifact values', () => {
    const values = [
      'hello',
      42,
      true,
      ['a', 'b'],
      { artifact_id: 'art_1', filename: 'cv.pdf', content_type: 'application/pdf', size_bytes: 1024 },
    ];
    for (const value of values) {
      expect(SubmitAnswerInputSchema.safeParse({ field_id: 'q1', value }).success).toBe(true);
    }
  });

  it('rejects a missing field id', () => {
    expect(SubmitAnswerInputSchema.safeParse({ value: 'hello' }).success).toBe(false);
  });

  it('rejects null and unsupported object values', () => {
    expect(SubmitAnswerInputSchema.safeParse({ field_id: 'q1', value: null }).success).toBe(false);
    expect(SubmitAnswerInputSchema.safeParse({ field_id: 'q1', value: { text: 'hello' } }).success).toBe(false);
  });
});
