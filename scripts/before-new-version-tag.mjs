#!/usr/bin/env node
/**
 * Release gate: run this BEFORE creating a new version tag.
 *
 * `package.json` carries the version the next tag will publish. Three prose
 * files restate that version by hand, and each release adds a changelog entry
 * that `CHANGELOG.md` must link. Nothing in the repo enforces any of it, so the
 * failure mode is a tag that ships a spec whose own header disagrees with it —
 * and because cutdownspec.org materialises every tag into its own archived
 * tree, a wrong header is frozen at a public URL forever.
 *
 * Zero dependencies on purpose: this repo has no node_modules and no build.
 *
 *   node scripts/before-new-version-tag.mjs
 *
 * Exits 0 when the tree is ready to tag, 1 with a list of what to fix.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(ROOT, rel), 'utf-8');

const failures = [];
const fail = (what, detail) => failures.push({ what, detail });
const pass = what => console.log(`  ok   ${what}`);
const check = (ok, what, detail) => (ok ? pass(what) : fail(what, detail));

const VERSION = JSON.parse(read('package.json')).version;
if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error(`package.json version "${VERSION}" is not X.Y.Z — nothing else can be checked.`);
  process.exit(1);
}
console.log(`\nabout to tag v${VERSION}\n`);

// ---------------------------------------------------------------------------
// 1. The prose sites that restate the version.
//
// This list is EXPLICIT rather than discovered by grepping for version-shaped
// strings. A grep can only find versions that are present: if someone deletes
// the `**Version:**` line from README.md, a grep-based check goes quiet and
// passes. A declared list turns that same edit into a failure, which is the
// whole point of the gate.
//
// Each pattern must match exactly once, and capture group 1 is the version.
// ---------------------------------------------------------------------------
const PROSE = [
  ['README.md',   /^\*\*Version:\*\* (\d+\.\d+\.\d+)/m,  'the `**Version:**` line under "Spec status"'],
  ['spec/TOC.md', /^- \*\*Version:\*\* (\d+\.\d+\.\d+)/m, 'the `- **Version:**` line in the spec front matter'],
];

console.log('prose version statements');
for (const [file, pattern, where] of PROSE) {
  const text = read(file);
  const hits = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))];
  if (hits.length === 0) {
    fail(`${file} states a version`, `${where} is missing or no longer matches ${pattern}`);
  } else if (hits.length > 1) {
    fail(`${file} states the version once`, `${where} matched ${hits.length} times; the gate cannot tell which one is authoritative`);
  } else {
    check(hits[0][1] === VERSION, `${file} says ${VERSION}`,
      `${where} says ${hits[0][1]}, package.json says ${VERSION}`);
  }
}

// ---------------------------------------------------------------------------
// 2. The changelog entry for this release.
// ---------------------------------------------------------------------------
console.log('\nchangelog');
const entry = `changelogs/${VERSION}.md`;
if (!existsSync(join(ROOT, entry))) {
  fail(`${entry} exists`, `write the release notes for ${VERSION} before tagging it`);
} else {
  pass(`${entry} exists`);
  const first = read(entry).split('\n')[0].trim();
  // Every published entry opens with exactly `# X.Y.Z`. A suffix — the usual
  // one being "— Unreleased" carried over from drafting — means the file was
  // never finished, and it is about to become the permanent notes for a tag.
  check(first === `# ${VERSION}`, `${entry} opens with "# ${VERSION}"`,
    `its first line is "${first}". A trailing "— Unreleased" or similar must be removed before the tag exists.`);

  const changelog = read('CHANGELOG.md');
  // The index links entries as `- 0.9.0  [`changelogs/0.9.0.md`](changelogs/0.9.0.md)`.
  // Assert the LINK, not just the version string: an entry file nobody links to
  // is unreachable from the repo root and from the published site.
  check(changelog.includes(`(${entry})`), `CHANGELOG.md links ${entry}`,
    `add a line for ${VERSION} to CHANGELOG.md pointing at ${entry}`);
  check(new RegExp(`^- ${VERSION.replace(/\./g, '\\.')}\\s`, 'm').test(changelog),
    `CHANGELOG.md lists ${VERSION} in its index`,
    `the index line must start "- ${VERSION}" so the ordering stays machine-readable`);
}

// ---------------------------------------------------------------------------
// 3. The tag itself.
//
// This is the check the other four exist to protect. If v<VERSION> is already
// in the repo, package.json was not bumped after the last release, and every
// assertion above passed by describing a release that already shipped.
// ---------------------------------------------------------------------------
console.log('\ntag');
let tags = [];
try {
  tags = execFileSync('git', ['tag', '--list'], { cwd: ROOT, encoding: 'utf-8' }).split('\n');
} catch {
  fail('git tags readable', 'could not run `git tag --list`; the gate cannot tell whether this version already shipped');
}
check(!tags.includes(`v${VERSION}`), `v${VERSION} is not tagged yet`,
  `v${VERSION} already exists. Bump the version in package.json (and the prose sites above) before tagging again.`);

// ---------------------------------------------------------------------------
console.log('');
if (failures.length === 0) {
  console.log(`ready to tag v${VERSION}\n`);
  process.exit(0);
}
for (const { what, detail } of failures) console.error(`  FAIL ${what}\n       ${detail}`);
console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'} — do not tag v${VERSION} yet.\n`);
process.exit(1);
