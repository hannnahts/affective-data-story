export type EmotionId = 'curiosity' | 'concern' | 'tension' | 'surprise' | 'awe' | 'hope';

export type NarrativeArc = 'hero_journey' | 'tragedy' | 'redemption' | 'mystery' | 'growth';
export type NarrativePhase = 'opening' | 'rising' | 'climax' | 'resolution' | 'coda';
export type HighlightType = 'peak' | 'trough' | 'anomaly' | 'inflection';
export type LoadingStage = 'analyzing' | 'narrating' | 'encoding' | null;

export interface EmotionMeta {
  id: EmotionId;
  label: string;
  valence: number;
  arousal: number;
  dim: string;
  hex: string;
  bg: string;
  textColor: string;
}

export interface DataPoint {
  month: string;
  value: number;
  [key: string]: string | number;
}

export interface VisualProps {
  primaryHex: string;
  saturation: string;
  strokeWeight: number;
  animEasing: string;
  chartForm: 'smooth' | 'jagged' | 'flat' | 'spike';
  fillOpacity: number;
}

export interface AnnotatedVisualProps extends VisualProps {
  annotations: ChartAnnotation[];
}

export interface ChartAnnotation {
  index: number;
  label: string;
  color: string;
  type: HighlightType;
}

// Legacy mock output shape (kept for mock-mode fallback)
export interface MockOutput {
  narrative: string;
  visualProps: VisualProps;
  data: DataPoint[];
}

export interface DataHighlight {
  index: number;
  label: string;
  value: number;
  type: HighlightType;
  emotion: EmotionId;
  description: string;
}

export interface EmotionPoint {
  index: number;
  emotion: EmotionId;
  intensity: number; // 0–100
}

export interface AnalysisResult {
  dominantEmotion: EmotionId;
  narrativeArc: NarrativeArc;
  summary: string;
  highlights: DataHighlight[];
  emotionTrajectory: EmotionPoint[];
}

export interface NarrativeSegment {
  phase: NarrativePhase;
  text: string;
  emotion: EmotionId;
  intensity: number; // 0–100
  dataRange?: [number, number];
}

export interface LLMStoryOutput {
  title: string;
  analysis: AnalysisResult;
  segments: NarrativeSegment[];
  visualProps: AnnotatedVisualProps;
  generatedAt: string;
}

export interface SegmentConfig {
  phase: NarrativePhase;
  intensity: number;    // 0–100, overrides global intensity for this phase
  lengthWeight: number; // 1–5 (1=极简 ~1句, 5=深度 ~4-5句)
}

export interface Dataset {
  name: string;
  parsed: DataPoint[];
  columns: string[];
  xColumn: string;
  numericColumns: string[];
  yColumns: string[];
  groupByColumn?: string | null;
  description?: string;
}
