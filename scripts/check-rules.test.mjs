/**
 * Phase 9 regression tests — static rules linter
 *
 * These tests are written in plain ESM JS (the .test.mjs suffix) so
 * the vitest config can pick them up via its scripts-test glob without
 * needing a TS build to run them. They shell out to the linter and
 * assert against its exit code and a few representative output lines.
 *
 * What this gives us:
 *   1. If anyone deletes or breaks `scripts/check-rules.mjs`, the test
 *      fails — the linter is part of the contract.
 *   2. If `firestore.rules` regresses (e.g. the offer-expiry check is
 *      accidentally removed), the linter exits non-zero and the test
 *      fails with the same diagnostic.
 *   3. The "broken file" negative test confirms the linter actually
 *      catches a regression rather than always saying OK.
 *
 * We do NOT mock the linter — the whole point is to exercise the real
 * script against the real rules file.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const linter = join(repoRoot, 'scripts', 'check-rules.mjs');
const rulesFile = join(repoRoot, 'firestore.rules');

function runLinter(targetFile) {
  return spawnSync(process.execPath, [linter, targetFile], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

describe('check-rules.mjs — Phase 9 invariants', () => {
  it('script exists at the expected path', () => {
    expect(existsSync(linter)).toBe(true);
  });

  it('real firestore.rules passes 13/13', () => {
    if (!existsSync(rulesFile)) {
      throw new Error(`firestore.rules not found at ${rulesFile}`);
    }
    const res = runLinter(rulesFile);
    if (res.status !== 0) {
      throw new Error(
        `linter exited ${res.status}\n--- stdout ---\n${res.stdout}\n--- stderr ---\n${res.stderr}`,
      );
    }
    expect(res.stdout).toMatch(/13\/13 checks passed/);
    for (let i = 1; i <= 13; i++) {
      const id = `R${String(i).padStart(3, '0')}`;
      expect(res.stdout).toContain(`OK    ${id}`);
    }
  });

  it('a deliberately broken rules file fails the linter', () => {
    // Strip the two most-recently-added Phase 9 invariants: offer-expiry
    // (R009) and the affected-keys allowlist (R010). The linter should
    // flag exactly those.
    const real = readFileSync(rulesFile, 'utf8');
    const broken = real
      .replace(/&& request\.resource\.data\.offerExpiresAt is number\n\s*&& request\.time < request\.resource\.data\.offerExpiresAt\n/, '')
      .replace(/hasOnly\(\[\s*'status',\s*'mechanicId',\s*'mechanicName',\s*'etaMin',\s*'updatedAt'\s*\]\)/, 'hasOnly([])');

    expect(broken).not.toBe(real);

    const dir = mkdtempSync(join(tmpdir(), 'mechist-rules-'));
    const tmpFile = join(dir, 'broken.rules');
    try {
      writeFileSync(tmpFile, broken, 'utf8');
      const res = runLinter(tmpFile);
      expect(res.status).not.toBe(0);
      expect(res.stdout).toMatch(/FAIL  R009/);
      expect(res.stdout).toMatch(/FAIL  R010/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a missing rules file exits with code 2', () => {
    const res = runLinter(join(tmpdir(), 'definitely-not-a-real-file-' + Date.now() + '.rules'));
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/rules file not found/);
  });
});
