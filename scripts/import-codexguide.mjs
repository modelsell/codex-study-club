import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = process.argv[2] || "/tmp/codexguide-source-20260720";
const sourceDir = path.join(sourceRoot, "docs", "recipes");
const startSourceDir = path.join(sourceRoot, "docs", "start");
const contentDir = path.resolve("content", "cases");
const startContentDir = path.resolve("content", "start");
const assetDir = path.resolve("public", "imported", "codexguide");
const manifestPath = path.resolve("scripts", "codexguide-import-manifest.json");

const categoryByNumber = {
  "01": "getting-started",
  "02": "development",
  "03": "development",
  "04": "content-design",
  "05": "knowledge",
  "06": "knowledge",
  "07": "knowledge",
  "08": "content-design",
  "09": "knowledge",
  "10": "development",
  "11": "development",
  "12": "development",
  "13": "development",
  "14": "knowledge",
  "15": "tools-devices",
  "16": "tools-devices",
  "17": "tools-devices",
};

await mkdir(contentDir, { recursive: true });
await mkdir(startContentDir, { recursive: true });
await mkdir(assetDir, { recursive: true });

const files = (await readdir(sourceDir))
  .filter((name) => /^(0[1-9]|1[0-7])-.+\.md$/.test(name))
  .sort();
const startFiles = (await readdir(startSourceDir))
  .filter((name) => /^(0[1-9]|1[0-4])-.+\.md$/.test(name))
  .sort();

const imagePattern = /!\[([^\]]*)\]\((https:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g;
const downloads = new Map();

function localAssetName(url) {
  const parsed = new URL(url);
  const extension = path.extname(parsed.pathname).toLowerCase() || ".png";
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const base = path.basename(parsed.pathname, extension).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 70);
  return `${base || "case-image"}-${hash}${extension}`;
}

for (const { directory, names } of [
  { directory: sourceDir, names: files },
  { directory: startSourceDir, names: startFiles },
]) {
  for (const file of names) {
    const sourcePath = path.join(directory, file);
    const original = await readFile(sourcePath, "utf8");
    const matches = [...original.matchAll(imagePattern)];

    for (const match of matches) {
      const url = match[2];
      if (!downloads.has(url)) downloads.set(url, localAssetName(url));
    }
  }
}

const queue = [...downloads.entries()];
const failures = [];

async function worker() {
  while (queue.length) {
    const [url, filename] = queue.shift();
    try {
      await access(path.join(assetDir, filename));
      continue;
    } catch {
      // Download assets that are not already present from a previous import.
    }
    try {
      const response = await fetch(url, { headers: { "User-Agent": "CodexHub content importer" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      await writeFile(path.join(assetDir, filename), bytes);
    } catch (error) {
      failures.push({ url, error: String(error) });
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));

for (const file of startFiles) {
  const sourcePath = path.join(startSourceDir, file);
  const original = await readFile(sourcePath, "utf8");
  const rewritten = original
    .replace(imagePattern, (full, alt, url) => {
      const filename = downloads.get(url);
      if (!filename || failures.some((failure) => failure.url === url)) return full;
      return `![${alt}](/imported/codexguide/${filename})`;
    })
    .replace(/[ \t]+$/gm, "");
  await writeFile(path.join(startContentDir, file), rewritten, "utf8");
}

for (const file of files) {
  const sourcePath = path.join(sourceDir, file);
  const original = await readFile(sourcePath, "utf8");
  const rewritten = original
    .replace(imagePattern, (full, alt, url) => {
      const filename = downloads.get(url);
      if (!filename || failures.some((failure) => failure.url === url)) return full;
      return `![${alt}](/imported/codexguide/${filename})`;
    })
    .replace(/[ \t]+$/gm, "");
  const category = categoryByNumber[file.slice(0, 2)] || "development";
  const targetDir = path.join(contentDir, category);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, file), rewritten, "utf8");
}

const revision = await readFile(path.join(sourceRoot, ".git", "refs", "heads", "main"), "utf8").catch(
  () => "f1eb20605f600982f161ec39b40abf1e4fb5555d",
);

await writeFile(
  manifestPath,
  JSON.stringify(
    {
      source: "https://github.com/freestylefly/CodexGuide",
      website: "https://codexguide.ai/",
      license: "MIT",
      copyright: "Copyright (c) 2026 canghe",
      revision: revision.trim(),
      importedAt: "2026-07-20",
      start: startFiles,
      cases: files,
      assets: downloads.size - failures.length,
      failures,
    },
    null,
    2,
  ),
);

console.log(
  `Imported ${startFiles.length} starter articles, ${files.length} cases and ${downloads.size - failures.length} assets.`,
);
if (failures.length) {
  console.warn(`${failures.length} assets could not be downloaded and remain remote URLs.`);
}
