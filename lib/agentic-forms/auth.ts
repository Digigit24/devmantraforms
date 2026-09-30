import { createHash, randomBytes } from 'crypto';
import { publicError } from './errors';
import { createId, getRepository, now } from './store';
import type { TenantApiKeyRecord, TenantRecord } from './types';

// "cfmcp_" makes a CeliyoForms MCP key recognizable at a glance in logs, config files, and
// UI — the same convention as e.g. GitHub's "ghp_" or Stripe's "sk_".
const KEY_PREFIX = 'cfmcp_';
// 256 bits of randomness. Generated API keys are not human-chosen, so there is no
// dictionary/rainbow-table risk the way there is for passwords — the entropy alone is the
// only thing standing between an attacker and the key, and 256 bits is far beyond any
// practical brute-force budget.
const SECRET_BYTES = 32;
const HINT_LENGTH = 4;

export interface GeneratedApiKey {
  /** The full plaintext key. Exists only here — never persisted, never logged. */
  plaintext: string;
  prefix: string;
  hint: string;
  hash: string;
}

/**
 * Hashes a plaintext API key with SHA-256.
 *
 * SHA-256 (not bcrypt/scrypt/argon2) is the right tool here specifically because these are
 * *generated, high-entropy random secrets*, not human-chosen passwords:
 * - A password's weakness is that humans pick from a comparatively tiny, guessable space
 *   (dictionary words, patterns, reuse) — a slow, salted KDF exists to make offline
 *   dictionary/rainbow-table attacks impractical despite that low entropy.
 * - A 256-bit random API key has no dictionary to attack: the search space is
 *   2^256, astronomically larger than any offline attack (with or without a fast hash)
 *   could ever traverse. Slowing the hash down would only cost legitimate lookups
 *   latency without meaningfully raising the cost of an already-infeasible attack.
 * - SHA-256 is deterministic and fast, letting a single indexed `WHERE key_hash = ?`
 *   query authenticate a request cheaply — appropriate since MCP calls should be able to
 *   authenticate quickly, and a KDF's deliberate slowness has no security benefit here.
 */
export function hashApiKey(plaintextKey: string): string {
  return createHash('sha256').update(plaintextKey, 'utf8').digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(SECRET_BYTES).toString('base64url');
  const plaintext = `${KEY_PREFIX}${secret}`;
  return {
    plaintext,
    prefix: KEY_PREFIX,
    hint: plaintext.slice(-HINT_LENGTH),
    hash: hashApiKey(plaintext),
  };
}

export interface CreateTenantWithApiKeyInput {
  slug: string;
  name: string;
  plan?: TenantRecord['plan'];
}

export interface CreateTenantWithApiKeyResult {
  tenant: TenantRecord;
  /** Plaintext key — only ever returned here, at creation time. Never persisted again. */
  apiKey: string;
}

/** Creates a new tenant plus its first MCP API key, or — if a tenant with that slug already
 * exists — issues a new key for it without touching the existing tenant row. Either way,
 * the plaintext key is generated fresh and returned exactly once; only its hash is stored. */
export function createTenantWithApiKey(input: CreateTenantWithApiKeyInput): CreateTenantWithApiKeyResult {
  const repo = getRepository();
  const timestamp = now();

  let tenant = repo.getTenantBySlug(input.slug);
  if (!tenant) {
    tenant = {
      id: createId('tenant'),
      slug: input.slug,
      name: input.name,
      plan: input.plan ?? 'local',
      mcp_endpoint: `/api/mcp/${input.slug}`,
      api_key_hint: '',
      created_at: timestamp,
    };
    repo.saveTenant(tenant);
  }

  const generated = generateApiKey();
  const apiKeyRecord: TenantApiKeyRecord = {
    id: createId('key'),
    tenant_id: tenant.id,
    key_prefix: generated.prefix,
    key_hint: generated.hint,
    key_hash: generated.hash,
    created_at: timestamp,
  };
  repo.saveApiKey(apiKeyRecord);

  return { tenant, apiKey: generated.plaintext };
}

export interface AuthenticatedTenant {
  tenant: TenantRecord;
  apiKey: TenantApiKeyRecord;
}

/**
 * Authenticates an MCP request from its `Authorization` header. Every failure — missing
 * header, wrong scheme, malformed key, unknown key, revoked key — returns the same public
 * error shape (401) so a caller cannot distinguish "no such key" from "key exists but is
 * revoked", which would otherwise leak information about which keys are real.
 */
export function authenticateApiKey(authorizationHeader: string | null): AuthenticatedTenant {
  const unauthorized = () => publicError('FORBIDDEN', 'Missing or invalid Authorization header. Expected: Bearer <api-key>.', 401);

  if (!authorizationHeader) throw unauthorized();

  const match = /^Bearer\s+(\S+)$/.exec(authorizationHeader.trim());
  if (!match) throw unauthorized();

  const plaintextKey = match[1];
  if (!plaintextKey || !plaintextKey.startsWith(KEY_PREFIX)) throw unauthorized();

  const repo = getRepository();
  const apiKey = repo.findActiveApiKeyByHash(hashApiKey(plaintextKey));
  if (!apiKey) throw unauthorized();

  const tenant = repo.getTenantById(apiKey.tenant_id);
  if (!tenant) throw unauthorized();

  repo.touchApiKeyLastUsed(apiKey.id, now());
  return { tenant, apiKey };
}

/** Safe-to-display key metadata only — never the plaintext key or its hash. */
export function listApiKeysForTenant(tenantId: string): TenantApiKeyRecord[] {
  return getRepository().listApiKeysByTenant(tenantId);
}
