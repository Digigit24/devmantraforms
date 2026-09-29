import type {
  ArtifactRecord,
  FormRecord,
  FormVersionRecord,
  SessionRecord,
  SubmissionRecord,
  TenantRecord,
} from './types';

// The persistence contract runtime.ts and storage.ts depend on. Derived directly
// from the operations they currently perform against the in-memory store's Maps —
// nothing here is speculative. The in-memory implementation in store.ts is the
// only implementation today; a future SQLite-backed implementation would satisfy
// this same interface.
export interface AgenticFormsRepository {
  listTenants(): TenantRecord[];
  getTenantBySlug(slug: string): TenantRecord | undefined;

  listFormsByTenant(tenantId: string): FormRecord[];
  getForm(formId: string): FormRecord | undefined;
  saveForm(form: FormRecord): void;

  listVersionsByForm(formId: string): FormVersionRecord[];
  getVersion(versionId: string): FormVersionRecord | undefined;
  saveVersion(version: FormVersionRecord): void;

  getSession(sessionId: string): SessionRecord | undefined;
  saveSession(session: SessionRecord): void;

  getSubmission(submissionId: string): SubmissionRecord | undefined;
  findSubmissionBySession(sessionId: string): SubmissionRecord | undefined;
  saveSubmission(submission: SubmissionRecord): void;

  getArtifact(artifactId: string): ArtifactRecord | undefined;
  saveArtifact(artifact: ArtifactRecord): void;
}
