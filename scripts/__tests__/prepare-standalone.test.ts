import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findServerFiles, findStandaloneServerDir, packageStandaloneApp } from '../prepare-standalone.mjs';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'celiyo-standalone-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function writeFile(relativePath: string, contents = '') {
  const fullPath = join(tempDir, relativePath);
  mkdirSync(join(fullPath, '..'), { recursive: true });
  writeFileSync(fullPath, contents);
  return fullPath;
}

describe('findServerFiles', () => {
  it('returns an empty array when the root does not exist', () => {
    expect(findServerFiles(join(tempDir, 'does-not-exist'))).toEqual([]);
  });

  it('finds a top-level server.js', () => {
    const serverPath = writeFile('standalone/server.js');
    expect(findServerFiles(join(tempDir, 'standalone'))).toEqual([serverPath]);
  });

  it('finds a deeply nested server.js', () => {
    const serverPath = writeFile('standalone/celiyoforms/devmantraforms/server.js');
    expect(findServerFiles(join(tempDir, 'standalone'))).toEqual([serverPath]);
  });

  it('ignores server.js files inside node_modules', () => {
    writeFile('standalone/node_modules/some-pkg/server.js');
    const realServer = writeFile('standalone/app/server.js');
    expect(findServerFiles(join(tempDir, 'standalone'))).toEqual([realServer]);
  });

  it('ignores node_modules nested arbitrarily deep', () => {
    writeFile('standalone/app/node_modules/next/dist/server.js');
    const realServer = writeFile('standalone/app/server.js');
    expect(findServerFiles(join(tempDir, 'standalone'))).toEqual([realServer]);
  });

  it('finds multiple server.js files when more than one exists outside node_modules', () => {
    const first = writeFile('standalone/app-a/server.js');
    const second = writeFile('standalone/app-b/server.js');
    expect(findServerFiles(join(tempDir, 'standalone')).sort()).toEqual([first, second].sort());
  });
});

describe('findStandaloneServerDir', () => {
  it('throws a clear error when the standalone root does not exist', () => {
    expect(() => findStandaloneServerDir(join(tempDir, 'missing'))).toThrow(/Standalone output directory not found/);
  });

  it('throws a clear error when no server.js is found', () => {
    mkdirSync(join(tempDir, 'standalone'));
    expect(() => findStandaloneServerDir(join(tempDir, 'standalone'))).toThrow(/Could not find a standalone server\.js/);
  });

  it('resolves the app directory for an unnested standalone build', () => {
    writeFile('standalone/server.js');
    expect(findStandaloneServerDir(join(tempDir, 'standalone'))).toBe(join(tempDir, 'standalone'));
  });

  it('resolves the app directory for a nested standalone build', () => {
    writeFile('standalone/celiyoforms/devmantraforms/server.js');
    expect(findStandaloneServerDir(join(tempDir, 'standalone'))).toBe(
      join(tempDir, 'standalone', 'celiyoforms', 'devmantraforms'),
    );
  });

  it('ignores node_modules copies when resolving the single real app directory', () => {
    writeFile('standalone/node_modules/some-pkg/server.js');
    const realDir = join(tempDir, 'standalone', 'app');
    writeFile('standalone/app/server.js');
    expect(findStandaloneServerDir(join(tempDir, 'standalone'))).toBe(realDir);
  });

  it('throws and lists every candidate when more than one server.js is found', () => {
    writeFile('standalone/app-a/server.js');
    writeFile('standalone/app-b/server.js');
    expect(() => findStandaloneServerDir(join(tempDir, 'standalone'))).toThrow(/Found 2 candidate standalone server\.js files/);
  });
});

describe('packageStandaloneApp', () => {
  it('copies public/ and .next/static into the standalone app directory', () => {
    writeFile('public/favicon.ico', 'icon-bytes');
    writeFile('public/images/logo.png', 'logo-bytes');
    writeFile('.next/static/chunks/main.js', 'chunk-bytes');
    const standaloneAppDir = join(tempDir, 'standalone', 'app');
    mkdirSync(standaloneAppDir, { recursive: true });

    const { publicDest, staticDest } = packageStandaloneApp(tempDir, standaloneAppDir);

    expect(readFileSync(join(publicDest, 'favicon.ico'), 'utf-8')).toBe('icon-bytes');
    expect(readFileSync(join(publicDest, 'images', 'logo.png'), 'utf-8')).toBe('logo-bytes');
    expect(readFileSync(join(staticDest, 'chunks', 'main.js'), 'utf-8')).toBe('chunk-bytes');
  });

  it('overwrites a stale previous copy on re-packaging', () => {
    writeFile('public/favicon.ico', 'new-icon');
    writeFile('.next/static/chunks/main.js', 'new-chunk');
    const standaloneAppDir = join(tempDir, 'standalone', 'app');
    writeFile('standalone/app/public/favicon.ico', 'stale-icon');
    writeFile('standalone/app/.next/static/chunks/main.js', 'stale-chunk');

    const { publicDest, staticDest } = packageStandaloneApp(tempDir, standaloneAppDir);

    expect(readFileSync(join(publicDest, 'favicon.ico'), 'utf-8')).toBe('new-icon');
    expect(readFileSync(join(staticDest, 'chunks', 'main.js'), 'utf-8')).toBe('new-chunk');
  });

  it('throws a clear error when .next/static is missing', () => {
    const standaloneAppDir = join(tempDir, 'standalone', 'app');
    mkdirSync(standaloneAppDir, { recursive: true });
    expect(() => packageStandaloneApp(tempDir, standaloneAppDir)).toThrow(/Expected client static assets/);
  });

  it('warns but does not throw when public/ is missing', () => {
    writeFile('.next/static/chunks/main.js', 'chunk-bytes');
    const standaloneAppDir = join(tempDir, 'standalone', 'app');
    mkdirSync(standaloneAppDir, { recursive: true });

    const { publicDest } = packageStandaloneApp(tempDir, standaloneAppDir);
    expect(existsSync(publicDest)).toBe(false);
  });
});
