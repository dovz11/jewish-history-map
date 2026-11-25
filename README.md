# ציר הזמן היהודי בתלת־ממד · 3D Jewish History Timeline

**▶ Live site: https://dovz11.github.io/jewish-history-map/** · [English](https://dovz11.github.io/jewish-history-map/#lang=en)

An interactive 3D timeline of Jewish history that runs in the browser. You can fly through
history as a landscape, or watch it unfold on a globe. The interface is in **Hebrew** and
**English**, switched with the language button. In Hebrew time flows right to left, as Hebrew is
read. In English it flows left to right.

It is inspired by the "Jewish timeline" poster on odyeda.com. All content here was written
from scratch or taken from Wikipedia. Nothing is copied from the poster.

## What's on the map

| Lane | What it shows |
|---|---|
| **Events** (אירועים) | Markers with cards, from Creation to the present. Bigger cards mean more important events. A bar on the ground shows how long an event lasted. |
| **Demography** (דמוגרפיה) | A 3D "river". Its width and height show the world Jewish population. The gold strip is the share living in the Land of Israel, and the pale band is the range of scholarly estimates. |
| **Sovereignty** (שלטון) | Blocks showing who ruled the Land of Israel. Tall blocks with a gold stripe mark Jewish sovereignty or self-rule. |
| **Eras** (תקופות) | Tinted floor sections with large titles, such as the First Temple period and the Middle Ages. |

**Globe view (🌍).** A parchment-style globe drawn from Natural Earth outlines shows the world
in a chosen year:
- **gold pulsing dots** for the centers of Jewish life active then, such as Babylonia,
  Alexandria, Sepharad, Ashkenaz, Poland, New York and Israel;
- **pins** for events and the places they happened;
- **animated red arcs** for exiles and migrations, such as the Babylonian exile, the
  expulsion from Spain and the mass aliyah.

▶ plays through time and the arrows jump between events. The minimap and slider set the
year. The info panel switches between the timeline and the globe and lists the event's places.
Places, centers and migrations are in `src/data/places.json`, `centers.json` and
`migrations.json`.

**Dual dating.** Each item has an academic date, a traditional date (Seder Olam and the
Hebrew calendar), or both. A toggle switches between **מחקרי** (academic), **מסורתי**
(traditional) and **שניהם** (both). In "both" mode an item stands at its academic date, and a
dashed arc leads to a small marker at its traditional date. For example, the destruction of the
First Temple is 586 BCE academically and 423 BCE traditionally. The time axis shows Common
Era years and Hebrew years (in Hebrew numerals).

**Navigation**

| Action | Mouse or keyboard | Touch |
|---|---|---|
| Pan along time and across lanes | Drag with the left button | One finger |
| Zoom | Wheel | Pinch |
| Rotate | Right-drag | Three fingers |
| Move to the next or previous event | `←` / `→` | Next/previous buttons in the panel |
| Close the panel or a dialog | `Esc` | Tap empty space |
| Jump anywhere in time | Click or drag on the minimap at the bottom | Same |
| Find an item | Search box | Same |

Clicking an item opens a panel with:
- both datings, including the Hebrew year;
- our own summary;
- the Wikipedia introduction and image;
- links to Hebrew and English Wikipedia;
- context: who ruled at the time and how many Jews there were then.

Every view can be linked directly, for example `#event=expulsion-spain&mode=acad`, or
`#ruler=persia`, `#era=era-second-temple`, `#pop=1939`. Add `&view=globe` to open the globe and
`&lang=en` for English.

If the browser can't display 3D (no WebGL), the app shows an accessible chronological list
instead.

## Development

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in app/dist
npm run enrich     # validate he+en Wikipedia titles, refresh src/data/wiki-cache.{he,en}.json
```

Built with Vite, React 19, TypeScript, three.js through
[@react-three/fiber](https://github.com/pmndrs/react-three-fiber) and drei, and zustand.
Text in 3D is rendered with troika-three-text and the Heebo font, which handles Hebrew
right-to-left text correctly.

### Project layout

```
app/
  scripts/enrich-wiki.mjs    Wikipedia validation + cache builder
  public/geo/land.json       Natural Earth 1:110m land outlines (public domain)
  src/data/                  the dataset (JSON) + types.ts (the data model)
  src/lib/timeScale.ts       year <-> position mapping (piecewise, RTL), lane positions
  src/lib/data.ts            loading, dating logic, population interpolation, colors
  src/lib/dates.ts           year formatting, Hebrew calendar year, gematria
  src/scene/                 3D: camera, lanes, axis, eras, GlobeScene
  src/lib/globe.ts           globe projection, what is active in a given year
  src/ui/                    toolbar, info panel, minimap, list, help, globe controls
  src/i18n.ts                UI strings (he/en), language switching, time direction
.github/workflows/deploy.yml GitHub Pages deployment
```

### Adding or editing content

1. Edit `app/src/data/events.json`, `rulers.json`, `population.json` or `eras.json`.
   - The schema is in `app/src/data/types.ts`.
   - Years are negative for BCE.
   - `dating.acad` is `null` for items known only from tradition.
   - Add `dating.trad` only when the traditional date differs from the academic one.
2. Set `wiki.he` to the exact Hebrew Wikipedia article title, and `wiki.en` to the English one.
   Give every text both `he` and `en`. The app falls back to Hebrew when `en` is missing.
3. Run `npm run enrich`. It fails and lists the problems if any title is missing or is a
   disambiguation page. Check that redirects point to the intended article.

## Deployment

The build is fully static. It uses a relative base, so it works from any folder or sub-path.
- **GitHub Pages:** push to `main` and enable *Settings → Pages → Source: GitHub Actions*. The
  workflow in `.github/workflows/deploy.yml` builds and publishes the site.
- **Netlify, Cloudflare Pages or any static host:** build command `npm run build` (in `app/`),
  output folder `app/dist`.

## Sources and licenses

- Summaries were written for this project.
- Excerpts and images come from Wikipedia and Wikimedia Commons, under CC BY-SA and the
  licenses of the individual files. The panel credits each excerpt.
- Population figures are rounded estimates from Broshi & Finkelstein, Baron, Ruppin,
  DellaPergola and JPPI. Ancient and medieval numbers are very uncertain, and the map shows
  that uncertainty as a range.
- Heebo font © The Heebo Project Authors, SIL Open Font License 1.1 (`app/public/fonts/OFL.txt`).

## Roadmap


- More lanes: rabbinic eras, personalities, Jewish literature, world history.
