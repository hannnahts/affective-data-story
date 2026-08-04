import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, ReferenceArea,
} from 'recharts';
import type { DataPoint, VisualProps, ChartAnnotation } from '../types/emotion';

interface Props {
  data: DataPoint[];
  visualProps: VisualProps;
  annotations?: ChartAnnotation[];
  activeRange?: [number, number] | null;
  hoveredRange?: [number, number] | null;
  xLabel?: string;
  yLabel?: string;
  yColumns?: string[];
}

const SERIES_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

const DASH_BY_FORM: Record<string, string> = {
  smooth:  '0',
  flat:    '0',
  jagged:  '7 4',
  spike:   '10 3 2 3',
};

const DOT_STYLE: Record<string, (color: string) => { r: number; fill: string; stroke: string; strokeWidth: number }> = {
  peak:       (c) => ({ r: 6,  fill: c,     stroke: '#fff', strokeWidth: 2 }),
  trough:     (c) => ({ r: 6,  fill: '#fff', stroke: c,     strokeWidth: 2.5 }),
  anomaly:    (c) => ({ r: 8,  fill: c,     stroke: c,     strokeWidth: 4 }),
  inflection: (c) => ({ r: 4,  fill: c,     stroke: '#fff', strokeWidth: 1.5 }),
};

const LEGEND_ITEMS: { type: ChartAnnotation['type']; symbol: string; label: string }[] = [
  { type: 'peak',       symbol: '●', label: 'Peak'    },
  { type: 'trough',     symbol: '○', label: 'Low'     },
  { type: 'anomaly',    symbol: '◎', label: 'Anomaly' },
  { type: 'inflection', symbol: '•', label: 'Shift'   },
];

function PulsingDotShape({ cx, cy, fill }: { cx?: number; cy?: number; fill: string }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={fill} />
      <circle cx={cx} cy={cy} r={5} fill={fill} style={{
        animation: 'pulseRing 1.4s ease-out infinite',
        transformBox: 'fill-box',
        transformOrigin: 'center',
      }} />
    </g>
  );
}

export function EmotionChart({ data, visualProps, annotations = [], activeRange, hoveredRange, xLabel, yLabel, yColumns }: Props) {
  const [showAnnotations, setShowAnnotations] = useState(false);
  const { primaryHex, strokeWeight, chartForm, fillOpacity } = visualProps;
  const isArea = chartForm === 'smooth' || chartForm === 'flat';
  const curveType = isArea ? 'monotone' : 'linear';
  const strokeDasharray = DASH_BY_FORM[chartForm] ?? '0';

  // Determine which series keys to render
  const seriesKeys = yColumns && yColumns.length > 0 ? yColumns : ['value'];
  const isMulti = seriesKeys.length > 1;

  const seriesColor = (idx: number) =>
    idx === 0 ? primaryHex : SERIES_COLORS[(idx - 1) % SERIES_COLORS.length];

  const yAxisWidth = !isMulti && yLabel ? 82 : 38;

  const commonProps = {
    data,
    margin: { top: 16, right: 48, left: 0, bottom: xLabel ? 32 : 8 },
  };

  const axisStyle = { fontSize: 11, fill: '#9ca3af' };
  const axisLabelStyle = { fontSize: 10, fill: '#9ca3af' };
  const gridStyle = { stroke: '#f3f4f6', strokeWidth: 0.5 };
  const tooltipStyle = { fontSize: 12, borderRadius: 6, border: '0.5px solid #e5e7eb' };

  const xAxisLabel = xLabel ? { value: xLabel, position: 'insideBottom' as const, offset: -10, ...axisLabelStyle } : undefined;
  const yAxisLabel = (!isMulti && yLabel) ? { value: yLabel, angle: -90, position: 'insideLeft' as const, offset: 8, ...axisLabelStyle } : undefined;

  const validAnnotations = (showAnnotations ? annotations : []).filter(a => a.index >= 0 && a.index < data.length);

  const rangeHighlight = activeRange && data[activeRange[0]] && data[activeRange[1]]
    ? (
      <ReferenceArea
        x1={data[activeRange[0]].month}
        x2={data[activeRange[1]].month}
        fill={primaryHex}
        fillOpacity={0.12}
        stroke={primaryHex}
        strokeOpacity={0.3}
        strokeWidth={1}
      />
    ) : null;

  const midIdx = hoveredRange ? Math.round((hoveredRange[0] + hoveredRange[1]) / 2) : null;
  const hoverHighlight = hoveredRange && data[hoveredRange[0]] && data[hoveredRange[1]]
    ? (
      <ReferenceArea
        x1={data[hoveredRange[0]].month}
        x2={data[hoveredRange[1]].month}
        fill={primaryHex}
        fillOpacity={0.18}
        stroke={primaryHex}
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
    ) : null;
  const hoverDot = midIdx !== null && data[midIdx]
    ? (
      <ReferenceDot
        x={data[midIdx].month}
        y={data[midIdx].value}
        r={0}
        shape={<PulsingDotShape fill={primaryHex} />}
      />
    ) : null;

  const dots = validAnnotations.map(a => {
    const style = (DOT_STYLE[a.type] ?? DOT_STYLE.inflection)(a.color);
    const position =
      a.index < data.length * 0.2  ? 'right' :
      a.index >= data.length * 0.75 ? 'left'  : 'top';
    return (
      <ReferenceDot
        key={a.index}
        x={data[a.index].month}
        y={data[a.index].value}
        {...style}
        label={{ value: a.label, position, fontSize: 10, fill: a.color }}
      />
    );
  });

  const usedTypes = new Set(validAnnotations.map(a => a.type));
  const legendItems = LEGEND_ITEMS.filter(l => usedTypes.has(l.type));

  const areaSeriesEl = seriesKeys.map((key, idx) => {
    const color = seriesColor(idx);
    return (
      <Area
        key={key}
        type={curveType}
        dataKey={key}
        name={key}
        stroke={color}
        strokeWidth={strokeWeight}
        strokeDasharray={strokeDasharray}
        fill={color}
        fillOpacity={isMulti ? Math.min(fillOpacity, 0.10) : fillOpacity}
        dot={isMulti ? false : { fill: color, r: 3, strokeWidth: 1.5, stroke: '#fff' }}
        isAnimationActive
        animationEasing="ease-out"
        animationDuration={800}
      />
    );
  });

  const lineSeriesEl = seriesKeys.map((key, idx) => {
    const color = seriesColor(idx);
    return (
      <Line
        key={key}
        type={curveType}
        dataKey={key}
        name={key}
        stroke={color}
        strokeWidth={strokeWeight}
        strokeDasharray={strokeDasharray}
        dot={isMulti ? false : { fill: color, r: 3, strokeWidth: 1.5, stroke: '#fff' }}
        isAnimationActive
        animationEasing="ease-out"
        animationDuration={800}
      />
    );
  });

  return (
    <div>
      <style>{`@keyframes pulseRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(3.2);opacity:0}}`}</style>
      <ResponsiveContainer width="100%" height={190}>
        {isArea ? (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} label={xAxisLabel} />
            <YAxis width={yAxisWidth} tick={axisStyle} axisLine={false} tickLine={false} label={yAxisLabel} />
            <Tooltip contentStyle={tooltipStyle} />
            {areaSeriesEl}
            {hoverHighlight}
            {rangeHighlight}
            {!isMulti && hoverDot}
            {!isMulti && dots}
          </AreaChart>
        ) : (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" {...gridStyle} />
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} label={xAxisLabel} />
            <YAxis width={yAxisWidth} tick={axisStyle} axisLine={false} tickLine={false} label={yAxisLabel} />
            <Tooltip contentStyle={tooltipStyle} />
            {lineSeriesEl}
            {hoverHighlight}
            {rangeHighlight}
            {!isMulti && hoverDot}
            {!isMulti && dots}
          </LineChart>
        )}
      </ResponsiveContainer>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingLeft: 2 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isMulti && seriesKeys.map((key, idx) => (
            <span key={key} style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: seriesColor(idx), display: 'inline-block' }} />
              {key}
            </span>
          ))}
          {!isMulti && showAnnotations && legendItems.map(l => (
            <span key={l.type} style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 12 }}>{l.symbol}</span>
              {l.label}
            </span>
          ))}
        </div>
        {!isMulti && annotations.length > 0 && (
          <button
            onClick={() => setShowAnnotations(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
              fontSize: 11, fontWeight: 500, transition: 'all 0.15s',
              border: showAnnotations ? `1px solid ${primaryHex}` : '1px solid #e5e7eb',
              background: showAnnotations ? `${primaryHex}15` : '#f9fafb',
              color: showAnnotations ? primaryHex : '#9ca3af',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: showAnnotations ? primaryHex : '#d1d5db',
            }} />
            Annotations
          </button>
        )}
      </div>
    </div>
  );
}
