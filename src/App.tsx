import { useRef, useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { StoryCanvas } from './components/StoryCanvas';
import { useEmotionStore } from './store/emotionStore';

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { apiKey, setApiKey } = useEmotionStore();
  const [showKey, setShowKey] = useState(false);
  const isLive = apiKey.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 50, right: 20, zIndex: 51,
        background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        padding: '20px 20px 18px', width: 320,
        animation: 'settingsFadeIn 0.15s ease-out',
      }}>
        <style>{`@keyframes settingsFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Settings</span>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 2 }}
          >
            ✕
          </button>
        </div>

        {/* API Key section */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            OpenAI API Key
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-…"
              aria-label="OpenAI API Key"
              autoComplete="off"
              style={{
                flex: 1, fontSize: 11, padding: '7px 10px',
                border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none',
                fontFamily: 'monospace', color: '#374151',
              }}
            />
            <button
              onClick={() => setShowKey(p => !p)}
              aria-label={showKey ? 'Hide' : 'Show'}
              style={{
                fontSize: 11, padding: '0 10px', border: '1px solid #e5e7eb',
                borderRadius: 8, cursor: 'pointer', background: '#f9fafb', color: '#6b7280',
                whiteSpace: 'nowrap',
              }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isLive ? '#22c55e' : '#d1d5db', flexShrink: 0,
            }} />
            <span style={{ fontSize: 11, color: isLive ? '#16a34a' : '#9ca3af' }}>
              {isLive ? 'Live mode — using GPT-4o-mini' : 'Mock mode — preview without API key'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [splitPercent, setSplitPercent] = useState(40);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(Math.max(pct, 20), 80));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div style={{ height: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Affective Data Storytelling</p>
        </div>

        <button
          onClick={() => setSettingsOpen(p => !p)}
          aria-label="Settings"
          aria-expanded={settingsOpen}
          style={{
            background: settingsOpen ? '#f3f4f6' : 'none',
            border: '1px solid',
            borderColor: settingsOpen ? '#e5e7eb' : 'transparent',
            borderRadius: 8, cursor: 'pointer',
            padding: '6px 8px', color: '#6b7280',
            display: 'flex', alignItems: 'center',
            transition: 'all 0.15s',
          }}
        >
          <GearIcon />
        </button>
      </header>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      <main ref={mainRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', userSelect: 'none' }}>
        <aside style={{ width: `${splitPercent}%`, flexShrink: 0, background: '#fff', padding: 16, overflowY: 'auto' }}>
          <ControlPanel />
        </aside>

        <div
          onMouseDown={onDividerMouseDown}
          title="Drag to resize"
          style={{
            width: 14, flexShrink: 0, cursor: 'col-resize',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            zIndex: 10,
          }}
        >
          {/* visible track */}
          <div
            className="divider-track"
            style={{
              width: 4, height: '100%', position: 'absolute',
              background: '#e5e7eb', transition: 'background 0.15s',
              pointerEvents: 'none',
            }}
          />
          {/* grip dots */}
          <div style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            gap: 4, pointerEvents: 'none', zIndex: 1,
          }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#c4c9d4' }} />
            ))}
          </div>
          <style>{`
            div[title="Drag to resize"]:hover .divider-track { background: #a5b4fc; }
            div[title="Drag to resize"]:hover div > div { background: #818cf8 !important; }
          `}</style>
        </div>

        <section style={{ flex: 1, padding: '20px 20px', overflowY: 'auto', minWidth: 0 }}>
          <StoryCanvas />
        </section>
      </main>
    </div>
  );
}
