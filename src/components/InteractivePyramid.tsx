import { useState, useRef, useCallback } from 'react';
import type { NarrativePhase, SegmentConfig } from '../types/emotion';
import { useT } from '../i18n/useT';

const PHASE_DEFAULT_COLORS: Record<NarrativePhase, string> = {
  opening:    '#9ca3af',
  rising:     '#f59e0b',
  climax:     '#ef4444',
  resolution: '#3b82f6',
  coda:       '#8b5cf6',
};

const SVG_W = 420;
const SVG_H = 180;
const ZONE_CENTERS = [46, 124, 210, 296, 374]; // fixed x center per phase
const ZONE_HALF = 28;   // ±28px horizontal drag range → weight 1–5
const Y_TOP = 16;       // y when intensity = 100
const Y_BOT = 130;      // y when intensity = 0
const LABEL_Y = SVG_H - 12;


const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function intensityToY(i: number): number {
  return Y_TOP + (1 - clamp(i, 0, 100) / 100) * (Y_BOT - Y_TOP);
}
function yToIntensity(y: number): number {
  return Math.round(clamp((1 - (y - Y_TOP) / (Y_BOT - Y_TOP)) * 100, 0, 100));
}
function weightToXOff(w: number): number {
  return ZONE_HALF * 2 * (clamp(w, 1, 5) - 1) / 4 - ZONE_HALF;
}
function xToWeight(x: number, center: number): number {
  return Math.round(clamp(1 + (x - center + ZONE_HALF) / (ZONE_HALF * 2) * 4, 1, 5));
}

// Centripetal Catmull-Rom → cubic bezier (alpha=0.5)
// Guarantees no cusps or self-intersections regardless of node positions
function smoothCurve(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  const alpha = 0.5;
  const cl = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.pow(Math.hypot(b.x - a.x, b.y - a.y) || 0.001, alpha);

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const d01 = cl(p0, p1), d12 = cl(p1, p2), d23 = cl(p2, p3);
    // Tangent at p1
    const m1x = d12 * ((p1.x - p0.x) / d01 - (p2.x - p0.x) / (d01 + d12) + (p2.x - p1.x) / d12);
    const m1y = d12 * ((p1.y - p0.y) / d01 - (p2.y - p0.y) / (d01 + d12) + (p2.y - p1.y) / d12);
    // Tangent at p2
    const m2x = d12 * ((p2.x - p1.x) / d12 - (p3.x - p1.x) / (d12 + d23) + (p3.x - p2.x) / d23);
    const m2y = d12 * ((p2.y - p1.y) / d12 - (p3.y - p1.y) / (d12 + d23) + (p3.y - p2.y) / d23);
    d += ` C ${(p1.x + m1x / 3).toFixed(1)} ${(p1.y + m1y / 3).toFixed(1)}, ${(p2.x - m2x / 3).toFixed(1)} ${(p2.y - m2y / 3).toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}


interface Props {
  segmentConfigs: SegmentConfig[];
  onUpdate: (phase: NarrativePhase, patch: Partial<Omit<SegmentConfig, 'phase'>>) => void;
  onCommit?: (phase: NarrativePhase) => void;
  regeneratingPhase?: NarrativePhase | null;
}

interface DragState {
  phase: NarrativePhase;
  idx: number;
  svgX0: number; svgY0: number;
  nodeX0: number; nodeY0: number;
}

export function InteractivePyramid({ segmentConfigs, onUpdate, onCommit, regeneratingPhase }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const t = useT();

  const PHASE_META: Array<{ phase: NarrativePhase; label: string; color: string }> = [
    { phase: 'opening',    label: t.pyramidPhaseExp,        color: PHASE_DEFAULT_COLORS.opening },
    { phase: 'rising',     label: t.pyramidPhaseRising,     color: PHASE_DEFAULT_COLORS.rising },
    { phase: 'climax',     label: t.pyramidPhaseClimax,     color: PHASE_DEFAULT_COLORS.climax },
    { phase: 'resolution', label: t.pyramidPhaseFalling,    color: PHASE_DEFAULT_COLORS.resolution },
    { phase: 'coda',       label: t.pyramidPhaseDenouement, color: PHASE_DEFAULT_COLORS.coda },
  ];
  const [drag, setDrag] = useState<DragState | null>(null);
  // live visual positions during drag (smooth, unclamped to discrete)
  const [livePos, setLivePos] = useState<Record<string, { x: number; y: number }>>({});

  // Convert browser event coords → SVG space
  const toSVG = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width  * SVG_W,
      y: (clientY - rect.top)  / rect.height * SVG_H,
    };
  }, []);

  // Compute display position for a node (live during drag, or from config)
  const displayPos = useCallback((cfg: SegmentConfig, idx: number) => {
    if (livePos[cfg.phase]) return livePos[cfg.phase];
    return {
      x: ZONE_CENTERS[idx] + weightToXOff(cfg.lengthWeight),
      y: intensityToY(cfg.intensity),
    };
  }, [livePos]);

  const onNodeDown = (phase: NarrativePhase, idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const cfg = segmentConfigs[idx];
    const pt = toSVG(e.clientX, e.clientY);
    const np = displayPos(cfg, idx);
    setDrag({ phase, idx, svgX0: pt.x, svgY0: pt.y, nodeX0: np.x, nodeY0: np.y });
  };

  const onSVGMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    const pt = toSVG(e.clientX, e.clientY);
    const dx = pt.x - drag.svgX0;
    const dy = pt.y - drag.svgY0;
    const center = ZONE_CENTERS[drag.idx];

    const newX = clamp(drag.nodeX0 + dx, center - ZONE_HALF, center + ZONE_HALF);
    const newY = clamp(drag.nodeY0 + dy, Y_TOP, Y_BOT);

    setLivePos(prev => ({ ...prev, [drag.phase]: { x: newX, y: newY } }));

    onUpdate(drag.phase, {
      intensity:    yToIntensity(newY),
      lengthWeight: xToWeight(newX, center),
    });
  };

  const onSVGUp = () => {
    if (!drag) return;
    const committedPhase = drag.phase;
    setLivePos(prev => {
      const next = { ...prev };
      delete next[committedPhase];
      return next;
    });
    setDrag(null);
    onCommit?.(committedPhase);
  };

  // Build curve from current display positions
  const pts = segmentConfigs.map((cfg, i) => displayPos(cfg, i));
  const curve = smoothCurve(pts);
  const fill  = curve + ` L ${pts[pts.length - 1].x} ${Y_BOT + 6} L ${pts[0].x} ${Y_BOT + 6} Z`;

  return (
    <div>
      {/* Legend: drag hint */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9.5, color: '#b0b7c3', letterSpacing: '0.03em' }}>{t.pyramidIntensityArrow}</span>
        <span style={{ fontSize: 9.5, color: '#b0b7c3', letterSpacing: '0.03em' }}>{t.pyramidLengthArrow}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`-10 0 ${SVG_W + 20} ${SVG_H}`}
        style={{ width: '100%', height: 160, display: 'block', userSelect: 'none', cursor: drag ? 'grabbing' : 'default' }}
        onMouseMove={onSVGMove}
        onMouseUp={onSVGUp}
        onMouseLeave={onSVGUp}
      >
        <defs>
          {/* Spectral gradient through the 5 phase colors, left→right */}
          <linearGradient id="curveGrad" gradientUnits="userSpaceOnUse" x1="-10" y1="0" x2="430" y2="0">
            <stop offset="10%" stopColor="#9ca3af" />
            <stop offset="28%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="72%" stopColor="#3b82f6" />
            <stop offset="90%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="fillGrad" gradientUnits="userSpaceOnUse" x1="-10" y1="0" x2="430" y2="0">
            <stop offset="10%" stopColor="#9ca3af" stopOpacity="0.18" />
            <stop offset="28%" stopColor="#f59e0b" stopOpacity="0.13" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.13" />
            <stop offset="72%" stopColor="#3b82f6" stopOpacity="0.13" />
            <stop offset="90%" stopColor="#8b5cf6" stopOpacity="0.18" />
          </linearGradient>
          {/* Glow blur layer for the curve */}
          <filter id="curveGlow" x="-2%" y="-40%" width="104%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Ambient glow for nodes */}
          <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = intensityToY(v);
          return (
            <g key={v}>
              <line x1={0} y1={y} x2={SVG_W} y2={y}
                stroke={v === 50 ? '#ebebeb' : '#f5f5f5'}
                strokeWidth="1" strokeDasharray={v === 50 ? '4 4' : undefined} />
              <text x={SVG_W - 2} y={y - 2} fontSize="7" fill="#d1d5db" textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* Spectral fill */}
        <path d={fill} fill="url(#fillGrad)" stroke="none" />
        {/* Glow layer behind curve */}
        <path d={curve} fill="none" stroke="url(#curveGrad)" strokeWidth="6" strokeLinejoin="round" opacity="0.22" filter="url(#curveGlow)" />
        {/* Curve */}
        <path d={curve} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Phase label baseline */}
        <line x1={0} y1={LABEL_Y - 6} x2={SVG_W} y2={LABEL_Y - 6} stroke="#f0f0f0" strokeWidth="1" />

        {/* Nodes */}
        {segmentConfigs.map((cfg, idx) => {
          const meta      = PHASE_META[idx];
          const pos       = displayPos(cfg, idx);
          const isDrag    = drag?.phase === cfg.phase;
          const isRegen   = regeneratingPhase === cfg.phase;
          const labelAbove = pos.y > LABEL_Y - 30;

          return (
            <g key={cfg.phase}
              onMouseDown={e => onNodeDown(cfg.phase, idx, e)}
              style={{ cursor: isDrag ? 'grabbing' : 'grab' }}
            >
              {/* X-range guide when dragging */}
              {isDrag && (
                <rect
                  x={ZONE_CENTERS[idx] - ZONE_HALF} y={Y_TOP - 4}
                  width={ZONE_HALF * 2} height={Y_BOT - Y_TOP + 8}
                  fill={meta.color} opacity={0.05} rx={4}
                />
              )}

              {/* Vertical connector to baseline */}
              <line x1={pos.x} y1={pos.y + 7} x2={pos.x} y2={LABEL_Y - 8}
                stroke={meta.color} strokeWidth="1" opacity={isDrag ? 0.55 : 0.22}
                strokeDasharray="2 3" />

              {/* Permanent ambient glow */}
              <circle cx={pos.x} cy={pos.y} r={13}
                fill={meta.color} opacity={isDrag ? 0.20 : 0.09}
                filter="url(#nodeGlow)" />

              {/* Regen pulse */}
              {isRegen && (
                <circle cx={pos.x} cy={pos.y} r={13} fill="none" stroke={meta.color} strokeWidth="1.5" opacity="0.5">
                  <animate attributeName="r" values="9;16;9" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node — white fill with phase-tinted center */}
              <circle cx={pos.x} cy={pos.y} r={7}
                fill={isDrag ? meta.color : '#fff'}
                stroke={meta.color}
                strokeWidth={isDrag ? 2.5 : 2}
              />
              {!isDrag && (
                <circle cx={pos.x} cy={pos.y} r={3}
                  fill={meta.color} opacity={0.45} />
              )}

              {/* Phase label at baseline */}
              <text x={ZONE_CENTERS[idx]} y={LABEL_Y}
                textAnchor="middle" fontSize="10"
                fill={isDrag ? meta.color : '#9ca3af'}
                fontWeight={isDrag ? 700 : 500}
                fontFamily="system-ui, sans-serif"
              >
                {meta.label}
              </text>

              {/* Value tooltip while dragging */}
              {isDrag && (
                <g>
                  <rect
                    x={pos.x - 27} y={labelAbove ? pos.y + 12 : pos.y - 32}
                    width={54} height={18} rx={5}
                    fill={meta.color}
                  />
                  <text
                    x={pos.x} y={labelAbove ? pos.y + 24 : pos.y - 20}
                    textAnchor="middle" fontSize="9" fill="#fff" fontWeight={700}
                    fontFamily="system-ui, sans-serif"
                  >
                    {cfg.intensity} · {cfg.lengthWeight}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Current values row */}
      <div style={{ display: 'flex', marginTop: 6, alignItems: 'stretch' }}>
        {/* Row labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', marginRight: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#b0b7c3', letterSpacing: '0.04em', lineHeight: '24px' }}>{t.pyramidIntensity}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#b0b7c3', letterSpacing: '0.04em', lineHeight: '17px' }}>{t.pyramidLength}</span>
        </div>
        {/* Phase columns */}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between' }}>
          {segmentConfigs.map((cfg, i) => {
            const meta = PHASE_META[i];
            return (
              <div key={cfg.phase} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>{cfg.intensity}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(w => (
                    <div key={w} style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: w <= cfg.lengthWeight ? meta.color : '#e5e7eb',
                    }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
