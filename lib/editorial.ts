import "server-only";
import data from "@/content/editorial/site.json";
import { cases, startArticles, updates } from "@/lib/content";

const documents = [
  ...cases.map((item) => ({ href: `/cases/${item.slug}`, title: item.title, date: item.checkedAt || "" })),
  ...updates.map((item) => ({ href: `/community/updates/${item.slug}`, title: item.title, date: item.date })),
  ...startArticles.map((item) => ({ href: `/start/${item.slug}`, title: item.title, date: item.checkedAt || "" })),
];
export function editorialDocument(href: string) {
  const document = documents.find((item) => item.href === href);
  if (!document) throw new Error(`Missing editorial document: ${href}`);
  return document;
}
export const editorial = data;
export const readings = data.articles.map((item) => ({ ...item, date: editorialDocument(item.href).date }));
export const readingPaths = data.paths.map((item) => ({ ...item, documents: item.links.map(editorialDocument) }));
export const toolkits = data.toolkits.map((item) => ({ ...item, document: editorialDocument(item.source) }));
export type EditorialReading = (typeof readings)[number];
