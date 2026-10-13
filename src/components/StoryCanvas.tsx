import { useState, useMemo } from 'react';
import { useEmotionStore } from '../store/emotionStore';
import { EMOTION_META, MOCK_OUTPUTS } from '../data/mockData';
import { EmotionChart } from './EmotionChart';
import { useT } from '../i18n/useT';
import type { DataPoint, NarrativeSegment, NarrativePhase } from '../types/emotion';

// Pivots long-form data into wide format keyed by group column value

function pivotByGroup(data: DataPoint[], groupCol: string, yCol: string): { pivoted: DataPoint[]; groups: string[] } {
  const byX = new Map<string, DataPoint>();
  const groupSet = new Set<string>();

  for (const d of data) {
    const x = d.month;
    const group = String(d[groupCol] ?? '');
    const y = Number(d[yCol]) || 0;
    groupSet.add(group);

    if (!byX.has(x)) byX.set(x, { month: x, value: y });
    byX.get(x)![group] = y;
  }

  const groups = Array.from(groupSet).sort();
  const pivoted = Array.from(byX.entries())
    .sort((a, b) => {
      const na = parseFloat(a[0]), nb = parseFloat(b[0]);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a[0].localeCompare(b[0]);
    })
    .map(([, pt]) => pt);

  return { pivoted, groups };
}


const PHASE_COLORS: Record<NarrativePhase, string> = {
  opening:    '#9ca3af',
  rising:     '#f59e0b',
  climax:     '#ef4444',
  resolution: '#3b82f6',
  coda:       '#8b5cf6',
};

function LoadingSkeleton({ stage, stageLabels, processing }: { stage: string | null; stageLabels: Record<string, string>; processing: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }
        .sk { animation: pulse 1.4s ease-in-out infinite; background: #f0f0f0; border-radius: 6px; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .fade-in { animation: fadeIn 0.4s ease-out both; }
      `}</style>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: '12px 16px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9ca3af' }}>
          {stage ? stageLabels[stage] : processing}
        </p>
        {[80, 95, 70, 88].map((w, i) => (
          <div key={i} className="sk" style={{ height: 12, width: `${w}%`, marginBottom: 10, animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: '12px 16px' }}>
        <div className="sk" style={{ height: 160, width: '100%' }} />
      </div>
    </div>
  );
}


function SegmentCard({ seg, index, total, isActive, isRegenerating, onSelect, onHoverChange, phaseLabel }: {
  seg: NarrativeSegment; index: number; total: number; phaseLabel: string;
  isActive?: boolean; isRegenerating?: boolean; onSelect?: () => void; onHoverChange?: (h: boolean) => void;
}) {
  const color = PHASE_COLORS[seg.phase] ?? '#9ca3af';
  const phase = { label: phaseLabel, color };
  const isLast = index === total - 1;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      style={{
        display: 'flex', gap: 0,
        animation: 'fadeUpIn 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
        animationDelay: `${index * 0.07}s`,
        cursor: onSelect ? 'pointer' : 'default',
        borderRadius: 8,
        background: isActive ? `${phase.color}0d` : 'transparent',
        outline: isActive ? `1.5px solid ${phase.color}55` : 'none',
        transition: 'background 0.15s, outline 0.15s',
        margin: '0 -6px', padding: '0 6px',
      }}
    >
      {/* Timeline column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: phase.color,
          boxShadow: `0 0 0 3px ${phase.color}22`,
        }} />
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 24, background: '#f0f0f0', marginTop: 4, borderRadius: 1 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 4 : 20 }}>
        {/* Phase badge + emotion chip + intensity */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
            background: `${phase.color}1a`, color: phase.color,
          }}>
            {phase.label}
          </span>
        </div>
        {isRegenerating ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            <style>{`@keyframes shimmer{0%{opacity:.35}50%{opacity:.7}100%{opacity:.35}}`}</style>
            {[90, 100, 70].map((w, i) => (
              <div key={i} style={{
                height: 13, width: `${w}%`, borderRadius: 4, background: phase.color,
                opacity: 0.2, animation: `shimmer 1.2s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: '#374151', lineHeight: 1.9 }}>{seg.text}</p>
        )}
      </div>
    </div>
  );
}

function segmentHoverRange(
  segIdx: number | null,
  segments: NarrativeSegment[],
  dataLen: number,
): [number, number] | null {
  if (segIdx === null || segments.length === 0) return null;
  const seg = segments[segIdx];
  if (seg?.dataRange && seg.dataRange[0] >= 0 && seg.dataRange[1] < dataLen && seg.dataRange[0] <= seg.dataRange[1]) {
    return seg.dataRange;
  }
  const start = Math.floor(segIdx * dataLen / segments.length);
  const end = Math.min(Math.floor((segIdx + 1) * dataLen / segments.length), dataLen - 1);
  return [start, end];
}

export function StoryCanvas() {
  const { selectedEmotion, intensity, generated, isLoading, loadingStage, llmOutput, dataset, hoveredSegIdx, setHoveredSegIdx, regeneratingPhase } = useEmotionStore();
  const t = useT();
  const [activeSegIdx, setActiveSegIdx] = useState<number | null>(null);

  const phaseLabels: Record<NarrativePhase, string> = {
    opening:    t.phaseExposition,
    rising:     t.phaseRising,
    climax:     t.phaseClimax,
    resolution: t.phaseFalling,
    coda:       t.phaseDenouement,
  };

  const stageLabels: Record<string, string> = {
    analyzing: t.stageAnalyzing,
    narrating: t.stageNarrating,
    encoding:  t.stageEncoding,
  };

  // Derive chart data — pivot when groupByColumn is active
  const [copied, setCopied] = useState(false);

  const copyNarrative = () => {
    if (!llmOutput) return;
    const { title, segments } = llmOutput;
    const text = [
      title,
      '',
      ...segments.map(s => `[${phaseLabels[s.phase] ?? s.phase}]\n${s.text}`),
    ].join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { chartData, effectiveYColumns, xLabel } = useMemo(() => {
    const raw = dataset?.parsed ?? MOCK_OUTPUTS[selectedEmotion].data;
    const groupBy = dataset?.groupByColumn;
    const yCol = dataset?.yColumns?.[0];

    if (groupBy && yCol) {
      const { pivoted, groups } = pivotByGroup(raw, groupBy, yCol);
      return { chartData: pivoted, effectiveYColumns: groups, xLabel: dataset?.xColumn };
    }
    return { chartData: raw, effectiveYColumns: dataset?.yColumns, xLabel: dataset?.xColumn };
  }, [dataset, selectedEmotion]);

  const card: React.CSSProperties = { marginBottom: 12 };
  const chartCard: React.CSSProperties = { marginBottom: 12 };
  const cardHeader: React.CSSProperties = {
    padding: '10px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', borderBottom: '1px solid #f0f0f0',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
  };

  // Loading state
  if (isLoading) {
    return (
      <div>
        <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>
        <LoadingSkeleton stage={loadingStage} stageLabels={stageLabels} processing={t.processing} />
      </div>
    );
  }

  // Empty state
  if (!generated) {
    return (
      <div style={{
        minHeight: 420, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        border: '1.5px dashed #e5e7eb', borderRadius: 16,
      }}>
        <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', fontWeight: 500 }}>{t.storyCanvas}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d1d5db' }}>{t.storyCanvasHint}</p>
      </div>
    );
  }

  const emo = EMOTION_META.find(e => e.id === selectedEmotion)!;

  if (llmOutput) {
    const { title, analysis, segments, visualProps } = llmOutput;
    const yLabel = effectiveYColumns?.length === 1 ? effectiveYColumns[0] : undefined;

    return (
      <div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

        {/* Title bar */}
        <div style={{ marginBottom: 12, animation: 'fadeIn 0.4s ease-out' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
            {new Date(llmOutput.generatedAt).toLocaleString('en-US')} · GPT-4o-mini
          </p>
        </div>

        {/* Narrative — double-bezel card */}
        <div className="card-shell fade-up fade-up-d1" style={card}>
          <div className="card-inner">
            <div style={{ ...cardHeader, background: emo.bg }}>
              <span style={{ ...sectionLabel, color: emo.textColor }}>{t.affectiveNarrative}</span>
              <span style={{ fontSize: 11, color: emo.textColor, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                {emo.label} · {analysis.narrativeArc.replace('_', ' ')} {t.arc}
              </span>
            </div>
            <div style={{ padding: '16px 16px 4px' }}>
              {segments.map((seg, i) => (
                <SegmentCard
                  key={i} seg={seg} index={i} total={segments.length}
                  phaseLabel={phaseLabels[seg.phase] ?? seg.phase}
                  isActive={activeSegIdx === i}
                  isRegenerating={regeneratingPhase === seg.phase}
                  onSelect={() => setActiveSegIdx(activeSegIdx === i ? null : i)}
                  onHoverChange={(h) => setHoveredSegIdx(h ? i : null)}
                />
              ))}
            </div>
            {/* Copy button */}
            <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-subtle"
                onClick={copyNarrative}
                title="Copy narrative text"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  border: copied ? '1px solid #10b981' : '1px solid rgba(0,0,0,0.08)',
                  background: copied ? '#f0fdf4' : 'rgba(0,0,0,0.03)',
                  color: copied ? '#059669' : '#6b7280',
                }}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t.copied}
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    {t.copy}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chart — double-bezel, overflow visible for SVG */}
        <div className="card-shell fade-up fade-up-d2" style={{ ...chartCard, overflow: 'visible' }}>
          <div style={{ background: '#fff', borderRadius: 19, overflow: 'visible' }}>
            <div style={{ ...cardHeader, borderRadius: '19px 19px 0 0', overflow: 'hidden' }}>
              <span style={{ ...sectionLabel, color: '#9ca3af' }}>{t.visualEncoding}</span>
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 100,
                background: emo.bg, color: emo.textColor,
              }}>
                {visualProps.chartForm}
              </span>
            </div>
            <div style={{ padding: '12px 16px 8px' }}>
              <EmotionChart data={chartData} visualProps={visualProps} annotations={visualProps.annotations} activeRange={null} hoveredRange={segmentHoverRange(hoveredSegIdx, segments, chartData.length)} xLabel={xLabel} yLabel={yLabel} yColumns={effectiveYColumns} />
            </div>
          </div>
        </div>

        {/* JSON output */}
        <details className="fade-up fade-up-d3" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 14, border: '1px solid rgba(0,0,0,0.06)' }}>
          <summary style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#b0b7c3', cursor: 'pointer', marginBottom: 8 }}>
            {t.pipelineOutput}
          </summary>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, color: '#6b7280', overflowX: 'auto', lineHeight: 1.6 }}>
            {JSON.stringify({ analysis, visualProps }, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const output = MOCK_OUTPUTS[selectedEmotion];
  const mockYLabel = effectiveYColumns?.length === 1 ? effectiveYColumns[0] : undefined;
  const intensityRatio = intensity / 100;
  const dynamicProps = {
    ...output.visualProps,
    fillOpacity: +(output.visualProps.fillOpacity * (0.5 + intensityRatio * 0.8)).toFixed(2),
    saturation: `${Math.round(40 + intensityRatio * 55)}%`,
  };

  return (
    <div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Mock badge */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: '#fef9c3', color: '#a16207', fontWeight: 600 }}>
          {t.mockModeBadge}
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{t.mockModeHint}</span>
      </div>

      {/* Narrative */}
      <div style={card}>
        <div style={{ ...cardHeader, background: emo.bg }}>
          <span style={{ ...sectionLabel, color: emo.textColor }}>{t.affectiveNarrative}</span>
          <span style={{ fontSize: 11, color: emo.textColor, opacity: 0.7 }}>
            {emo.label} · {intensity}%
          </span>
        </div>
        <div style={{ padding: '14px 16px', borderLeft: `3px solid ${emo.hex}` }}>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.85 }}>
            {output.narrative}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={chartCard}>
        <div style={{ ...cardHeader, borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          <span style={{ ...sectionLabel, color: '#9ca3af' }}>{t.visualEncoding}</span>
          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 100, background: emo.bg, color: emo.textColor }}>
            {dynamicProps.chartForm}
          </span>
        </div>
        <div style={{ padding: '12px 16px 8px' }}>
          <EmotionChart data={chartData} visualProps={dynamicProps} annotations={[]} xLabel={xLabel} yLabel={mockYLabel} yColumns={effectiveYColumns} />
        </div>
      </div>

      {/* JSON output */}
      <div style={{ background: '#f9fafb', borderRadius: 12, padding: 14 }}>
        <p style={{ ...sectionLabel, color: '#9ca3af', margin: '0 0 10px', display: 'block' }}>
          LLM Visual Parameter Output (Mock JSON)
        </p>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', lineHeight: 2 }}>
          <span style={{ color: '#d1d5db' }}>{'{'}</span>
          {Object.entries(dynamicProps).map(([k, v], i, arr) => (
            <div key={k} style={{ paddingLeft: 16 }}>
              <span style={{ color: '#60a5fa' }}>"{k}"</span>
              <span style={{ color: '#d1d5db' }}>: </span>
              <span style={{ color: '#34d399' }}>"{v}"</span>
              {i < arr.length - 1 && <span style={{ color: '#d1d5db' }}>,</span>}
            </div>
          ))}
          <span style={{ color: '#d1d5db' }}>{'}'}</span>
        </div>
      </div>
    </div>
  );
}
