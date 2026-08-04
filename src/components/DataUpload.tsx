import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useEmotionStore } from '../store/emotionStore';
import { parseFile } from '../services/dataParser';

export function DataUpload() {
  const { dataset, setDataset, setDatasetDescription, setDatasetXColumn, setDatasetYColumns, setDatasetGroupBy } = useEmotionStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [axesOpen, setAxesOpen] = useState(false);

  const toggleYColumn = (col: string) => {
    if (!dataset?.yColumns) return;
    const next = dataset.yColumns.includes(col)
      ? dataset.yColumns.filter(c => c !== col)
      : [...dataset.yColumns, col];
    if (next.length === 0) return;
    setDatasetYColumns(next);
  };

  const handleFile = (file: File) => {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ds = parseFile(e.target!.result as string, file.name);
        setDataset(ds);
        setAxesOpen(false);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Parse failed');
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isActive = dragging || hovering;

  // ── After upload: compact row ────────────────────────────────────────────────
  if (dataset) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>

        {/* Compact file row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid #e5e7eb', borderRadius: 8,
          padding: '6px 8px', background: '#fff',
        }}>
          {/* Green icon */}
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#16a34a',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </div>

          {/* Name + count */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 600, color: '#1f2937',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {dataset.name}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
              {dataset.parsed.length} rows · {dataset.columns.length} cols
            </p>
          </div>

          {/* Gear: toggle axes */}
          <button
            onClick={() => setAxesOpen(o => !o)}
            title={axesOpen ? 'Hide axis settings' : 'Configure axes'}
            style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: axesOpen ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
              background: axesOpen ? '#eef2ff' : '#f9fafb',
              color: axesOpen ? '#4338ca' : '#9ca3af',
              cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
            </svg>
          </button>

          {/* Clear */}
          <button
            onClick={() => { setDataset(null); setAxesOpen(false); }}
            aria-label={`Clear dataset ${dataset.name}`}
            style={{
              flexShrink: 0, fontSize: 16, lineHeight: 1, color: '#d1d5db',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 2px',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
            onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
          >
            ×
          </button>
        </div>

        {/* Expandable axis configurator */}
        {axesOpen && dataset.columns.length > 1 && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 7, overflow: 'hidden' }}>

            {/* X Axis */}
            <div style={{
              padding: '5px 10px', background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', flexShrink: 0 }}>X Axis</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dataset.columns.map(col => {
                  const active = dataset.xColumn === col;
                  return (
                    <button key={col} onClick={() => setDatasetXColumn(col)} title={`Use ${col} as X axis`} style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 4, cursor: 'pointer',
                      border: active ? '1.5px solid #0891b2' : '1px solid #e5e7eb',
                      background: active ? '#ecfeff' : '#f9fafb',
                      color: active ? '#0e7490' : '#9ca3af',
                      fontWeight: active ? 700 : 400, transition: 'all 0.12s',
                    }}>
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Y Axis — all columns except current X */}
            {dataset.columns.filter(c => c !== dataset.xColumn).length > 0 && (
              <div style={{ padding: '5px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', flexShrink: 0 }}>Y Axis</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {dataset.columns.filter(c => c !== dataset.xColumn).map(col => {
                    const selected = dataset.yColumns.includes(col);
                    const isNumeric = dataset.numericColumns.includes(col);
                    return (
                      <button key={col} onClick={() => toggleYColumn(col)} title={selected ? `Hide ${col}` : `Show ${col}`} style={{
                        fontSize: 11, padding: '1px 7px', borderRadius: 4, cursor: 'pointer',
                        border: selected ? '1.5px solid #6366f1' : '1px solid #e5e7eb',
                        background: selected ? '#eef2ff' : '#f9fafb',
                        color: selected ? '#4338ca' : isNumeric ? '#9ca3af' : '#c4c9d4',
                        fontWeight: selected ? 600 : 400, transition: 'all 0.12s',
                      }}>
                        {col}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Series */}
            {(() => {
              const strCols = dataset.columns.filter(c => !dataset.numericColumns.includes(c) && c !== dataset.xColumn);
              if (strCols.length === 0) return null;
              const active = dataset.groupByColumn ?? null;
              return (
                <div style={{ padding: '5px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', flexShrink: 0 }}>Series</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => setDatasetGroupBy(null)} style={{
                      fontSize: 11, padding: '1px 7px', borderRadius: 4, cursor: 'pointer',
                      border: active === null ? '1.5px solid #6b7280' : '1px solid #e5e7eb',
                      background: active === null ? '#f3f4f6' : '#f9fafb',
                      color: active === null ? '#374151' : '#9ca3af',
                      fontWeight: active === null ? 700 : 400, transition: 'all 0.12s',
                    }}>none</button>
                    {strCols.map(col => (
                      <button key={col} onClick={() => setDatasetGroupBy(col)} title={`Split chart by ${col}`} style={{
                        fontSize: 11, padding: '1px 7px', borderRadius: 4, cursor: 'pointer',
                        border: active === col ? '1.5px solid #d97706' : '1px solid #e5e7eb',
                        background: active === col ? '#fffbeb' : '#f9fafb',
                        color: active === col ? '#92400e' : '#9ca3af',
                        fontWeight: active === col ? 700 : 400, transition: 'all 0.12s',
                      }}>{col}</button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Data description */}
            <details style={{ borderTop: '1px solid #f0f0f0' }}>
              <summary style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 10px', cursor: 'pointer',
                fontSize: 11, color: '#6b7280', fontWeight: 500,
                listStyle: 'none', userSelect: 'none', background: '#fafafa',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Description
                </span>
                <span style={{ fontSize: 10, color: '#b0b7c3', background: '#f3f4f6', borderRadius: 4, padding: '1px 5px' }}>optional</span>
              </summary>
              <textarea
                value={dataset.description ?? ''}
                onChange={e => setDatasetDescription(e.target.value)}
                placeholder="Dataset source, context, or your key question…"
                rows={2}
                style={{
                  display: 'block', width: '100%', fontSize: 11, lineHeight: 1.6,
                  padding: '6px 10px', resize: 'vertical', outline: 'none',
                  border: 'none', color: '#374151', background: '#fff',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </details>
          </div>
        )}

        {parseError && (
          <p role="alert" style={{ margin: 0, fontSize: 11, color: '#ef4444', padding: '3px 8px', background: '#fef2f2', borderRadius: 5 }}>
            ⚠ {parseError}
          </p>
        )}
      </div>
    );
  }

  // ── Before upload: drop zone ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div
        role="button" tabIndex={0}
        aria-label="Upload CSV or JSON file"
        style={{
          border: `1.5px dashed ${dragging ? '#3b82f6' : isActive ? '#c7d2e0' : '#d1d5db'}`,
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: dragging ? '#eff6ff' : isActive ? '#f5f6f7' : '#fafafa',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 7, flexShrink: 0,
          background: '#fff', border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: dragging ? '#3b82f6' : '#9ca3af', transition: 'color 0.12s',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: dragging ? '#2563eb' : '#374151' }}>
            {dragging ? 'Drop to upload' : 'Drop CSV or JSON'}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: '#3b82f6' }}>or browse files</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.json" aria-label="Select data file" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {parseError && (
        <p role="alert" style={{ margin: 0, fontSize: 11, color: '#ef4444', padding: '3px 8px', background: '#fef2f2', borderRadius: 5 }}>
          ⚠ {parseError}
        </p>
      )}
    </div>
  );
}
