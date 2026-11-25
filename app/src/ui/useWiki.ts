import { useEffect, useState } from 'react';
import type { Lang, WikiSummary } from '../data/types';
import { getWikiCache, loadWikiCache, wikiUrl } from '../lib/data';

/** Summaries fetched at runtime for titles missing from the build-time cache. */
const live = new Map<string, WikiSummary | null>();

/**
 * Wikipedia summary for a title in the given language: the lazily loaded
 * build-time cache first, otherwise the live REST API.
 */
export function useWikiSummary(lang: Lang, title: string | undefined): WikiSummary | null {
  const [, rerender] = useState(0);
  const cache = getWikiCache(lang);
  const key = `${lang}:${title}`;

  useEffect(() => {
    if (!title) return;
    let cancelled = false;
    const done = () => !cancelled && rerender((n) => n + 1);
    loadWikiCache(lang).then((c) => {
      if (c[title] || live.has(key)) return done();
      fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          live.set(key, j
            ? { title: j.title, extract: j.extract ?? '', thumbnail: j.thumbnail?.source, url: j.content_urls?.desktop?.page ?? wikiUrl(lang, title), wikidata: j.wikibase_item }
            : null);
        })
        .catch(() => live.set(key, null))
        .finally(done);
    });
    return () => { cancelled = true; };
  }, [lang, title, key]);

  if (!title) return null;
  return cache?.[title] ?? live.get(key) ?? null;
}
