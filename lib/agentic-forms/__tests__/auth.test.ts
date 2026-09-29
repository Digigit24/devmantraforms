import { beforeEach, describe, expect, it } from 'vitest';
import { authenticateApiKey, createTenantWithApiKey, hashApiKey } from '@/lib/agentic-forms/auth';
import { getRepository } from '@/lib/agentic-forms/store';
import { resetStore } from './helpers';

beforeEach(() => {
  resetStore();
});

describe('createTenantWithApiKey', () => {
  it('creates a new tenant and returns a plaintext key once', () => {
    const { tenant, apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });

    expect(tenant.slug).toBe('acme');
    expect(tenant.name).toBe('Acme Inc');
    expect(apiKey).toMatch(/^cfmcp_/);
    expect(apiKey.length).toBeGreaterThan(20);
  });

  it('reuses an existing tenant by slug instead of duplicating it, issuing a new key', () => {
    const first = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const second = createTenantWithApiKey({ slug: 'acme', name: 'Ignored On Reuse' });

    expect(second.tenant.id).toBe(first.tenant.id);
    expect(second.tenant.name).toBe('Acme Inc'); // unchanged, not overwritten
    expect(second.apiKey).not.toBe(first.apiKey);

    const repo = getRepository();
    expect(repo.listApiKeysByTenant(first.tenant.id)).toHaveLength(2);
  });

  it('never persists the plaintext key anywhere in the stored record', () => {
    const { tenant, apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const repo = getRepository();
    const stored = repo.findActiveApiKeyByHash(hashApiKey(apiKey));

    expect(stored).toBeDefined();
    expect(stored?.key_hash).not.toBe(apiKey);
    expect(JSON.stringify(stored)).not.toContain(apiKey);
    expect(stored?.tenant_id).toBe(tenant.id);
    expect(stored?.key_hint).toBe(apiKey.slice(-4));
  });
});

describe('authenticateApiKey', () => {
  it('authenticates a valid key and resolves the correct tenant', () => {
    const { tenant, apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const result = authenticateApiKey(`Bearer ${apiKey}`);

    expect(result.tenant.id).toBe(tenant.id);
    expect(result.apiKey.tenant_id).toBe(tenant.id);
  });

  it('rejects a missing Authorization header', () => {
    expect(() => authenticateApiKey(null)).toThrowError();
    try {
      authenticateApiKey(null);
    } catch (error) {
      expect((error as { code?: string }).code).toBe('FORBIDDEN');
      expect((error as { status?: number }).status).toBe(401);
    }
  });

  it('rejects a malformed Authorization header (wrong scheme)', () => {
    createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    expect(() => authenticateApiKey('Basic dXNlcjpwYXNz')).toThrowError();
  });

  it('rejects a Bearer header with no token', () => {
    expect(() => authenticateApiKey('Bearer ')).toThrowError();
    expect(() => authenticateApiKey('Bearer')).toThrowError();
  });

  it('rejects an unknown/invalid key', () => {
    expect(() => authenticateApiKey('Bearer cfmcp_not-a-real-key')).toThrowError();
  });

  it('rejects a key that does not start with the expected prefix', () => {
    expect(() => authenticateApiKey('Bearer some-other-format-key')).toThrowError();
  });

  it('rejects a revoked key', () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const repo = getRepository();
    const stored = repo.findActiveApiKeyByHash(hashApiKey(apiKey));
    expect(stored).toBeDefined();

    repo.revokeApiKey(stored!.id);

    expect(() => authenticateApiKey(`Bearer ${apiKey}`)).toThrowError();
    expect(repo.findActiveApiKeyByHash(hashApiKey(apiKey))).toBeUndefined();
  });

  it('records last_used_at on successful authentication', () => {
    const { apiKey } = createTenantWithApiKey({ slug: 'acme', name: 'Acme Inc' });
    const repo = getRepository();
    const beforeAuth = repo.findActiveApiKeyByHash(hashApiKey(apiKey));
    expect(beforeAuth?.last_used_at).toBeUndefined();

    authenticateApiKey(`Bearer ${apiKey}`);

    const afterAuth = repo.findActiveApiKeyByHash(hashApiKey(apiKey));
    expect(afterAuth?.last_used_at).toBeDefined();
  });
});
