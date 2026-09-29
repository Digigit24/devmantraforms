import type {
  ArtifactRecord,
  FormRecord,
  FormVersionRecord,
  SessionRecord,
  SubmissionRecord,
  TenantApiKeyRecord,
  TenantRecord,
} from './types';

// The persistence contract runtime.ts, storage.ts, and auth.ts depend on. Derived directly
// from the operations they currently perform — nothing here is speculative. The in-memory
// implementation in store.ts and the SQLite implementation in sqlite-repository.ts both
// satisfy this same interface.
export interface AgenticFormsRepository {
  listTenants(): TenantRecord[];
  getTenantBySlug(slug: string): TenantRecord | undefined;
  getTenantById(tenantId: string): TenantRecord | undefined;
  saveTenant(tenant: TenantRecord): void;

  listFormsByTenant(tenantId: string): FormRecord[];
  getForm(formId: string): FormRecord | undefined;
  // Tenant-scoped equivalents of the plain getters below: enforce ownership at the query
  // level (WHERE id = ? AND tenant_id = ?) rather than fetching then comparing. Return
  // undefined both when the record doesn't exist and when it belongs to a different
  // tenant — callers must not be able to distinguish the two, to avoid leaking whether a
  // resource exists in another tenant.
  getFormForTenant(formId: string, tenantId: string): FormRecord | undefined;
  saveForm(form: FormRecord): void;

  listVersionsByForm(formId: string): FormVersionRecord[];
  getVersion(versionId: string): FormVersionRecord | undefined;
  saveVersion(version: FormVersionRecord): void;

  getSession(sessionId: string): SessionRecord | undefined;
  getSessionForTenant(sessionId: string, tenantId: string): SessionRecord | undefined;
  saveSession(session: SessionRecord): void;

  getSubmission(submissionId: string): SubmissionRecord | undefined;
  getSubmissionForTenant(submissionId: string, tenantId: string): SubmissionRecord | undefined;
  findSubmissionBySession(sessionId: string): SubmissionRecord | undefined;
  listSubmissionsByForm(formId: string, tenantId: string): SubmissionRecord[];
  saveSubmission(submission: SubmissionRecord): void;

  getArtifact(artifactId: string): ArtifactRecord | undefined;
  getArtifactForTenant(artifactId: string, tenantId: string): ArtifactRecord | undefined;
  saveArtifact(artifact: ArtifactRecord): void;

  // Tenant API keys. Only a hash is ever looked up or stored — see TenantApiKeyRecord.
  saveApiKey(apiKey: TenantApiKeyRecord): void;
  findActiveApiKeyByHash(keyHash: string): TenantApiKeyRecord | undefined;
  listApiKeysByTenant(tenantId: string): TenantApiKeyRecord[];
  revokeApiKey(apiKeyId: string): void;
  touchApiKeyLastUsed(apiKeyId: string, timestamp: string): void;
}
