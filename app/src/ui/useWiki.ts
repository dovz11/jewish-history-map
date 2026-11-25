import { useEffect, useState } from 'react';
import type { WikiSummary } from '../data/types';
import { wikiCache, wikiUrl } from '../lib/data';

const live = new Map<string, WikiSummary | null>();

/** Wikipedia summary: build-time cache first, otherwise the live REST API. */
export function useWikiSummary(title: string | undefined): WikiSummary | null {
  const cached = title ? wikiCache[title] : undefined;
  const [data, setData] = useState<WikiSummary | null>(cached ?? (title ? live.get(title) ?? null : null));

  useEffect(() => {
    if (!title) return setData(null);
    if (wikiCache[title]) return setData(wikiCache[title]);
    if (live.has(title)) return setData(live.get(title)!);
    let cancelled = false;
    fetch(`https://he.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const s: WikiSummary | null = j
          ? { title: j.title, extract: j.extract ?? '', thumbnail: j.thumbnail?.source, url: j.content_urls?.desktop?.page ?? wikiUrl('he', title), wikidata: j.wikibase_item }
          : null;
        live.set(title, s);
        if (!cancelled) setData(s);
      })
      .catch(() => !cancelled && setData(null));
    return () => { cancelled = true; };
  }, [title]);

  return data;
}
