import { useEffect, useState } from 'react';
import type { WikiSummary } from '../data/types';
import { wikiCache, wikiUrl } from '../lib/data';

/** Summaries fetched at runtime for titles missing from the build-time cache. */
const live = new Map<string, WikiSummary | null>();

/** Wikipedia summary: build-time cache first, otherwise the live REST API. */
export function useWikiSummary(title: string | undefined): WikiSummary | null {
  const [, rerender] = useState(0);
  const cached = title ? wikiCache[title] : undefined;
  const needsFetch = !!title && !cached && !live.has(title);

  useEffect(() => {
    if (!needsFetch || !title) return;
    let cancelled = false;
    fetch(`https://he.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        live.set(title, j
          ? { title: j.title, extract: j.extract ?? '', thumbnail: j.thumbnail?.source, url: j.content_urls?.desktop?.page ?? wikiUrl('he', title), wikidata: j.wikibase_item }
          : null);
      })
      .catch(() => live.set(title, null))
      .finally(() => !cancelled && rerender((n) => n + 1));
    return () => { cancelled = true; };
  }, [title, needsFetch]);

  if (!title) return null;
  return cached ?? live.get(title) ?? null;
}
