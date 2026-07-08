"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/src/lib/cn";

interface SearchResult {
  href: string;
  label: string;
  sublabel: string;
  type: "player" | "route" | "team";
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isSlash =
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA";

      if (isCmdK || isSlash) {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length === 0) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { results: SearchResult[] }) => {
          setResults(data.results);
          setActiveIndex(0);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 150);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const visibleResults = query.trim().length === 0 ? [] : results;

  function openSearch() {
    setOpen(true);
  }

  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }

  function navigate(href: string) {
    closeSearch();
    router.push(href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && visibleResults[activeIndex]) {
      navigate(visibleResults[activeIndex].href);
    }
  }

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 transition hover:border-blue-300/40 hover:text-white"
        onClick={openSearch}
        type="button"
      >
        <span aria-hidden="true">Search</span>
        <span className="hidden rounded-md border border-slate-700 bg-white/[0.04] px-1.5 py-0.5 text-xs text-slate-500 sm:inline">
          /
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-24">
          <button
            aria-label="Close search"
            className="absolute inset-0"
            onClick={closeSearch}
            type="button"
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a1120] shadow-2xl shadow-black/50">
            <input
              className="w-full border-b border-white/10 bg-transparent px-5 py-4 text-base text-white placeholder:text-slate-500 focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search players, teams, or pages..."
              ref={inputRef}
              value={query}
            />
            <div className="max-h-96 overflow-y-auto p-2">
              {loading ? <p className="px-3 py-4 text-sm text-slate-500">Searching...</p> : null}
              {!loading && query.trim().length > 0 && visibleResults.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">No matches for &quot;{query}&quot;.</p>
              ) : null}
              {!loading &&
                visibleResults.map((result, index) => (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition",
                      index === activeIndex ? "bg-blue-400/10" : "hover:bg-white/[0.04]",
                    )}
                    key={`${result.type}-${result.href}-${result.label}`}
                    onClick={() => navigate(result.href)}
                    onMouseEnter={() => setActiveIndex(index)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{result.label}</p>
                      <p className="truncate text-xs text-slate-500">{result.sublabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {result.type}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
