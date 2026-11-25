/**
 * The 2D view: the timeline drawn as a printed infographic poster, seen from straight above.
 * White sheet, thin black axis, flat colors. From the axis upwards:
 *   eras row · rabbinic-eras row · rule over the Land of Israel · population area chart
 *   · events (bullets with dotted leader lines, hugging the chart).
 * Below the axis: people (lifespan capsules).
 * Everything lies on the ground plane (y ≈ 0); "up" on screen is -z.
 */
import { Line, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { HistoryEvent, ItemRef, Person } from '../data/types';
import { L, lang, t } from '../i18n';
import {
  CATEGORY_LABELS, datingsDiffer, eras, events, ghostSpan, isTradOnly, KIND_LABELS, mainSpan, nearestPopPoint, people, population,
  popIsrael, popMax, popTotal, POP_FROM, POP_TO, rabbinicEras, rulers,
} from '../lib/data';
import { formatMillions, formatSpan, formatYear, formatYearShort, hebrewYear } from '../lib/dates';
import { focusItem } from '../lib/focus';
import { DIR, tickYears, uToYear, xToYear, yearToU, yearToX, YEAR_MAX, YEAR_MIN } from '../lib/timeScale';
import { sameRef, useStore } from '../store';
import { FONT_BLACK, FONT_BOLD, FONT_REGULAR, POSTER } from './constants';
import { chartTopAt, POP_K, POSTER_Z } from '../lib/poster';

/* ---------- rows (z of their centers; smaller z is higher on screen) ---------- */
const Z = POSTER_Z;
const ROW_H = { era: 2.4, rabbinic: 2.2, trad: 1.8, rule1: 1.8, rule: 3 };
const PERSON_STEP = 1.95;
const PEOPLE_ROWS = 10;
/** top and bottom of the sheet (for the era tints) */
const SHEET_TOP = Z.popBase - POP_K * 17 - 18, SHEET_BOTTOM = Z.peopleFrom + PEOPLE_ROWS * PERSON_STEP + 2;
const FLAT_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];

/** Y layers (lifted slightly so nothing z-fights; parallax is negligible from above). */
const Y = { tint: 0.01, cell: 0.04, area: 0.05, israel: 0.07, line: 0.1, mark: 0.12, text: 0.16 };

export function Poster2D() {
  const lanes = useStore((s) => s.lanes);
  return (
    <group>
      <Paper />
      {lanes.eras && <EraTints />}
      <Axis />
      {lanes.eras && <EraRow />}
      {lanes.rabbinic && <RabbinicRow />}
      {lanes.sovereignty && <RuleRows />}
      {lanes.demography && <PopulationChart />}
      {lanes.history && <EventRows />}
      {lanes.people && <PeopleRows />}
      <RowTitles />
    </group>
  );
}

/* ---------- shared bits ---------- */

const x0All = yearToX(YEAR_MIN), x1All = yearToX(YEAR_MAX);
const xMin = Math.min(x0All, x1All), xMax = Math.max(x0All, x1All);

function Paper() {
  return (
    <mesh rotation={FLAT_ROT} position={[(xMin + xMax) / 2, 0, -20]} raycast={() => null}>
      <planeGeometry args={[xMax - xMin + 400, 400]} />
      <meshBasicMaterial color={POSTER.paper} />
    </mesh>
  );
}

/** Greedy row packing: each item goes to the lowest row where its x-extent is free. */
function pack<T>(items: T[], extent: (t: T) => [number, number], maxRows: number): Map<T, number> {
  const rows: [number, number][][] = [];
  const out = new Map<T, number>();
  for (const it of items) {
    const [a, b] = extent(it);
    let r = rows.findIndex((row) => row.every(([c, d]) => b < c || a > d));
    if (r === -1) r = rows.length < maxRows ? rows.push([]) - 1 : rows.length - 1;
    rows[r].push([a, b]);
    out.set(it, r);
  }
  return out;
}

/** Rough text width in scene units (Heebo averages a little over half an em per character). */
const textW = (s: string, size: number) => s.length * size * 0.52;

const hover = (text: string | null) => {
  useStore.getState().setHover(text);
  document.body.style.cursor = text ? 'pointer' : '';
};

/** Show a group only while the camera is low enough (camera height ≈ zoom level in 2D). */
function useLod(maxHeight: number, always = false) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = always || camera.position.y < maxHeight;
  });
  return ref;
}

interface CellProps {
  x0: number; x1: number; z: number; h: number;
  fill: string; label: string; sub?: string;
  textColor?: string; bold?: boolean; selected?: boolean; dashed?: boolean;
  onClick?: () => void; tip?: string;
}

/** A bordered cell in one of the period rows. */
const Cell = memo(function Cell({ x0, x1, z, h, fill, label, sub, textColor = POSTER.ink, bold, selected, dashed, onClick, tip }: CellProps) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1);
  const w = Math.max(0.05, b - a);
  const cx = (a + b) / 2;
  const fs = THREE.MathUtils.clamp((w - 0.3) / Math.max(2, label.length * 0.56), 0.3, h * 0.36);
  const showLabel = w > 1.1;
  const border: [number, number, number][] = [[a, Y.line, z - h / 2], [b, Y.line, z - h / 2], [b, Y.line, z + h / 2], [a, Y.line, z + h / 2], [a, Y.line, z - h / 2]];
  return (
    <group>
      <mesh
        rotation={FLAT_ROT}
        position={[cx, Y.cell, z]}
        onClick={onClick && ((e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); })}
        onPointerOver={tip ? (e) => { e.stopPropagation(); hover(tip); } : undefined}
        onPointerOut={tip ? () => hover(null) : undefined}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={selected ? POSTER.highlight : fill} />
      </mesh>
      <Line points={border} color={selected ? POSTER.selected : POSTER.rule} lineWidth={selected ? 2 : 1} dashed={dashed} dashSize={0.3} gapSize={0.2} />
      {showLabel && (
        <Text
          font={bold ? FONT_BOLD : FONT_REGULAR}
          fontSize={fs}
          maxWidth={w - 0.2}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          rotation={FLAT_ROT}
          position={[cx, Y.text, z - (sub && h > 2 ? fs * 0.35 : 0)]}
          color={textColor}
          direction="auto"
          raycast={() => null}
        >
          {label}
        </Text>
      )}
      {showLabel && sub && h > 2 && w > 4 && (
        <Text font={FONT_REGULAR} fontSize={Math.min(0.5, fs * 0.58)} anchorX="center" anchorY="middle" rotation={FLAT_ROT} position={[cx, Y.text, z + fs * 0.55]} color={POSTER.inkSoft} direction="auto" raycast={() => null}>
          {sub}
        </Text>
      )}
    </group>
  );
});

/* ---------- eras: faint full-height tints and a labelled row above the axis ---------- */

function EraTints() {
  const mode = useStore((s) => s.mode);
  const top = SHEET_TOP, bottom = SHEET_BOTTOM;
  return (
    <group>
      {eras.map((era) => {
        const s = mainSpan(era.dating, mode);
        const a = yearToX(s.start), b = yearToX(s.end!);
        return (
          <mesh key={era.id} rotation={FLAT_ROT} position={[(a + b) / 2, Y.tint, (top + bottom) / 2]} raycast={() => null}>
            <planeGeometry args={[Math.abs(b - a), bottom - top]} />
            <meshBasicMaterial color={era.color} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function EraRow() {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => s.selected);
  return (
    <group>
      {eras.map((era) => {
        const s = mainSpan(era.dating, mode);
        return (
          <Cell
            key={era.id}
            x0={yearToX(s.start)} x1={yearToX(s.end!)} z={Z.era} h={ROW_H.era}
            fill={era.color} label={L(era.title)} bold
            selected={sameRef(selected, { type: 'era', id: era.id })}
            onClick={() => focusItem({ type: 'era', id: era.id })}
            tip={`${L(era.title)} · ${formatSpan(s)}`}
          />
        );
      })}
    </group>
  );
}

function RabbinicRow() {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => s.selected);
  return (
    <group>
      {rabbinicEras.map((r) => {
        const s = mainSpan(r.dating, mode);
        return (
          <Cell
            key={r.id}
            x0={yearToX(s.start)} x1={yearToX(s.end ?? s.start)} z={Z.rabbinic} h={ROW_H.rabbinic}
            fill="#ffffff" label={L(r.title)}
            selected={sameRef(selected, { type: 'rabbinic', id: r.id })}
            onClick={() => focusItem({ type: 'rabbinic', id: r.id })}
            tip={`${t('rabbinicEra')}: ${L(r.title)} · ${formatSpan(s)}`}
          />
        );
      })}
    </group>
  );
}

/* ---------- rule over the Land of Israel ---------- */

const pastel = (hex: string) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), 0.6).getHexString();

function RuleRows() {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => s.selected);
  return (
    <group>
      {rulers.map((r) => {
        const s = mainSpan(r.dating, mode);
        const row1 = r.row === 1;
        return (
          <Cell
            key={r.id}
            x0={yearToX(s.start)} x1={yearToX(s.end ?? s.start + 1)} z={row1 ? Z.rule1 : Z.rule} h={row1 ? ROW_H.rule1 : ROW_H.rule}
            fill={POSTER.power[r.power] ?? pastel('#888888')} label={L(r.title)} sub={formatSpan(s)}
            bold={r.jewish}
            selected={sameRef(selected, { type: 'ruler', id: r.id })}
            onClick={() => focusItem({ type: 'ruler', id: r.id })}
            tip={`${L(r.title)} · ${formatSpan(s)}`}
          />
        );
      })}
      {mode === 'both' &&
        rulers.filter((r) => datingsDiffer(r.dating)).map((r) => (
          <Cell
            key={r.id + '-t'}
            x0={yearToX(r.dating.trad!.start)} x1={yearToX(r.dating.trad!.end ?? r.dating.trad!.start + 1)} z={Z.trad} h={ROW_H.trad}
            fill="#f7efe2" label={L(r.title)} textColor={POSTER.trad} dashed
            tip={`${t('tradDatingPrefix')} · ${L(r.title)} · ${formatSpan(r.dating.trad!)}`}
          />
        ))}
      {/* a gold edge marks Jewish sovereignty or self-rule, as in the 3D view */}
      {rulers.filter((r) => r.jewish).map((r) => {
        const s = mainSpan(r.dating, mode);
        const a = yearToX(s.start), b = yearToX(s.end ?? s.start + 1);
        return (
          <mesh key={r.id + '-j'} rotation={FLAT_ROT} position={[(a + b) / 2, Y.mark, Z.rule - ROW_H.rule / 2 + 0.14]} raycast={() => null}>
            <planeGeometry args={[Math.abs(b - a), 0.28]} />
            <meshBasicMaterial color="#e3b12f" />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- population: an area chart standing on its baseline ---------- */

function areaGeometry(fn: (year: number) => number, step = 0.5) {
  const u0 = yearToU(POP_FROM), u1 = yearToU(POP_TO);
  const pos: number[] = [];
  const idx: number[] = [];
  let n = 0;
  for (let u = u0; ; u = Math.min(u1, u + step)) {
    const x = DIR * u;
    pos.push(x, 0, Z.popBase, x, 0, Z.popBase - POP_K * Math.max(0, fn(uToYear(u))));
    if (n > 0) { const a = 2 * (n - 1); idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    n++;
    if (u >= u1) break;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const POP_LABEL_YEARS = new Set([-1000, -734, 1, 136, 1000, 1490, 1800, 1880, 1939, 1945, 1970, 2025]);
const POP_LABEL_FS = 0.85;
const popLabel = (m: number) => '~' + formatMillions(m);

function PopulationChart() {
  const { world, israel, range } = useMemo(() => ({ world: areaGeometry(popTotal), israel: areaGeometry(popIsrael, 0.4), range: areaGeometry(popMax, 1) }), []);
  const xa = yearToX(POP_FROM), xb = yearToX(POP_TO);
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const year = xToYear(e.point.x);
    const tot = popTotal(year), isr = popIsrael(year);
    let text = `${formatYear(year)}: ${t('approxShort')}${formatMillions(tot)} · ${t('jewsInWorld')}`;
    if (isr > 0.005) text += ` · ${t('inIsrael')}: ${formatMillions(isr)} (${Math.round((isr / tot) * 100)}%)`;
    hover(text);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    focusItem({ type: 'pop', year: nearestPopPoint(xToYear(e.point.x)).year });
  };
  const labelsRef = useLod(420);
  return (
    <group>
      {/* gridlines every few million, labelled at both ends */}
      {[2, 5, 10, 15].map((m) => {
        const z = Z.popBase - POP_K * m;
        return (
          <group key={m}>
            <Line points={[[xa, Y.line, z], [xb, Y.line, z]]} color={POSTER.grid} lineWidth={1} />
            {[xa, xb].map((x, i) => (
              <Text key={i} font={FONT_REGULAR} fontSize={0.75} color={POSTER.inkSoft} anchorX={(i === 0) === DIR > 0 ? 'right' : 'left'} anchorY="middle" rotation={FLAT_ROT} position={[x - DIR * (i === 0 ? 0.6 : -0.6), Y.text, z]} raycast={() => null}>
                {String(m)}
              </Text>
            ))}
          </group>
        );
      })}
      <mesh geometry={range} position={[0, Y.area - 0.01, 0]} raycast={() => null}>
        <meshBasicMaterial color={POSTER.worldRange} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={world} position={[0, Y.area, 0]} onPointerMove={onMove} onPointerOut={() => hover(null)} onClick={onClick}>
        <meshBasicMaterial color={POSTER.world} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={israel} position={[0, Y.israel, 0]} raycast={() => null}>
        <meshBasicMaterial color={POSTER.israel} side={THREE.DoubleSide} />
      </mesh>
      <Line points={[[xa, Y.line, Z.popBase], [xb, Y.line, Z.popBase]]} color={POSTER.rule} lineWidth={1} />
      <group ref={labelsRef}>
        {population.filter((p) => POP_LABEL_YEARS.has(p.year)).map((p) => (
          <Text key={p.year} font={FONT_BOLD} fontSize={POP_LABEL_FS} color="#a35a06" outlineWidth={0.05} outlineColor={POSTER.paper} anchorX="center" anchorY="bottom" rotation={FLAT_ROT} position={[yearToX(p.year), Y.text, Z.popBase - POP_K * p.total - 0.25]} direction="auto" raycast={() => null}>
            {popLabel(p.total)}
          </Text>
        ))}
      </group>
    </group>
  );
}

/* ---------- events: bullet, title and date, with a dotted leader down to the chart's baseline ---------- */

const EVENT_FS = 1.0;
const DATE_FS = 0.6;
const EVENT_LOD: Record<number, number> = { 1: 100, 2: 150, 3: 230, 4: 400, 5: 10000 };

function eventDateLine(e: HistoryEvent, mode: ReturnType<typeof useStore.getState>['mode']) {
  const s = mainSpan(e.dating, mode), g = ghostSpan(e.dating, mode);
  return (isTradOnly(e.dating) ? `${t('tradOnly')} · ` : '') + formatSpan(s) + (g ? ` · ${t('tradPrefix')}: ${formatSpan(g)}` : '');
}

/** Top edge (z) of the population chart over a stretch of the sheet: the most negative z there. */
function chartTop(xa: number, xb: number) {
  let top = Z.popBase;
  for (let i = 0; i <= 12; i++) {
    const year = xToYear(xa + ((xb - xa) * i) / 12);
    if (year >= POP_FROM && year <= POP_TO) top = Math.min(top, Z.popBase - POP_K * popMax(year));
  }
  return top;
}

/**
 * Lay the event labels out like the poster: each one as close above the chart as it fits,
 * the most important first, sliding further up only where it would overlap an earlier one.
 */
function placeEvents(mode: ReturnType<typeof useStore.getState>['mode']) {
  const placed: { a: number; b: number; top: number; bottom: number }[] = [];
  // the population chart's value labels are already there: keep clear of them
  for (const pt of population.filter((q) => POP_LABEL_YEARS.has(q.year))) {
    const x = yearToX(pt.year), half = textW(popLabel(pt.total), POP_LABEL_FS) / 2 + 0.2;
    const top = Z.popBase - POP_K * pt.total;
    placed.push({ a: x - half, b: x + half, top: top - 0.25 - POP_LABEL_FS * 1.3, bottom: top });
  }
  const out = new Map<HistoryEvent, number>();
  const sorted = events.slice().sort((p, q) => q.importance - p.importance);
  for (const e of sorted) {
    const x = yearToX(mainSpan(e.dating, mode).start);
    const fs = EVENT_FS * (e.importance >= 4 ? 1.15 : 1);
    const tw = Math.max(textW(L(e.title), fs), textW(eventDateLine(e, mode), DATE_FS));
    const lines = Math.ceil(textW(L(e.title), fs) / 14);
    const half = Math.min(tw, 14) / 2 + 0.4;
    const a = x - half, b = x + half;
    // label box relative to its anchor z: from the title's top line down to the bullet
    const up = 0.15 + fs * 1.2 * lines, down = 1.45;
    let z = chartTop(a, b) - 0.8 - down;
    for (let k = 0; k < 120; k++) {
      const top = z - up, bottom = z + down;
      if (placed.every((q) => b < q.a || a > q.b || bottom < q.top || top > q.bottom)) break;
      z -= 0.5;
    }
    placed.push({ a, b, top: z - up, bottom: z + down });
    out.set(e, z);
  }
  return out;
}

function EventRows() {
  const mode = useStore((s) => s.mode);
  const zs = useMemo(() => placeEvents(mode), [mode]);
  return <group>{events.map((e) => <EventMark key={e.id} event={e} z={zs.get(e) ?? Z.popBase - 4} />)}</group>;
}

const EventMark = memo(function EventMark({ event, z }: { event: HistoryEvent; z: number }) {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => sameRef(s.selected, { type: 'event', id: event.id }));
  const x = yearToX(mainSpan(event.dating, mode).start);
  const fs = EVENT_FS * (event.importance >= 4 ? 1.15 : 1);
  const year = mainSpan(event.dating, mode).start;
  // the dotted leader drops to the top of the population chart (or to its baseline outside the data)
  const leaderEnd = chartTopAt(year);
  const color = isTradOnly(event.dating) ? POSTER.trad : POSTER.kind[event.kind];
  const ref = useLod(EVENT_LOD[event.importance], selected);
  const ref2: ItemRef = { type: 'event', id: event.id };
  const tip = `${L(event.title)} · ${formatSpan(mainSpan(event.dating, mode))} · ${KIND_LABELS[event.kind][lang]}`;
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); focusItem(ref2); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover(tip); },
    onPointerOut: () => hover(null),
  };
  const w = Math.min(Math.max(textW(L(event.title), fs), 2.4), 14);
  return (
    <group>
      {/* the bullet always shows, so the overview still reads as a dense timeline */}
      <mesh rotation={FLAT_ROT} position={[x, Y.mark, z + 1.05]} {...handlers}>
        <circleGeometry args={[selected ? 0.45 : 0.32, 20]} />
        <meshBasicMaterial color={selected ? POSTER.selected : color} />
      </mesh>
      <group ref={ref}>
        <Line points={[[x, Y.line, z + 1.4], [x, Y.line, leaderEnd]]} color={selected ? POSTER.selected : POSTER.leader} lineWidth={1} dashed dashSize={0.25} gapSize={0.22} />
        {selected && (
          <mesh rotation={FLAT_ROT} position={[x, Y.cell, z - 0.55]}>
            <planeGeometry args={[w + 0.8, 2.6]} />
            <meshBasicMaterial color={POSTER.highlight} />
          </mesh>
        )}
        <Text
          font={event.importance >= 4 ? FONT_BOLD : FONT_REGULAR}
          fontSize={fs}
          maxWidth={14}
          textAlign="center"
          anchorX="center"
          anchorY="bottom"
          rotation={FLAT_ROT}
          position={[x, Y.text, z - 0.15]}
          color={selected ? POSTER.selected : POSTER.ink}
          outlineWidth={0.06}
          outlineColor={POSTER.paper}
          direction="auto"
          {...handlers}
        >
          {L(event.title)}
        </Text>
        <Text font={FONT_REGULAR} fontSize={DATE_FS} anchorX="center" anchorY="top" rotation={FLAT_ROT} position={[x, Y.text, z - 0.05]} color={isTradOnly(event.dating) ? POSTER.trad : POSTER.inkSoft} direction="auto" raycast={() => null}>
          {eventDateLine(event, mode)}
        </Text>
      </group>
    </group>
  );
});

/* ---------- people: lifespan capsules with names ---------- */

const PERSON_FS = 0.78;
const PERSON_LOD: Record<number, number> = { 1: 90, 2: 140, 3: 210, 4: 340, 5: 10000 };

function PeopleRows() {
  const rows = useMemo(() => {
    const sorted = people.slice().sort((a, b) => a.dating.acad!.start - b.dating.acad!.start);
    return pack(sorted, (p) => {
      const s = p.dating.acad!;
      const a = yearToX(s.start), b = yearToX(s.end ?? s.start);
      const cx = (a + b) / 2, tw = textW(L(p.name), PERSON_FS) / 2;
      return [Math.min(a, b, cx - tw) - 0.4, Math.max(a, b, cx + tw) + 0.4];
    }, PEOPLE_ROWS);
  }, []);
  return <group>{people.map((p) => <Capsule key={p.id} person={p} row={rows.get(p) ?? 0} />)}</group>;
}

function capsuleShape(w: number, h: number) {
  const r = Math.min(h / 2, w / 2);
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, h / 2);
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return new THREE.ShapeGeometry(s, 8);
}

const Capsule = memo(function Capsule({ person, row }: { person: Person; row: number }) {
  const selected = useStore((s) => sameRef(s.selected, { type: 'person', id: person.id }));
  const s = person.dating.acad!;
  const a = yearToX(s.start), b = yearToX(s.end ?? s.start);
  const w = Math.max(0.5, Math.abs(b - a));
  const cx = (a + b) / 2;
  const z = Z.peopleFrom + row * PERSON_STEP;
  const geo = useMemo(() => capsuleShape(w, selected ? 0.75 : 0.56), [w, selected]);
  const color = POSTER.category[person.category];
  const ref = useLod(PERSON_LOD[person.importance], selected);
  const tip = `${L(person.name)} · ${formatSpan(s)} · ${CATEGORY_LABELS[person.category][lang]}`;
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); focusItem({ type: 'person', id: person.id }); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover(tip); },
    onPointerOut: () => hover(null),
  };
  return (
    <group>
      <mesh geometry={geo} rotation={FLAT_ROT} position={[cx, Y.mark, z]} {...handlers}>
        <meshBasicMaterial color={selected ? POSTER.selected : color} />
      </mesh>
      <group ref={ref}>
        {selected && (
          <mesh rotation={FLAT_ROT} position={[cx, Y.cell, z - 0.85]}>
            <planeGeometry args={[textW(L(person.name), PERSON_FS) + 0.8, 1.2]} />
            <meshBasicMaterial color={POSTER.highlight} />
          </mesh>
        )}
        <Text font={person.importance >= 4 ? FONT_BOLD : FONT_REGULAR} fontSize={PERSON_FS} anchorX="center" anchorY="bottom" rotation={FLAT_ROT} position={[cx, Y.text, z - 0.38]} color={POSTER.ink} outlineWidth={0.05} outlineColor={POSTER.paper} direction="auto" {...handlers}>
          {L(person.name)}
        </Text>
      </group>
    </group>
  );
});

/* ---------- the year axis ---------- */

const MAJOR = (y: number) => y % 500 === 0 || y === 1900 || y === 1950 || y === 2000;

function Axis() {
  const ticks = useMemo(() => tickYears(), []);
  const minorRef = useLod(260);
  const tick = (y: number, major: boolean) => {
    const x = yearToX(y);
    return (
      <group key={y}>
        <mesh rotation={FLAT_ROT} position={[x, Y.mark, Z.axis + (major ? 0.5 : 0.35)]}>
          <planeGeometry args={[major ? 0.14 : 0.08, major ? 1.0 : 0.7]} />
          <meshBasicMaterial color={POSTER.ink} />
        </mesh>
        <Text font={major ? FONT_BOLD : FONT_REGULAR} fontSize={major ? 1.15 : 0.8} color={POSTER.ink} anchorX="center" anchorY="top" rotation={FLAT_ROT} position={[x, Y.text, Z.axis + 1.2]} direction="auto" raycast={() => null}>
          {formatYearShort(y)}
        </Text>
        <Text font={FONT_REGULAR} fontSize={major ? 0.7 : 0.55} color={POSTER.trad} anchorX="center" anchorY="top" rotation={FLAT_ROT} position={[x, Y.text, Z.axis + (major ? 2.6 : 2.15)]} direction="auto" raycast={() => null}>
          {hebrewYear(y)}
        </Text>
      </group>
    );
  };
  return (
    <group>
      <mesh rotation={FLAT_ROT} position={[(xMin + xMax) / 2, Y.mark, Z.axis]} raycast={() => null}>
        <planeGeometry args={[xMax - xMin, 0.14]} />
        <meshBasicMaterial color={POSTER.ink} />
      </mesh>
      {ticks.filter(MAJOR).map((y) => tick(y, true))}
      <group ref={minorRef}>{ticks.filter((y) => !MAJOR(y)).map((y) => tick(y, false))}</group>
    </group>
  );
}

/* ---------- row titles at both ends of the sheet, poster style ---------- */

function RowTitles() {
  const lanes = useStore((s) => s.lanes);
  const mode = useStore((s) => s.mode);
  const rows: { z: number; text: string; show: boolean }[] = [
    { z: Z.peopleFrom + 1, text: t('lanePeople'), show: lanes.people },
    { z: Z.popBase - 9, text: t('laneTitleHistory'), show: lanes.history },
    { z: Z.popBase - 3, text: t('laneTitlePop'), show: lanes.demography },
    { z: Z.rule, text: t('laneTitleRule'), show: lanes.sovereignty },
    { z: Z.trad, text: t('tradDatingPrefix'), show: lanes.sovereignty && mode === 'both' },
    { z: Z.rabbinic, text: t('laneRabbinic'), show: lanes.rabbinic },
    { z: Z.era, text: t('laneEras'), show: lanes.eras },
    { z: Z.axis + 2, text: t('year'), show: true },
  ];
  // just beyond the start and the end of the time axis, reading outwards
  const ends: { x: number; anchor: 'left' | 'right' }[] = [
    { x: yearToX(YEAR_MIN) - DIR * 1.5, anchor: DIR > 0 ? 'right' : 'left' },
    { x: yearToX(YEAR_MAX) + DIR * 1.5, anchor: DIR > 0 ? 'left' : 'right' },
  ];
  return (
    <group>
      {ends.flatMap((end, i) =>
        rows.filter((r) => r.show).map((r) => (
          <Text key={`${i}-${r.text}`} font={FONT_BLACK} fontSize={1.1} color={POSTER.ink} anchorX={end.anchor} anchorY="middle" rotation={FLAT_ROT} position={[end.x, Y.text, r.z]} direction="auto" raycast={() => null}>
            {r.text}
          </Text>
        )),
      )}
    </group>
  );
}
