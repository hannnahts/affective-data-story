import { useState, useEffect, useRef } from 'react';
import { useEmotionStore } from '../store/emotionStore';
import { EMOTION_META } from '../data/mockData';
import { DataUpload } from './DataUpload';
import { InteractivePyramid } from './InteractivePyramid';
import type { EmotionId } from '../types/emotion';

const INTENSITY_GUIDE = [
  { label: 'Low  (0–33)',    desc: 'Light touch, emotion implied',  color: '#9ca3af' },
  { label: 'Mid  (34–66)',   desc: 'Balanced narrative and affect', color: '#f59e0b' },
  { label: 'High (67–100)', desc: 'Dramatic, bold word choices',   color: '#ef4444' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

export function ControlPanel() {
  const {
    selectedEmotion, apiKey, isLoading, loadingStage, error,
    generated, setEmotion, generate,
    segmentConfigs, setSegmentConfig, regeneratingPhase, regenerateSegment,
  } = useEmotionStore();

  // Auto-refresh: after first generation, debounce 1.2s on emotion change
  const isFirstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!generated || isLoading || !apiKey.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { generate(); }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmotion]);

  const activeEmo = EMOTION_META.find(e => e.id === selectedEmotion)!;
  const isLiveMode = apiKey.trim().length > 0;

  const loadingLabel: Record<string, string> = {
    analyzing: 'Analyzing data…',
    narrating: 'Generating narrative…',
    encoding: 'Encoding visual params…',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{
        background: '#ffffff',
        border: '1.5px solid #d1d5db',
        borderRadius: 14,
        padding: '16px 16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '0.01em', marginBottom: 12 }}>
          Dataset
        </div>
        <DataUpload />
      </div>

      <div style={{
        background: '#f9fafb',
        border: '1.5px solid #e5e7eb',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Emotion Target */}
        <div>
          <SectionLabel>Emotion Target</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {EMOTION_META.map(emo => {
              const active = selectedEmotion === emo.id;
              return (
                <button
                  key={emo.id}
                  onClick={() => setEmotion(emo.id as EmotionId)}
                  aria-pressed={active}
                  aria-label={`Select emotion: ${emo.label}`}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: active ? `2px solid ${emo.hex}` : '1.5px solid #e9ebee',
                    background: active ? emo.bg : '#ffffff',
                    boxShadow: active
                      ? `0 3px 12px ${emo.hex}28`
                      : '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? emo.textColor : '#4b5563',
                    letterSpacing: '0.01em',
                    transition: 'all 0.18s',
                    whiteSpace: 'nowrap',
                  }}>
                    {emo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#e5e7eb' }} />

        {/* Intensity guide */}
        <div>
          <SectionLabel>Intensity Guide</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {INTENSITY_GUIDE.map(g => (
              <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: g.color, minWidth: 80 }}>{g.label}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{g.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Phase Config — interactive pyramid */}
        <div style={{ height: 1, background: '#e5e7eb' }} />
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
          }}>
            Phase Tuning
          </div>
          <InteractivePyramid
            segmentConfigs={segmentConfigs}
            onUpdate={(phase, patch) => setSegmentConfig(phase, patch)}
            onCommit={(phase) => { if (generated && apiKey.trim()) regenerateSegment(phase); }}
            regeneratingPhase={regeneratingPhase}
          />
        </div>

      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>⚠ {error}</p>
        </div>
      )}

      <button
        onClick={generate}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? (loadingStage ? loadingLabel[loadingStage] : 'Processing') : isLiveMode ? 'Generate affective narrative' : 'Preview mock story'}
        style={{
          width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 600,
          border: `1.5px solid ${isLoading ? '#e5e7eb' : activeEmo.hex}`,
          borderRadius: 12,
          background: isLoading ? '#f9fafb' : activeEmo.bg,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
          color: isLoading ? '#9ca3af' : activeEmo.textColor,
          letterSpacing: '0.01em',
        }}
      >
        {isLoading
          ? (loadingStage ? loadingLabel[loadingStage] : 'Processing…')
          : isLiveMode ? 'Generate Story ↗' : 'Preview (Mock) ↗'}
      </button>


    </div>
  );
}
