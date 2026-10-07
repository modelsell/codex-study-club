import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-content-check-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, "scripts"));
  fs.mkdirSync(path.join(directory, "lib"));
  fs.mkdirSync(path.join(directory, "content/cases/development"), { recursive: true });
  fs.copyFileSync(path.join(root, "scripts/generate-content-data.mjs"), path.join(directory, "scripts/generate-content-data.mjs"));
  fs.symlinkSync(path.join(root, "node_modules"), path.join(directory, "node_modules"), "junction");
  const source = path.join(directory, "content/cases/development/example.md");
  const snapshot = path.join(directory, "lib/generated-content.json");
  fs.writeFileSync(source, '---\ntitle: "Fixture"\n---\n\n# Fixture\n\nOriginal body.\n');
  const run = (...args) => spawnSync(process.execPath, [path.join(directory, "scripts/generate-content-data.mjs"), ...args], { cwd: os.tmpdir(), encoding: "utf8" });
  assert.equal(run().status, 0);
  return { source, snapshot, run };
}

test("fresh snapshot passes without changing bytes or modification time", (t) => {
  const { snapshot, run } = fixture(t);
  const before = fs.readFileSync(snapshot);
  const modified = fs.statSync(snapshot).mtimeMs;
  const result = run("--check");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(snapshot), before);
  assert.equal(fs.statSync(snapshot).mtimeMs, modified);
});

test("changed source fails without overwriting the snapshot; regeneration repairs it", (t) => {
  const { source, snapshot, run } = fixture(t);
  const before = fs.readFileSync(snapshot);
  fs.appendFileSync(source, "\nNew evidence.\n");
  const result = run("--check");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing or stale/);
  assert.deepEqual(fs.readFileSync(snapshot), before);
  assert.equal(run().status, 0);
  assert.equal(run("--check").status, 0);
  assert.match(fs.readFileSync(snapshot, "utf8"), /New evidence/);
});

test("missing snapshot fails without recreating the file", (t) => {
  const { snapshot, run } = fixture(t);
  fs.unlinkSync(snapshot);
  assert.equal(run("--check").status, 1);
  assert.equal(fs.existsSync(snapshot), false);
});

test("invalid frontmatter fails without replacing the previous snapshot", (t) => {
  const { source, snapshot, run } = fixture(t);
  const before = fs.readFileSync(snapshot);
  fs.writeFileSync(source, "---\ntitle: [unclosed\n---\n# Invalid\n");
  assert.notEqual(run("--check").status, 0);
  assert.deepEqual(fs.readFileSync(snapshot), before);
});
