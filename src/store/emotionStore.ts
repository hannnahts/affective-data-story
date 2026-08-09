import { create } from 'zustand';
import type { EmotionId, Dataset, LLMStoryOutput, LoadingStage, NarrativePhase, SegmentConfig } from '../types/emotion';
import { MOCK_OUTPUTS } from '../data/mockData';
import { runStoryPipeline, regenerateSegmentText } from '../services/llm';
import { remapAxes } from '../services/dataParser';

const DEFAULT_SEGMENT_CONFIGS: SegmentConfig[] = [
  { phase: 'opening',    intensity: 40, lengthWeight: 2 },
  { phase: 'rising',     intensity: 65, lengthWeight: 3 },
  { phase: 'climax',     intensity: 90, lengthWeight: 4 },
  { phase: 'resolution', intensity: 60, lengthWeight: 3 },
  { phase: 'coda',       intensity: 40, lengthWeight: 2 },
];

interface EmotionStore {
  selectedEmotion: EmotionId;
  intensity: number;
  setEmotion: (id: EmotionId) => void;
  setIntensity: (value: number) => void;

  apiKey: string;
  setApiKey: (key: string) => void;
  dataset: Dataset | null;
  setDataset: (ds: Dataset | null) => void;
  setDatasetDescription: (desc: string) => void;
  setDatasetXColumn: (col: string) => void;
  setDatasetYColumns: (cols: string[]) => void;
  setDatasetGroupBy: (col: string | null) => void;

  segmentConfigs: SegmentConfig[];
  setSegmentConfig: (phase: NarrativePhase, patch: Partial<Omit<SegmentConfig, 'phase'>>) => void;

  generated: boolean;
  isLoading: boolean;
  loadingStage: LoadingStage;
  error: string | null;
  llmOutput: LLMStoryOutput | null;

  hoveredSegIdx: number | null;
  setHoveredSegIdx: (idx: number | null) => void;

  regeneratingPhase: NarrativePhase | null;
  regenerateSegment: (phase: NarrativePhase) => Promise<void>;

  generate: () => Promise<void>;
  reset: () => void;
}

const ENV_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

export const useEmotionStore = create<EmotionStore>((set, get) => ({
  selectedEmotion: 'curiosity',
  intensity: 65,
  apiKey: ENV_KEY ?? '',
  dataset: null,
  segmentConfigs: DEFAULT_SEGMENT_CONFIGS,
  generated: false,
  isLoading: false,
  loadingStage: null,
  error: null,
  llmOutput: null,
  hoveredSegIdx: null,
  regeneratingPhase: null,

  setEmotion: (id) => set({ selectedEmotion: id }),
  setIntensity: (value) => set({ intensity: value }),
  setApiKey: (key) => set({ apiKey: key }),
  setDataset: (ds) => set({ dataset: ds, generated: false, llmOutput: null, error: null }),
  setDatasetDescription: (desc) => set(state => ({
    dataset: state.dataset ? { ...state.dataset, description: desc } : null,
  })),
  setDatasetXColumn: (col) => set(state => {
    if (!state.dataset) return {};
    const newYColumns = state.dataset.numericColumns.filter(c => c !== col);
    const remapped = remapAxes(state.dataset, col, newYColumns.length > 0 ? newYColumns : state.dataset.yColumns);
    return { dataset: remapped, generated: false, llmOutput: null, error: null };
  }),
  setDatasetYColumns: (cols) => set(state => ({
    dataset: state.dataset ? { ...state.dataset, yColumns: cols } : null,
  })),
  setDatasetGroupBy: (col) => set(state => ({
    dataset: state.dataset ? { ...state.dataset, groupByColumn: col, generated: false, llmOutput: null, error: null } : null,
  })),
  setSegmentConfig: (phase, patch) => set(state => ({
    segmentConfigs: state.segmentConfigs.map(c => c.phase === phase ? { ...c, ...patch } : c),
  })),

  generate: async () => {
    const { apiKey, selectedEmotion, intensity, dataset, segmentConfigs } = get();

    if (!apiKey.trim()) {
      set({ generated: true, llmOutput: null, error: null });
      return;
    }

    const data = dataset?.parsed ?? MOCK_OUTPUTS[selectedEmotion].data;
    const datasetName = dataset?.name ?? 'sample dataset';
    const description = dataset?.description;

    set({ isLoading: true, error: null, generated: false, llmOutput: null, loadingStage: 'analyzing' });

    try {
      const output = await runStoryPipeline(
        apiKey,
        data,
        selectedEmotion,
        intensity,
        datasetName,
        (stage) => set({ loadingStage: stage }),
        description,
        segmentConfigs,
      );
      set({ llmOutput: output, generated: true, isLoading: false, loadingStage: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const friendly = msg.includes('401') ? 'Invalid API key. Please check and try again.'
        : msg.includes('429') ? 'Rate limit exceeded. Please wait a moment and retry.'
        : msg.includes('fetch') || msg.includes('network') ? 'Network error. Please check your connection.'
        : `Generation failed: ${msg}`;
      set({ error: friendly, isLoading: false, loadingStage: null });
    }
  },

  regenerateSegment: async (phase) => {
    const { apiKey, llmOutput, segmentConfigs, intensity } = get();
    if (!apiKey.trim() || !llmOutput) return;
    const config = segmentConfigs.find(c => c.phase === phase);
    if (!config) return;

    set({ regeneratingPhase: phase });
    try {
      const newText = await regenerateSegmentText(apiKey, phase, config, {
        analysis: llmOutput.analysis,
        globalIntensity: intensity,
        existingSegments: llmOutput.segments,
        title: llmOutput.title,
      });
      set(state => ({
        regeneratingPhase: null,
        llmOutput: state.llmOutput ? {
          ...state.llmOutput,
          segments: state.llmOutput.segments.map(s =>
            s.phase === phase ? { ...s, text: newText, intensity: config.intensity } : s
          ),
        } : null,
      }));
    } catch {
      set({ regeneratingPhase: null });
    }
  },

  setHoveredSegIdx: (idx) => set({ hoveredSegIdx: idx }),
  reset: () => set({ generated: false, llmOutput: null, error: null, loadingStage: null }),
}));
