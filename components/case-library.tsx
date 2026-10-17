"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { CaseList, type CaseListItem } from "@/components/case-list";
import { caseCategories, getCaseCategoryLabel } from "@/lib/case-categories";
import styles from "./case-library.module.css";

function subscribeToCategory(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

function readCategory() {
  const hash = window.location.hash.slice(1);
  return caseCategories.some((category) => category.id === hash) ? hash : "all-cases";
}

function readServerCategory() {
  return "all-cases";
}

const suggestedKeywords = ["CI", "权限", "Skill", "浏览器"];

export function CaseLibrary({ items }: { items: CaseListItem[] }) {
  const [query, setQuery] = useState("");
  const activeCategory = useSyncExternalStore(subscribeToCategory, readCategory, readServerCategory);
  const searchIndex = useMemo(
    () => items.map((item) => ({
      item,
      text: [item.title, item.summary, item.surface, item.level, item.slug, getCaseCategoryLabel(item.category)]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase(),
    })),
    [items],
  );
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matchingItems = searchIndex
    .filter(({ text }) => terms.every((term) => text.includes(term)))
    .map(({ item }) => item);
  const visibleItems = matchingItems.filter((item) => activeCategory === "all-cases" || item.category === activeCategory);
  const selectedCategory = caseCategories.find((category) => category.id === activeCategory);
  const hasFilters = query.length > 0 || activeCategory !== "all-cases";

  function clearFilters() {
    setQuery("");
    if (activeCategory !== "all-cases") window.location.hash = "all-cases";
  }

  return (
    <div className={styles.library}>
      <div className={styles.searchPanel}>
        <label className={styles.searchLabel} htmlFor="case-search">你想解决什么问题？</label>
        <div className={styles.searchField}>
          <Search aria-hidden="true" size={21} />
          <input
            autoComplete="off"
            id="case-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索任务、工具或遇到的问题"
            type="search"
            value={query}
            aria-describedby="case-search-help"
          />
          {query ? (
            <button aria-label="清空搜索关键词" className={styles.clearSearch} onClick={() => setQuery("")} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>
        <div className={styles.searchSuggestions}>
          <span id="case-search-help">试试关键词</span>
          {suggestedKeywords.map((keyword) => (
            <button key={keyword} onClick={() => setQuery(keyword)} type="button">{keyword}</button>
          ))}
        </div>
      </div>

      <nav aria-label="按任务筛选案例" className={styles.categories}>
        <a aria-current={activeCategory === "all-cases" ? "true" : undefined} href="#all-cases" id="all-cases">
          全部案例 <span>{items.length}</span>
        </a>
        {caseCategories.map((category) => (
          <a
            aria-current={activeCategory === category.id ? "true" : undefined}
            href={`#${category.id}`}
            id={category.id}
            key={category.id}
          >
            {category.label}
            <span>{items.filter((item) => item.category === category.id).length}</span>
          </a>
        ))}
      </nav>

      <div className={styles.resultsBar}>
        <p aria-live="polite" aria-atomic="true" role="status">
          {selectedCategory?.label || "全部案例"}<span> / </span>
          {query.trim() ? <>“{query.trim()}” · </> : null}
          <strong>{visibleItems.length}</strong> 个结果
        </p>
        {hasFilters ? <button onClick={clearFilters} type="button">重置筛选 <X aria-hidden="true" size={14} /></button> : null}
      </div>

      {visibleItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Search aria-hidden="true" size={28} />
          <h2>暂时没有找到匹配的案例</h2>
          <p>试试更短的关键词，或清除分类后再搜索。</p>
          <button onClick={clearFilters} type="button">查看全部案例</button>
        </div>
      ) : null}

      <div className={styles.groups}>
        {caseCategories.map((category) => {
          const categoryItems = visibleItems.filter((item) => item.category === category.id);
          if (categoryItems.length === 0) return null;

          return (
            <section aria-labelledby={`heading-${category.id}`} className={styles.group} key={category.id}>
              <div className={styles.groupHeading}>
                <div>
                  <h2 id={`heading-${category.id}`}>{category.label}</h2>
                  <p>{category.description}</p>
                </div>
                <span>{String(categoryItems.length).padStart(2, "0")} 篇</span>
              </div>
              <CaseList items={categoryItems} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
