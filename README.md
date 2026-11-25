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
| **Rabbinic eras** (תקופות ההלכה) | An arcade of arches behind the events, from the Men of the Great Assembly and the Zugot through the Tannaim, Amoraim, Savoraim, Geonim and Rishonim to the Acharonim. |
| **People** (אישים) | 53 figures, from Hillel to Elie Wiesel, standing beneath the arch of their period, with their lifespan as a bar on the ground. They include sages, rabbis, thinkers, poets, mystics, leaders and writers, among them women and Sephardi, Mizrahi and Yemenite figures. On the globe each person appears where they lived in the chosen year. |

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

**Navigation.** The touch gestures follow Google Earth.

| Action | Mouse or keyboard | Touch |
|---|---|---|
| Pan along time and across lanes | Drag with the left button | One finger |
| Zoom | Wheel, or double-click to zoom in | Pinch; double tap to zoom in; two-finger tap to zoom out; double tap and drag for one-finger zoom |
| Turn the view | Right-drag | Twist two fingers |
| Tilt | Right-drag | Slide two fingers up or down |
| Face forward again, untilted | Compass button | Same |
| See everything | ◎ button | Same |
| Full screen (hides the browser bars) | ⛶ button, or the menu | Same; offered automatically when a phone is turned sideways |
| Flat 2D view or 3D landscape | 2D / 3D button | Same |
| Move to the next or previous event | `←` / `→` | Next/previous buttons in the panel |
| Close the panel or a dialog | `Esc` | Swipe the card down, or tap empty space |
| Hide or show the buttons (full screen) | — | Tap empty space |
| Jump anywhere in time | Click or drag on the minimap at the bottom | Same |
| Find an item | Search box | Same |

**2D and 3D.** The 2D view is drawn as a printed infographic poster seen from above,
inspired by the layout of the odyeda.com poster (the content is our own):
- a white sheet with a thin black year axis and flat colors;
- above the axis, rows of bordered cells for the eras, the rabbinic eras and who ruled the Land
  of Israel (in pastel colors, with a gold edge for Jewish rule);
- a stacked area chart of the world Jewish population, with the Land of Israel share in blue;
- events as bullets and labels placed just above the chart, with dotted leader lines down to it;
- people below the axis as colored lifespan capsules.

The globe becomes a flat world map. The choice is remembered, and the camera keeps its place
when you switch. The 2D layout is in `src/scene/Poster2D.tsx` and `src/lib/poster.ts`.

**On phones** the toolbar shrinks to a search pill with a menu (view, dating, language, list,
full screen, help) and a layers button. Both open only when tapped. The details open as a
bottom sheet: drag its handle up for the full text, or swipe it down to close.

**Phones held sideways** get a wide view of time: the search pill moves to a corner, the details
open as a narrow side panel, the minimap gets slimmer (on the globe the year slider replaces it),
and the camera comes nearer so labels stay readable. Turning the phone offers full screen once
per visit. iPhones don't allow full screen for web pages, so there the hint suggests
"Add to Home Screen": the site then opens as an app without browser bars
(`public/manifest.webmanifest`; icons from `npm run icons`).

Clicking an item opens a panel with:
- both datings, including the Hebrew year;
- our own summary;
- the Wikipedia introduction and image;
- links to Hebrew and English Wikipedia;
- context: who ruled at the time and how many Jews there were then.

Every view can be linked directly, for example `#event=expulsion-spain&mode=acad`, or
`#ruler=persia`, `#era=era-second-temple`, `#pop=1939`. Add `&view=globe` to open the globe,
`&dim=2d` for the flat view and `&lang=en` for English.

If the browser can't display 3D (no WebGL), the app shows an accessible chronological list
instead.

## Development

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in app/dist
npm run enrich     # validate he+en Wikipedia titles, refresh src/data/wiki-cache.{he,en}.json
npm run review-sheet  # regenerate docs/content-review.md (checklist for reviewers)
npm run og-image   # rebuild the link-preview image public/og.jpg from assets-src/og-screenshot.jpg
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

1. Edit `app/src/data/events.json`, `rulers.json`, `population.json`, `eras.json`,
   `rabbinic-eras.json` or `people.json`. For people, `places` are in life order, and the optional
   `placeFrom` gives the year each place begins.
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


- More lanes: Jewish literature, world history.
- Expert content review: see [docs/content-review.md](docs/content-review.md) and the content-correction issue template.
