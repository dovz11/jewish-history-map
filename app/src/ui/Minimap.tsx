import { useMemo, useRef } from 'react';
import { eras, events, mainSpan, popTotal, POP_FROM, POP_TO, KIND_COLORS } from '../lib/data';
import { formatYearShort } from '../lib/dates';
import { DIR, U_MAX, uToYear, yearToU } from '../lib/timeScale';
import { useStore } from '../store';

const H = 54;
const LABELS = [-3500, -2000, -1000, -500, 0, 500, 1000, 1500, 1800, 1900, 1950, 2000];

/** SVG x for a corridor distance u: the past is on the right (RTL). */
const sx = (u: number) => U_MAX - u;

/** Overview strip of the whole timeline; click or drag to travel. */
export function Minimap() {
  const mode = useStore((s) => s.mode);
  const viewX = useStore((s) => s.viewX);
  const halfW = useStore((s) => s.viewHalfWidth);
  const view = useStore((s) => s.view);
  const globeYear = useStore((s) => s.globeYear);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const popPath = useMemo(() => {
    const pts: string[] = [];
    const u0 = yearToU(POP_FROM), u1 = yearToU(POP_TO);
    for (let u = u0; u <= u1; u += 2) pts.push(`${sx(u).toFixed(1)},${(H - 4 - popTotal(uToYear(u)) * 1.6).toFixed(1)}`);
    return `M${sx(u0)},${H - 4} L${pts.join(' L')} L${sx(u1)},${H - 4} Z`;
  }, []);

  const travel = (clientX: number) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const u = U_MAX - ((clientX - r.left) / r.width) * U_MAX;
    const st = useStore.getState();
    if (st.view === 'globe') {
      st.setPlaying(false);
      st.setGlobeYear(Math.round(uToYear(u)));
    } else st.flyTo(DIR * u, { dist: 60 });
  };

  const vu = viewX / DIR;
  return (
    <nav className="minimap" aria-label="מפת ציר הזמן">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${U_MAX} ${H}`}
        preserveAspectRatio="none"
        onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); travel(e.clientX); }}
        onPointerMove={(e) => dragging.current && travel(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
      >
        {eras.map((era) => {
          const s = mainSpan(era.dating, mode);
          const a = sx(yearToU(s.start)), b = sx(yearToU(s.end!));
          return <rect key={era.id} x={Math.min(a, b)} y={0} width={Math.abs(a - b)} height={H} fill={era.color} opacity={0.6}><title>{era.title.he}</title></rect>;
        })}
        <path d={popPath} fill="#3d78b8" opacity={0.55} />
        {events.map((e) => {
          const x = sx(yearToU(mainSpan(e.dating, mode).start));
          return <rect key={e.id} x={x - 0.4} y={4} width={0.8} height={4 + e.importance * 2.4} fill={KIND_COLORS[e.kind]} />;
        })}
        {view === 'globe' ? (
          <rect className="needle" x={sx(yearToU(globeYear)) - 1.2} y={0} width={2.4} height={H} />
        ) : (
          <rect className="viewport" x={sx(vu + halfW)} y={1} width={Math.max(2, halfW * 2)} height={H - 2} rx={2} />
        )}
      </svg>
      <div className="minimap-labels">
        {LABELS.map((y) => (
          <span key={y} style={{ left: `${(sx(yearToU(y)) / U_MAX) * 100}%` }}>{formatYearShort(y)}</span>
        ))}
      </div>
    </nav>
  );
}
