import { beforeEach, describe, expect, it } from 'vitest';
import { createTenantWithApiKey } from '@/lib/agentic-forms/auth';
import {
  completeSession,
  createForm,
  listForms,
  listSubmissions,
  publishForm,
  resolveAdminTenant,
  startSession,
  submitAnswer,
} from '@/lib/agentic-forms/runtime';
import { expectPublicError, resetStore } from './helpers';

const basicFormInput = {
  title: 'Admin Test Form',
  fields: [{ id: 'name', type: 'short_text', label: 'Name', required: true, validation: { min_length: 1 } }],
  policy: {},
};

beforeEach(() => {
  resetStore();
});

describe('resolveAdminTenant', () => {
  it('resolves the tenant matching an explicit slug', () => {
    createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    expect(resolveAdminTenant('acme').slug).toBe('acme');
  });

  it('falls back to the first tenant when no slug is given', () => {
    const tenant = resolveAdminTenant(undefined);
    expect(tenant.slug).toBe('demo'); // the seeded demo tenant, matching prior implicit behavior
  });

  it('throws NOT_FOUND for an unknown slug rather than silently falling back', () => {
    expectPublicError(() => resolveAdminTenant('does-not-exist'), 'NOT_FOUND', 404);
  });
});

describe('admin tenant isolation', () => {
  it('listForms for tenant A never includes tenant B forms', () => {
    const a = createTenantWithApiKey({ slug: 'tenant-a', name: 'Tenant A' });
    const b = createTenantWithApiKey({ slug: 'tenant-b', name: 'Tenant B' });
    createForm(basicFormInput, a.tenant.id);
    const formB = createForm(basicFormInput, b.tenant.id);

    const formsA = listForms(a.tenant.id);
    expect(formsA.some((form) => form.id === formB.id)).toBe(false);
    expect(listForms(resolveAdminTenant('tenant-a').id)).toHaveLength(1);
    expect(listForms(resolveAdminTenant('tenant-b').id)).toHaveLength(1);
  });

  it('listSubmissions for tenant A never includes tenant B submissions, even for a same-named form', () => {
    const a = createTenantWithApiKey({ slug: 'tenant-a', name: 'Tenant A' });
    const b = createTenantWithApiKey({ slug: 'tenant-b', name: 'Tenant B' });
    const formA = publishForm(createForm(basicFormInput, a.tenant.id).id, a.tenant.id);
    const formB = publishForm(createForm(basicFormInput, b.tenant.id).id, b.tenant.id);

    const sessionA = startSession(formA.id, undefined, a.tenant.id);
    submitAnswer(sessionA.session_id, { field_id: 'name', value: 'Aarav' }, 'human', a.tenant.id);
    completeSession(sessionA.session_id, a.tenant.id);

    const sessionB = startSession(formB.id, undefined, b.tenant.id);
    submitAnswer(sessionB.session_id, { field_id: 'name', value: 'Priya' }, 'human', b.tenant.id);
    completeSession(sessionB.session_id, b.tenant.id);

    expect(listSubmissions(formA.id, a.tenant.id)).toHaveLength(1);
    expect(listSubmissions(formB.id, b.tenant.id)).toHaveLength(1);
    // Cross-tenant form/tenant pairing must behave as NOT_FOUND, not an empty list that
    // could be confused with "no submissions yet".
    expectPublicError(() => listSubmissions(formB.id, a.tenant.id), 'NOT_FOUND', 404);
  });
});

describe('dashboard response counts', () => {
  it('computes the exact response count per form used by the dashboard', () => {
    const { tenant } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const formWithTwo = publishForm(createForm(basicFormInput, tenant.id).id, tenant.id);
    const formWithZero = publishForm(createForm(basicFormInput, tenant.id).id, tenant.id);

    for (const name of ['First', 'Second']) {
      const session = startSession(formWithTwo.id, undefined, tenant.id);
      submitAnswer(session.session_id, { field_id: 'name', value: name }, 'human', tenant.id);
      completeSession(session.session_id, tenant.id);
    }

    const forms = listForms(tenant.id);
    const counts = forms.map((form) => ({ id: form.id, count: listSubmissions(form.id, tenant.id).length }));

    expect(counts.find((c) => c.id === formWithTwo.id)?.count).toBe(2);
    expect(counts.find((c) => c.id === formWithZero.id)?.count).toBe(0);
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(2);
  });
});
