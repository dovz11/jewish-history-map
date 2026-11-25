# Third-party material and notices

The project's own material — the source code, the summaries and other texts written for it, and
the data files compiled for it (events, rulers, eras, places, people, population figures) — is
under MIT No Attribution (see [LICENSE](LICENSE)): anyone may copy, change and reuse it for any
purpose, without credit and without warranty.

The items below were made by others. They are **not** covered by that license. Each keeps its
own license, which you must follow if you reuse it.

## Wikipedia text excerpts

- **Where:** `app/src/data/wiki-cache.he.json` and `app/src/data/wiki-cache.en.json`, and the
  excerpts the app shows in its details panel (sometimes fetched live from Wikipedia).
- **Source:** the introductions of Hebrew and English Wikipedia articles, through the Wikipedia
  REST API. The authors are the Wikipedia contributors of each article.
- **License:** [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  If you reuse these texts, credit Wikipedia and the article, and share your version under the
  same license. The app shows the article name and license under every excerpt and links to the
  article.
- **Changes:** only the article's introduction is kept (shortened by Wikipedia's summary API).

## Images

- The pictures in the details panel are **not** stored in this repository. The browser loads
  them directly from Wikimedia Commons, where each file has its own author and license (shown on
  its Commons page, reachable through the linked Wikipedia article).
- `app/public/og.jpg` (the link-preview image) is a screenshot of this app, so it is part of
  the project's own material.

## Heebo font

- **Where:** `app/public/fonts/Heebo-*.ttf`.
- **Copyright:** © The Heebo Project Authors.
- **License:** [SIL Open Font License 1.1](https://openfontlicense.org); the full text is in
  `app/public/fonts/OFL.txt`, which must stay with the font files.

## Map outlines

- **Where:** `app/public/geo/land.json`.
- **Source:** [Natural Earth](https://www.naturalearthdata.com/) 1:110m land. Natural Earth data
  is in the **public domain**; no permission is needed to use it.

## Open-source libraries

The built website bundles open-source packages, among them React, three.js, React Three Fiber,
drei, camera-controls, troika-three-text and zustand. They are under permissive licenses (mostly
MIT). Their license texts come with each package in `node_modules/` after `npm install`, and the
full list is in `app/package.json` and `app/package-lock.json`.

## Facts and sources

- Historical dates and events, and population estimates, are facts and are not anyone's
  property. The population figures are rounded from published estimates (Broshi & Finkelstein,
  Baron, Ruppin, DellaPergola, JPPI), credited in the data and in the README.
- The summaries were written for this project. They were not copied from any book, website or
  poster.

## The odyeda.com poster

The poster "ציר זמן יהודי" (Jewish Timeline) on [odyeda.com](https://www.odyeda.com/he/) inspired
the general idea and the visual style of the 2D view: a timeline poster with parallel rows. No
text, data, images or graphics were copied from it. This project is not affiliated with
odyeda.com or its author.

## Trademarks

Wikipedia and Wikimedia are trademarks of the Wikimedia Foundation. They are named here only to
credit sources; this project is not affiliated with or endorsed by the Wikimedia Foundation.
