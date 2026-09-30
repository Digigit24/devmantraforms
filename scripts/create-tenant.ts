// Creates a CeliyoForms tenant plus an MCP API key, or — if a tenant with that slug
// already exists — issues a new key for it without touching the tenant row. Run this on
// the host where CELIYO_DATABASE_PATH points at the real database file; it refuses to run
// against the throwaway in-memory store, since a key created there would vanish
// immediately.
//
// The plaintext API key is printed to the console exactly once. It is never persisted —
// only its SHA-256 hash is stored — and cannot be recovered later; if it's lost, run this
// script again to issue a fresh key for the same tenant.
//
// Usage:
//   CELIYO_DATABASE_PATH=/path/to/celiyoforms.sqlite \
//     npm run celiyo:tenant:create -- --slug my-clinic --name "My Clinic"
//
// This is also how the seeded demo tenant (which is created without any key) gets its
// first real API key:
//   CELIYO_DATABASE_PATH=/path/to/celiyoforms.sqlite \
//     npm run celiyo:tenant:create -- --slug demo --name "Demo Workspace"

import { createTenantWithApiKey } from '../lib/agentic-forms/auth';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const name = args.name;

  if (!slug || !name) {
    fail('Usage: npm run celiyo:tenant:create -- --slug <slug> --name "<Name>"');
  }

  if (!process.env.CELIYO_DATABASE_PATH) {
    fail(
      'CELIYO_DATABASE_PATH is not set.\n' +
      'This script refuses to provision a tenant against the throwaway in-memory store —\n' +
      'set CELIYO_DATABASE_PATH to the target SQLite database file first, e.g.:\n' +
      '  CELIYO_DATABASE_PATH=/srv/apps/celiyoforms/data/celiyoforms.sqlite \\\n' +
      '    npm run celiyo:tenant:create -- --slug my-clinic --name "My Clinic"',
    );
  }

  const { tenant, apiKey } = createTenantWithApiKey({ slug: slug!, name: name! });

  console.log('');
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Slug: ${tenant.slug}`);
  console.log('');
  console.log('MCP API key:');
  console.log(apiKey);
  console.log('');
  console.log('Save this now. It cannot be retrieved again.');
  console.log('');
}

main();
