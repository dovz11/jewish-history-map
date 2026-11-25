#!/usr/bin/env node
/**
 * Validates every Hebrew and English Wikipedia title referenced in src/data/*.json
 * and caches a short intro extract, a thumbnail URL and the Wikidata id into
 * src/data/wiki-cache.he.json and src/data/wiki-cache.en.json (loaded lazily per language).
 *
 * Usage:  node scripts/enrich-wiki.mjs
 * Exits non-zero when a referenced page is missing or is a disambiguation page.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, '..', 'src', 'data');
const FILES = ['events.json', 'rulers.json', 'eras.json', 'places.json', 'rabbinic-eras.json', 'people.json'];

const UA = 'JewishHistoryMap3D/0.1 (educational, non-commercial)';

const items = [];
for (const f of FILES) {
  try { items.push(...JSON.parse(await readFile(path.join(dataDir, f), 'utf8'))); } catch { /* optional file */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with polite pacing and back-off on Wikimedia rate limiting */
async function fetchJson(url, attempt = 0) {
  await sleep(1200);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  try {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(text);
  } catch (e) {
    if (attempt >= 5) throw e;
    await sleep(5000 * (attempt + 1));
    return fetchJson(url, attempt + 1);
  }
}

const problems = [];

async function enrich(lang) {
  const titles = new Set(items.map((it) => it.wiki?.[lang]).filter(Boolean));
  const all = [...titles];
  const cache = {};

  for (let i = 0; i < all.length; i += 20) {
    const batch = all.slice(i, i + 20);
    const params = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2', redirects: '1',
      prop: 'extracts|pageimages|pageprops|langlinks|info',
      exintro: '1', explaintext: '1', exsentences: '4', exlimit: 'max',
      piprop: 'thumbnail', pithumbsize: '480', pilimit: 'max',
      ppprop: 'wikibase_item|disambiguation',
      lllang: lang === 'he' ? 'en' : 'he', lllimit: 'max', inprop: 'url',
      titles: batch.join('|'),
    });
    const json = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    const q = json.query ?? {};
    // map requested title -> final title through normalization and redirects
    const resolve = (t) => {
      for (const n of q.normalized ?? []) if (n.from === t) t = n.to;
      for (const r of q.redirects ?? []) if (r.from === t) t = r.to;
      return t;
    };
    const pages = new Map((q.pages ?? []).map((p) => [p.title, p]));
    for (const t of batch) {
      const p = pages.get(resolve(t));
      if (!p || p.missing) { problems.push(`MISSING (${lang}): ${t}`); continue; }
      if (p.pageprops && 'disambiguation' in p.pageprops) problems.push(`DISAMBIGUATION (${lang}): ${t}`);
      cache[t] = {
        title: p.title,
        extract: (p.extract ?? '').trim(),
        thumbnail: p.thumbnail?.source,
        url: p.fullurl ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
        wikidata: p.pageprops?.wikibase_item,
        [lang === 'he' ? 'en' : 'he']: p.langlinks?.[0]?.title,
      };
    }
    process.stdout.write(`.${Math.min(i + 20, all.length)}/${all.length}`);
  }
  process.stdout.write('\n');

  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  await writeFile(path.join(dataDir, `wiki-cache.${lang}.json`), JSON.stringify(sorted, null, 1) + '\n');
  console.log(`${lang}: cached ${Object.keys(cache).length} pages`);
}

await enrich('he');
await enrich('en');

if (problems.length) {
  console.log(problems.join('\n'));
  process.exitCode = 1;
}
