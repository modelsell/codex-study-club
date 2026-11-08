import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "content/editorial/site.json"), "utf8"));
const content = JSON.parse(fs.readFileSync(path.join(root, "lib/generated-content.json"), "utf8"));
const documents = new Map([
  ...content.cases.map((item) => [`/cases/${item.slug}`, item]),
  ...content.updates.map((item) => [`/community/updates/${item.slug}`, item]),
  ...content.startArticles.map((item) => [`/start/${item.slug}`, item]),
]);
function unique(items, key) { assert.equal(new Set(items.map((item) => item[key])).size, items.length, `Duplicate ${key}`); }
unique(data.articles, "href"); unique(data.paths, "id"); unique(data.toolkits, "id");
for (const item of data.articles) {
  assert.ok(documents.has(item.href), `Unknown reading: ${item.href}`);
  assert.ok(["源码研究", "SDK 实验", "CLI 实验", "工具实践", "方法指南"].includes(item.kind), `Unknown reading kind: ${item.kind}`);
  assert.ok(item.scope && item.outcome && item.description, `Incomplete reading: ${item.href}`);
}
for (const item of data.paths) {
  assert.ok(/^[a-z-]+$/.test(item.id), `Invalid path id: ${item.id}`);
  for (const href of item.links) assert.ok(documents.has(href), `Unknown path reference: ${href}`);
}
for (const pack of data.toolkits) {
  assert.ok(["任务模板", "只读工具", "复现实验"].includes(pack.category), `Unknown toolkit category: ${pack.category}`);
  const source = documents.get(pack.source);
  assert.ok(source, `Unknown toolkit source: ${pack.source}`);
  assert.ok(pack.environment && pack.files.length, `Incomplete toolkit: ${pack.id}`);
  for (const file of pack.files) {
    assert.ok(file.href.startsWith("/templates/") && !file.href.includes(".."), `Invalid artifact path: ${file.href}`);
    assert.ok(fs.statSync(path.join(root, "public", file.href)).isFile(), `Missing artifact: ${file.href}`);
    assert.ok(source.markdown.includes(file.href), `Artifact absent from source guide: ${file.href}`);
  }
}
assert.ok(documents.has(data.feature.href));
console.log(`Editorial index valid: ${data.articles.length} readings, ${data.paths.length} paths, ${data.toolkits.length} toolkits.`);
