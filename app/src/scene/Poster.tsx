/**
 * The timeline as an infographic poster, for both 2D and 3D.
 *
 * The sheet (smaller z is higher on the sheet):
 *   board (above the hinge at the chart's baseline): population area chart, and the events as
 *     bullets and labels placed just above it with dotted leaders;
 *   floor: rule over the Land of Israel, rabbinic eras, eras, the year axis, and below it the
 *     people as lifespan capsules.
 *
 * 2D: everything lies flat, seen from straight above. 3D: like a pop-up book, the board swings up
 * to stand behind the rows, the cells rise as tiles and the capsules as raised bars. The change is
 * animated by `lift` (lib/dim.ts).
 */
import { Edges, Line, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { HistoryEvent, ItemRef, Person } from '../data/types';
import { L, lang, t } from '../i18n';
import {
  CATEGORY_LABELS, datingsDiffer, eras, events, ghostSpan, isTradOnly, KIND_LABELS, mainSpan, nearestPopPoint, people, population,
  popIsrael, popMax, popTotal, POP_FROM, POP_TO, rabbinicEras, rulers,
} from '../lib/data';
import { formatMillions, formatSpan, formatYear, formatYearShort, hebrewYear } from '../lib/dates';
import { lift, view } from '../lib/dim';
import { focusItem } from '../lib/focus';
import { BOARD_TILT, chartTopAt, eventAnchorZ, POP_K, POSTER_Z } from '../lib/poster';
import { DIR, tickYears, uToYear, xToYear, yearToU, yearToX, YEAR_MAX, YEAR_MIN } from '../lib/timeScale';
import { sameRef, useStore } from '../store';
import { FONT_BLACK, FONT_BOLD, FONT_REGULAR, POSTER } from './constants';

const Z = POSTER_Z;
/** depth (along z) of each row's cells, and how tall they rise in 3D */
const ROW = {
  era: { d: 2.4, h: 0.5 },
  rabbinic: { d: 2.2, h: 0.7 },
  trad: { d: 1.8, h: 0.15 },
  rule1: { d: 1.8, h: 0.6 },
  rule: { d: 3, h: 0.9 },
  ruleJewish: { h: 1.8 },
};
const PERSON_STEP = 1.95;
const PEOPLE_ROWS = 10;
const PERSON_RISE = 0.45;
const SHEET_BOTTOM = Z.peopleFrom + PEOPLE_ROWS * PERSON_STEP + 2;
const FLAT_ROT: [number, number, number] = [-Math.PI / 2, 0, 0];
/** how far the chart stands out of the board, and the Land-of-Israel share out of the chart */
const CHART_RELIEF = 0.6, ISRAEL_RELIEF = 0.35;

/** Small heights above the sheet, so flat layers don't z-fight. */
const Y = { tint: 0.01, cell: 0.04, line: 0.1, mark: 0.12, text: 0.16 };

export function Poster() {
  const lanes = useStore((s) => s.lanes);
  useLiftDriver();
  return (
    <group>
      <Floor />
      {lanes.eras && <EraTints from={Z.popBase} to={SHEET_BOTTOM} />}
      <Axis />
      {lanes.eras && <EraRow />}
      {lanes.rabbinic && <RabbinicRow />}
      {lanes.sovereignty && <RuleRows />}
      {lanes.people && <PeopleRows />}
      <RowTitles part="floor" />
      <Board>
        <BoardSheet />
        {lanes.eras && <EraTints from={Z.boardTop} to={Z.popBase} />}
        {lanes.demography && <PopulationChart />}
        {lanes.history && <EventRows />}
        <RowTitles part="board" />
      </Board>
    </group>
  );
}

/* ---------- 2D <-> 3D animation ---------- */

function useLiftDriver() {
  useFrame((_, dt) => {
    const d = lift.target - lift.value;
    lift.value = Math.abs(d) < 0.002 ? lift.target : lift.value + d * Math.min(1, dt * 3.2);
  });
}

/** The upper half of the sheet, hinged at the chart's baseline: flat in 2D, standing in 3D. */
function Board({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = lift.value * BOARD_TILT;
  });
  return (
    <group ref={ref} position={[0, 0, Z.popBase]}>
      <group position={[0, 0, -Z.popBase]}>{children}</group>
    </group>
  );
}

/**
 * Something that rises `h` out of the floor in 3D: the solid is scaled in height, and the group
 * holding its top-face labels follows the top.
 */
function useRise(h: number) {
  const solid = useRef<THREE.Object3D>(null);
  const top = useRef<THREE.Group>(null);
  useFrame(() => {
    const s = h * Math.max(lift.value, 0.03);
    if (solid.current) solid.current.scale.y = s;
    if (top.current) top.current.position.y = s;
  });
  return { solid, top };
}

/* ---------- shared bits ---------- */

const x0All = yearToX(YEAR_MIN), x1All = yearToX(YEAR_MAX);
const xMin = Math.min(x0All, x1All), xMax = Math.max(x0All, x1All);

function Floor() {
  return (
    <mesh rotation={FLAT_ROT} position={[(xMin + xMax) / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[xMax - xMin + 400, 400]} />
      <meshBasicMaterial color={POSTER.paper} />
    </mesh>
  );
}

/** The board's own sheet of paper (it must still be there when the board stands up). */
function BoardSheet() {
  const w = xMax - xMin + 6;
  const top = Z.boardTop, bottom = Z.popBase;
  const frame: [number, number, number][] = [[xMin - 3, Y.line, bottom], [xMin - 3, Y.line, top], [xMax + 3, Y.line, top], [xMax + 3, Y.line, bottom]];
  return (
    <group>
      <mesh rotation={FLAT_ROT} position={[(xMin + xMax) / 2, -0.03, (top + bottom) / 2]} raycast={() => null}>
        <planeGeometry args={[w, bottom - top]} />
        <meshBasicMaterial color={POSTER.paper} side={THREE.DoubleSide} />
      </mesh>
      <Line points={frame} color={POSTER.grid} lineWidth={1} />
    </group>
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

/** Show a group only while the camera is close enough. */
function useLod(maxDist: number, always = false) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = always || view.dist < maxDist;
  });
  return ref;
}

interface CellProps {
  x0: number; x1: number; z: number; d: number; h: number;
  fill: string; label: string; sub?: string;
  textColor?: string; bold?: boolean; selected?: boolean; gold?: boolean;
  onClick?: () => void; tip?: string;
}

/** A bordered cell in one of the period rows; a tile that rises out of the floor in 3D. */
const Cell = memo(function Cell({ x0, x1, z, d, h, fill, label, sub, textColor = POSTER.ink, bold, selected, gold, onClick, tip }: CellProps) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1);
  const w = Math.max(0.05, b - a);
  const cx = (a + b) / 2;
  const fs = THREE.MathUtils.clamp((w - 0.3) / Math.max(2, label.length * 0.56), 0.3, d * 0.36);
  const showLabel = w > 1.1;
  const geo = useMemo(() => new THREE.BoxGeometry(Math.max(0.02, w - 0.04), 1, d).translate(0, 0.5, 0), [w, d]);
  const { solid, top } = useRise(h);
  return (
    <group>
      <mesh
        ref={solid}
        geometry={geo}
        position={[cx, 0, z]}
        onClick={onClick && ((e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(); })}
        onPointerOver={tip ? (e) => { e.stopPropagation(); hover(tip); } : undefined}
        onPointerOut={tip ? () => hover(null) : undefined}
      >
        <meshStandardMaterial color={selected ? POSTER.highlight : fill} roughness={0.85} />
        <Edges color={selected ? POSTER.selected : POSTER.rule} />
      </mesh>
      <group ref={top}>
        {gold && (
          <mesh rotation={FLAT_ROT} position={[cx, 0.02, z - d / 2 + 0.14]} raycast={() => null}>
            <planeGeometry args={[w - 0.04, 0.28]} />
            <meshBasicMaterial color="#e3b12f" />
          </mesh>
        )}
        {showLabel && (
          <Text
            font={bold ? FONT_BOLD : FONT_REGULAR}
            fontSize={fs}
            maxWidth={w - 0.2}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            rotation={FLAT_ROT}
            position={[cx, 0.04, z - (sub && d > 2 ? fs * 0.35 : 0)]}
            color={textColor}
            direction="auto"
            raycast={() => null}
          >
            {label}
          </Text>
        )}
        {showLabel && sub && d > 2 && w > 4 && (
          <Text font={FONT_REGULAR} fontSize={Math.min(0.5, fs * 0.58)} anchorX="center" anchorY="middle" rotation={FLAT_ROT} position={[cx, 0.04, z + fs * 0.55]} color={POSTER.inkSoft} direction="auto" raycast={() => null}>
            {sub}
          </Text>
        )}
      </group>
    </group>
  );
});

/* ---------- eras: faint tints across the sheet, and a row of cells above the axis ---------- */

function EraTints({ from, to }: { from: number; to: number }) {
  const mode = useStore((s) => s.mode);
  return (
    <group>
      {eras.map((era) => {
        const s = mainSpan(era.dating, mode);
        const a = yearToX(s.start), b = yearToX(s.end!);
        return (
          <mesh key={era.id} rotation={FLAT_ROT} position={[(a + b) / 2, Y.tint, (from + to) / 2]} raycast={() => null}>
            <planeGeometry args={[Math.abs(b - a), Math.abs(to - from)]} />
            <meshBasicMaterial color={era.color} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
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
            x0={yearToX(s.start)} x1={yearToX(s.end!)} z={Z.era} d={ROW.era.d} h={ROW.era.h}
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
            x0={yearToX(s.start)} x1={yearToX(s.end ?? s.start)} z={Z.rabbinic} d={ROW.rabbinic.d} h={ROW.rabbinic.h}
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
            x0={yearToX(s.start)} x1={yearToX(s.end ?? s.start + 1)}
            z={row1 ? Z.rule1 : Z.rule} d={row1 ? ROW.rule1.d : ROW.rule.d}
            // Jewish sovereignty or self-rule stands taller, with a gold edge
            h={r.jewish ? ROW.ruleJewish.h : row1 ? ROW.rule1.h : ROW.rule.h}
            fill={POSTER.power[r.power] ?? '#d8d8d8'} label={L(r.title)} sub={formatSpan(s)}
            bold={r.jewish} gold={r.jewish}
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
            x0={yearToX(r.dating.trad!.start)} x1={yearToX(r.dating.trad!.end ?? r.dating.trad!.start + 1)} z={Z.trad} d={ROW.trad.d} h={ROW.trad.h}
            fill="#f7efe2" label={L(r.title)} textColor={POSTER.trad}
            tip={`${t('tradDatingPrefix')} · ${L(r.title)} · ${formatSpan(r.dating.trad!)}`}
          />
        ))}
    </group>
  );
}

/* ---------- population: an area chart on the board, standing out of it in 3D ---------- */

/** Area between the baseline and fn(year), at height y above the board. */
function areaGeometry(fn: (year: number) => number, y: number, step = 0.5) {
  const u0 = yearToU(POP_FROM), u1 = yearToU(POP_TO);
  const pos: number[] = [];
  const idx: number[] = [];
  let n = 0;
  for (let u = u0; ; u = Math.min(u1, u + step)) {
    const x = DIR * u;
    pos.push(x, y, Z.popBase, x, y, Z.popBase - POP_K * Math.max(0, fn(uToYear(u))));
    if (n > 0) { const a = 2 * (n - 1); idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    n++;
    if (u >= u1) break;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** The chart's top edge as a wall from y0 to y1: its relief, seen when the board stands. */
function edgeGeometry(fn: (year: number) => number, y0: number, y1: number, step = 0.5) {
  const u0 = yearToU(POP_FROM), u1 = yearToU(POP_TO);
  const pos: number[] = [];
  const idx: number[] = [];
  let n = 0;
  for (let u = u0; ; u = Math.min(u1, u + step)) {
    const x = DIR * u, z = Z.popBase - POP_K * Math.max(0, fn(uToYear(u)));
    pos.push(x, y0, z, x, y1, z);
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
  const geo = useMemo(() => {
    const yW = CHART_RELIEF, yI = CHART_RELIEF + ISRAEL_RELIEF;
    return {
      range: areaGeometry(popMax, 0.05, 1),
      world: areaGeometry(popTotal, yW),
      worldEdge: edgeGeometry(popTotal, 0, yW),
      israel: areaGeometry(popIsrael, yI, 0.4),
      israelEdge: edgeGeometry(popIsrael, yW, yI, 0.4),
    };
  }, []);
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
      <mesh geometry={geo.range} raycast={() => null}>
        <meshBasicMaterial color={POSTER.worldRange} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.world} onPointerMove={onMove} onPointerOut={() => hover(null)} onClick={onClick}>
        <meshBasicMaterial color={POSTER.world} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.worldEdge} raycast={() => null}>
        <meshBasicMaterial color="#c97a12" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.israel} raycast={() => null}>
        <meshBasicMaterial color={POSTER.israel} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo.israelEdge} raycast={() => null}>
        <meshBasicMaterial color="#1d4fa3" side={THREE.DoubleSide} />
      </mesh>
      <Line points={[[xa, CHART_RELIEF + ISRAEL_RELIEF + 0.02, Z.popBase], [xb, CHART_RELIEF + ISRAEL_RELIEF + 0.02, Z.popBase]]} color={POSTER.rule} lineWidth={1.5} />
      <group ref={labelsRef}>
        {population.filter((p) => POP_LABEL_YEARS.has(p.year)).map((p) => (
          <Text key={p.year} font={FONT_BOLD} fontSize={POP_LABEL_FS} color="#a35a06" outlineWidth={0.05} outlineColor={POSTER.paper} anchorX="center" anchorY="bottom" rotation={FLAT_ROT} position={[yearToX(p.year), CHART_RELIEF + 0.1, Z.popBase - POP_K * p.total - 0.25]} direction="auto" raycast={() => null}>
            {popLabel(p.total)}
          </Text>
        ))}
      </group>
    </group>
  );
}

/* ---------- events: bullet, title and date just above the chart, with a dotted leader down to it ---------- */

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
    eventAnchorZ.set(e.id, z);
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
  const year = mainSpan(event.dating, mode).start;
  const x = yearToX(year);
  const fs = EVENT_FS * (event.importance >= 4 ? 1.15 : 1);
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
      {/* a bead pinned to the board: a dot from above, a knob standing out of the board in 3D */}
      <mesh position={[x, 0.3, z + 1.05]} {...handlers}>
        <sphereGeometry args={[selected ? 0.45 : 0.32, 18, 12]} />
        <meshStandardMaterial color={selected ? POSTER.selected : color} roughness={0.45} emissive={selected ? POSTER.selected : color} emissiveIntensity={0.35} />
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

/* ---------- people: lifespan capsules below the axis, raised bars in 3D ---------- */

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

/** A rounded bar w long and d deep, rising one unit (scaled to its height by useRise). */
function capsuleGeometry(w: number, d: number) {
  const r = Math.min(d / 2, w / 2);
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, d / 2);
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 8 }).rotateX(-Math.PI / 2);
}

const Capsule = memo(function Capsule({ person, row }: { person: Person; row: number }) {
  const selected = useStore((s) => sameRef(s.selected, { type: 'person', id: person.id }));
  const s = person.dating.acad!;
  const a = yearToX(s.start), b = yearToX(s.end ?? s.start);
  const w = Math.max(0.5, Math.abs(b - a));
  const cx = (a + b) / 2;
  const z = Z.peopleFrom + row * PERSON_STEP;
  const geo = useMemo(() => capsuleGeometry(w, selected ? 0.75 : 0.56), [w, selected]);
  const color = POSTER.category[person.category];
  const ref = useLod(PERSON_LOD[person.importance], selected);
  const { solid, top } = useRise(PERSON_RISE);
  const tip = `${L(person.name)} · ${formatSpan(s)} · ${CATEGORY_LABELS[person.category][lang]}`;
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); focusItem({ type: 'person', id: person.id }); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover(tip); },
    onPointerOut: () => hover(null),
  };
  return (
    <group>
      <mesh ref={solid} geometry={geo} position={[cx, 0, z]} {...handlers}>
        <meshStandardMaterial color={selected ? POSTER.selected : color} roughness={0.5} />
      </mesh>
      <group ref={top}>
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

function RowTitles({ part }: { part: 'board' | 'floor' }) {
  const lanes = useStore((s) => s.lanes);
  const mode = useStore((s) => s.mode);
  const rows: { z: number; text: string; show: boolean; board?: boolean }[] = [
    { z: Z.popBase - 9, text: t('laneTitleHistory'), show: lanes.history, board: true },
    { z: Z.popBase - 3, text: t('laneTitlePop'), show: lanes.demography, board: true },
    { z: Z.peopleFrom + 1, text: t('lanePeople'), show: lanes.people },
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
        rows.filter((r) => r.show && !!r.board === (part === 'board')).map((r) => (
          <Text key={i + r.text} font={FONT_BLACK} fontSize={1.1} color={POSTER.ink} anchorX={end.anchor} anchorY="middle" rotation={FLAT_ROT} position={[end.x, part === 'board' ? 1 : Y.text, r.z]} direction="auto" raycast={() => null}>
            {r.text}
          </Text>
        )),
      )}
    </group>
  );
}
