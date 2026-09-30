import { expect } from 'vitest';
import { AgenticFormError } from '@/lib/agentic-forms/errors';
import { createForm, publishForm } from '@/lib/agentic-forms/runtime';
import type { NextStepResponse, PublicErrorCode } from '@/lib/agentic-forms/types';

export function resetStore() {
  globalThis.__agenticFormsStore = undefined;
}

export const basicForm = {
  title: 'Customer Intake',
  description: 'Test form',
  fields: [
    {
      id: 'name',
      type: 'short_text',
      label: 'What is your name?',
      required: true,
      validation: { min_length: 2, max_length: 50 },
    },
    { id: 'email', type: 'email', label: 'What is your email?', required: true },
    {
      id: 'color',
      type: 'single_select',
      label: 'Pick a color',
      required: true,
      options: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
      ],
    },
    {
      id: 'tags',
      type: 'multi_select',
      label: 'Pick tags',
      options: [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ],
    },
    { id: 'age', type: 'number', label: 'How old are you?' },
  ],
};

export const conditionalForm = {
  title: 'Pet Survey',
  fields: [
    {
      id: 'has_pet',
      type: 'single_select',
      label: 'Do you have a pet?',
      required: true,
      options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ],
    },
    {
      id: 'pet_name',
      type: 'short_text',
      label: 'What is your pet called?',
      required: true,
      visible_if: { field_id: 'has_pet', operator: 'equals', value: 'yes' },
    },
  ],
};

export function createPublishedForm(definition: unknown) {
  const draft = createForm(definition);
  return publishForm(draft.id);
}

export function stepId(next: NextStepResponse) {
  return 'id' in next.step ? next.step.id : null;
}

export function expectPublicError(action: () => unknown, code: PublicErrorCode, status?: number) {
  let caught: unknown;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AgenticFormError);
  const error = caught as AgenticFormError;
  expect(error.code).toBe(code);
  if (status !== undefined) expect(error.status).toBe(status);
  return error;
}
