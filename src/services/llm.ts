import OpenAI from 'openai';
import type {
  EmotionId, DataPoint, AnnotatedVisualProps, VisualProps,
  AnalysisResult, NarrativeSegment, LLMStoryOutput, SegmentConfig, NarrativePhase,
} from '../types/emotion';

// ─── Visual Grammar (Valence × Arousal → visual encoding) ────────────────────

const VISUAL_GRAMMAR: Record<EmotionId, VisualProps> = {
  curiosity: { primaryHex: '#F59E0B', saturation: '70%', strokeWeight: 1.5, animEasing: 'ease-in-out',               chartForm: 'smooth', fillOpacity: 0.18 },
  concern:   { primaryHex: '#378ADD', saturation: '55%', strokeWeight: 1.5, animEasing: 'ease-in-out',               chartForm: 'jagged', fillOpacity: 0.10 },
  tension:   { primaryHex: '#DC2626', saturation: '90%', strokeWeight: 2.5, animEasing: 'ease-in',                   chartForm: 'jagged', fillOpacity: 0.08 },
  surprise:  { primaryHex: '#D4537E', saturation: '67%', strokeWeight: 1.5, animEasing: 'cubic-bezier(0.9,0,0.1,1)', chartForm: 'spike',  fillOpacity: 0.15 },
  awe:       { primaryHex: '#7C3AED', saturation: '75%', strokeWeight: 1.5, animEasing: 'ease-out',                  chartForm: 'smooth', fillOpacity: 0.22 },
  hope:      { primaryHex: '#10B981', saturation: '65%', strokeWeight: 1.2, animEasing: 'ease-out',                  chartForm: 'smooth', fillOpacity: 0.20 },
};

const ANNOTATION_TYPE_EN: Record<string, string> = {
  peak: 'Peak', trough: 'Low', anomaly: 'Anomaly', inflection: 'Shift',
};

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an analyst specializing in Affective Data Storytelling.

Your core task: use a specified emotion as the narrative lens to transform data into analytically rigorous, emotionally resonant reports. Emotion is not decoration — it is a framework for understanding data. The same numbers, viewed through different emotional lenses, produce entirely different interpretive frames and narrative emphasis.

Writing guidelines:
- Data first: every segment must reference at least one specific value or magnitude of change; all claims must be grounded in data
- Convey emotion through word choice: use emotionally charged verbs, adverbs, and evaluative language — not metaphors
  * curiosity: worth examining, yet to be explained, outside the pattern, thought-provoking, perhaps beneath the surface
  * concern: warrants attention, divergence emerging, volatility increasing, underlying risk, requires vigilance
  * tension: pressure mounting, sustained strain, tightening toward a threshold, narrowing window, cannot be ignored
  * surprise: breaks from precedent, significant deviation, anomalous emergence, exceeds expectation, defies projection
  * awe: order-of-magnitude shift, beyond the usual scale, difficult to perceive from within, full weight only visible at a macro level
  * hope: inflection point emerging, momentum building, trajectory improving, strong grounds for anticipation, recovery signal
- Prohibit metaphors and literary imagery
- Concise language with rhythmic variation

Emotion dimensions (Valence / Arousal):
- curiosity: mid-valence (+0.3) / mid-arousal (+0.5) — questioning, exploring, unresolved
- concern: low-valence (-0.5) / mid-arousal (+0.4) — warning, volatility, latent risk
- tension: low-valence (-0.6) / high-arousal (+0.8) — pressure accumulating, threshold state, significance mounting
- surprise: mid-valence (+0.2) / high-arousal (+0.9) — contrast shock, decisive moment, overturned expectations
- awe: high-valence (+0.7) / mid-arousal (+0.6) — macro perspective, scale, detail expanding to whole
- hope: high-valence (+0.8) / low-arousal (+0.3) — projecting forward, next steps, positive outlook

Narrative arc types:
- hero_journey: emergence → challenge → reversal → achievement
- tragedy: peak → turning point → sustained decline → reflection
- redemption: low point → inflection → recovery → new level
- mystery: anomalous signal → data tracing → conclusion → impact assessment
- growth: baseline → acceleration → plateau → new baseline

Always respond with valid JSON only. Do not include any Markdown code blocks. All narrative text must be written in English.`;

// ─── Data sampling (keeps first, last, global max/min + uniform spread) ──────

function sampleData(data: DataPoint[], maxPoints = 300): { sampled: DataPoint[]; wasSampled: boolean } {
  if (data.length <= maxPoints) return { sampled: data, wasSampled: false };

  const maxIdx = data.reduce((bi, d, i) => d.value > data[bi].value ? i : bi, 0);
  const minIdx = data.reduce((bi, d, i) => d.value < data[bi].value ? i : bi, 0);
  const keySet = new Set([0, data.length - 1, maxIdx, minIdx]);

  const remaining = maxPoints - keySet.size;
  const step = (data.length - 1) / (remaining + 1);
  for (let i = 1; i <= remaining; i++) keySet.add(Math.round(i * step));

  const sampled = Array.from(keySet).sort((a, b) => a - b).map(i => data[i]);
  return { sampled, wasSampled: true };
}

// ─── Stage 1: Data Analysis ───────────────────────────────────────────────────

async function analyzeData(
  client: OpenAI,
  data: DataPoint[],
  targetEmotion: EmotionId | 'auto',
  datasetName: string,
  description?: string,
): Promise<AnalysisResult> {
  const { sampled, wasSampled } = sampleData(data);
  const dataStr = sampled.map((d, i) => `[${i}] ${d.month}: ${d.value}`).join('\n');
  const samplingNote = wasSampled
    ? `（注：原始数据共 ${data.length} 条，已均匀采样至 ${sampled.length} 条，保留了首尾及极值点）\n`
    : '';

  const emotionConstraint = targetEmotion !== 'auto'
    ? `The target emotion is "${targetEmotion}" — use this as the dominant emotion; fill other fields based on the actual data.`
    : 'Automatically determine the most fitting dominant emotion based on the data characteristics.';

  const descriptionLine = description?.trim()
    ? `Dataset context: "${description.trim()}"\n`
    : '';

  const prompt = `Analyze the following dataset and identify its emotional characteristics and key moments.

Dataset name: "${datasetName}"
${descriptionLine}${samplingNote}Data (index, label, value):
${dataStr}

${emotionConstraint}

Return strictly the following JSON structure (no explanatory text):
{
  "dominantEmotion": "<curiosity|concern|tension|surprise|awe|hope>",
  "narrativeArc": "<hero_journey|tragedy|redemption|mystery|growth>",
  "summary": "<2-3 sentence objective data summary, in English>",
  "highlights": [
    {
      "index": <integer data point index>,
      "label": "<point label>",
      "value": <numeric value>,
      "type": "<peak|trough|anomaly|inflection>",
      "emotion": "<emotion id at this moment>",
      "description": "<why this point is significant, one sentence, in English>"
    }
  ],
  "emotionTrajectory": [
    { "index": <index>, "emotion": "<emotion id>", "intensity": <integer 0-100> }
  ]
}

Extract 2-4 of the most significant data points for highlights, with each type (peak/trough/anomaly/inflection) appearing at most once. emotionTrajectory must cover all data points.`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });

  return JSON.parse(res.choices[0].message.content!) as AnalysisResult;
}

// ─── Stage 2: Narrative Generation ───────────────────────────────────────────

const intensityLabel = (v: number) => v > 70 ? 'intense' : v > 40 ? 'moderate' : 'restrained';

// weight (1-5) maps directly to exact sentence count
const weightToSentences = (w: number) => w;

async function generateNarrative(
  client: OpenAI,
  analysis: AnalysisResult,
  globalIntensity: number,
  segmentConfigs: SegmentConfig[],
): Promise<{ title: string; segments: NarrativeSegment[] }> {
  const globalDesc = intensityLabel(globalIntensity);

  const highlightStr = analysis.highlights.map(h =>
    `  - [${h.label}] value=${h.value}, type=${h.type}: ${h.description}`
  ).join('\n');

  const arcNames: Record<string, string> = {
    hero_journey: 'Hero Journey (emergence → challenge → reversal → achievement)',
    tragedy:      'Tragedy (peak → turning point → decline → reflection)',
    redemption:   'Redemption (low point → inflection → recovery → new level)',
    mystery:      'Mystery (anomalous signal → investigation → revelation → impact)',
    growth:       'Growth (baseline → acceleration → plateau → new baseline)',
  };

  const cfgMap = new Map(segmentConfigs.map(c => [c.phase, c]));

  // Per-phase config with EXACT sentence counts
  const phaseConfigStr = segmentConfigs.map(cfg => {
    const n = weightToSentences(cfg.lengthWeight);
    return `  - ${cfg.phase}: intensity ${cfg.intensity}/100 (${intensityLabel(cfg.intensity)}), [MUST write exactly ${n} sentence(s), no more no less]`;
  }).join('\n');

  // Dynamic JSON template — each phase shows its own exact sentence constraint
  const PHASES = ['opening', 'rising', 'climax', 'resolution', 'coda'] as const;
  const segmentTemplate = PHASES.map(phase => {
    const cfg = cfgMap.get(phase);
    const n = cfg ? weightToSentences(cfg.lengthWeight) : 3;
    return `    { "phase": "${phase}", "text": "<exactly ${n} sentence(s) in English, must include at least one specific data value>", "emotion": "<emotion id>", "intensity": <0-100>, "dataRange": [<start index>, <end index>] }`;
  }).join(',\n');

  const prompt = `Your task is to write a cohesive affective narrative from the data analysis below. The 5 segments are chapters of a single article, not 5 independent pieces. After reading one segment, the reader should naturally want to read the next — each segment advances the story built by the previous one.

Data summary: ${analysis.summary}
Emotional lens: ${analysis.dominantEmotion} (determines interpretation, detail selection, and tone)
Narrative arc: ${arcNames[analysis.narrativeArc] ?? analysis.narrativeArc}
Global intensity (reference baseline): ${globalIntensity}/100 — ${globalDesc}

⚠ Per-phase sentence count and intensity (highest priority — enforce strictly):
${phaseConfigStr}

Key data moments:
${highlightStr}

[NARRATIVE COHERENCE — most important constraint]
1. Treat all 5 segments as a single story arc; each must pick up the thread left by the previous
2. "rising" must explicitly continue the question or observation introduced in "opening"
3. "climax" must feel like the inevitable result of the tension accumulated in "rising"
4. "resolution" must answer the tension raised by "climax" at the data level
5. "coda" must grow organically from the whole narrative — not be an isolated reflection

[SEGMENT ROLES — do not mix responsibilities]
- opening: Establish the data starting point; pose one central question or observation that threads through the whole piece
- rising: Continue from opening's question; use data trends to show how it evolved; end with a new tension
- climax: Carry the momentum from rising to its peak; describe the single highest-tension moment with the most specific data values; leave an aftershock
- resolution: Follow from climax's impact; objectively describe the data's final state — only "what happened," no predictions, no advice, no questions
- coda: Emerge from the whole narrative arc; choose ONE of these directions (randomly, no specific data values, no repeating resolution's conclusions):
  A. Deep reflection on the human decisions or behavioral patterns behind the data
  B. The systemic structural cause this data phenomenon reveals
  C. A core question the data cannot yet answer but is worth tracking long-term (end with a question mark)

[WRITING RULES]
- Every segment must cite at least one specific value (coda excepted)
- Convey emotion through word choice; no metaphors or literary imagery
- ⚠ Sentence count is a hard constraint: count periods after writing each segment; must match config above exactly
- Adjacent segments must not start with the same word or phrase
- All text must be in English

Return strictly 5 segments as the following JSON (no Markdown):
{
  "title": "<headline-style title, under 10 words, capturing the narrative's core thesis>",
  "segments": [
${segmentTemplate}
  ]
}`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.92,
  });

  const parsed = JSON.parse(res.choices[0].message.content!);
  return {
    title: (parsed.title as string) ?? '',
    segments: parsed.segments as NarrativeSegment[],
  };
}

// ─── Stage 3: Visual Encoding (deterministic, no LLM call needed) ─────────────

function deriveVisualProps(analysis: AnalysisResult, intensity: number, data: DataPoint[]): AnnotatedVisualProps {
  const base = VISUAL_GRAMMAR[analysis.dominantEmotion];
  const t = intensity / 100;

  const modulated: VisualProps = {
    ...base,
    fillOpacity: +(base.fillOpacity * (0.5 + t * 0.8)).toFixed(2),
    strokeWeight: +(base.strokeWeight * (0.8 + t * 0.4)).toFixed(1),
    saturation: `${Math.round(40 + t * 55)}%`,
  };

  // Deduplicate by type: peak → highest value, trough → lowest, others → first occurrence
  const byType = new Map<string, typeof analysis.highlights[0]>();
  for (const h of analysis.highlights) {
    const existing = byType.get(h.type);
    if (!existing) {
      byType.set(h.type, h);
    } else if (h.type === 'peak' && h.value > existing.value) {
      byType.set(h.type, h);
    } else if (h.type === 'trough' && h.value < existing.value) {
      byType.set(h.type, h);
    }
  }

  // Validate peak/trough against actual data — correct to true global extremes
  const corrected = Array.from(byType.values()).map(h => {
    if (h.type === 'peak') {
      const maxIdx = data.reduce((bi, d, i) => d.value > data[bi].value ? i : bi, 0);
      if (data[maxIdx].value > h.value) {
        return { ...h, index: maxIdx, label: data[maxIdx].month, value: data[maxIdx].value };
      }
    } else if (h.type === 'trough') {
      const minIdx = data.reduce((bi, d, i) => d.value < data[bi].value ? i : bi, 0);
      if (data[minIdx].value < h.value) {
        return { ...h, index: minIdx, label: data[minIdx].month, value: data[minIdx].value };
      }
    }
    return h;
  });

  // Drop inflection/shift annotations on the very first or last data point — not analytically meaningful
  const meaningful = corrected.filter(h => {
    if (h.type === 'inflection' && (h.index === 0 || h.index === data.length - 1)) return false;
    return true;
  });

  const annotations = meaningful.slice(0, 4).map(h => ({
    index: h.index,
    label: `${h.label} · ${ANNOTATION_TYPE_EN[h.type] ?? h.type}`,
    color: VISUAL_GRAMMAR[h.emotion].primaryHex,
    type: h.type,
  }));

  return { ...modulated, annotations };
}

// ─── Public Pipeline Entry Point ──────────────────────────────────────────────

export type PipelineStage = 'analyzing' | 'narrating' | 'encoding';

export async function runStoryPipeline(
  apiKey: string,
  data: DataPoint[],
  targetEmotion: EmotionId | 'auto',
  intensity: number,
  datasetName: string,
  onStage?: (stage: PipelineStage) => void,
  description?: string,
  segmentConfigs?: SegmentConfig[],
): Promise<LLMStoryOutput> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  onStage?.('analyzing');
  const analysis = await analyzeData(client, data, targetEmotion, datasetName, description);

  onStage?.('narrating');
  const configs = segmentConfigs ?? [
    { phase: 'opening',    intensity: 40, lengthWeight: 2 },
    { phase: 'rising',     intensity: 65, lengthWeight: 3 },
    { phase: 'climax',     intensity: 90, lengthWeight: 4 },
    { phase: 'resolution', intensity: 60, lengthWeight: 3 },
    { phase: 'coda',       intensity: 40, lengthWeight: 2 },
  ] as SegmentConfig[];
  const { title: llmTitle, segments } = await generateNarrative(client, analysis, intensity, configs);

  onStage?.('encoding');
  const visualProps = deriveVisualProps(analysis, intensity, data);

  return {
    title: llmTitle || `${datasetName}数据报告`,
    analysis,
    segments,
    visualProps,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Partial regeneration: single segment only ────────────────────────────────

export async function regenerateSegmentText(
  apiKey: string,
  phase: NarrativePhase,
  config: SegmentConfig,
  context: {
    analysis: AnalysisResult;
    globalIntensity: number;
    existingSegments: NarrativeSegment[];
    title: string;
  },
): Promise<string> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const { analysis, globalIntensity, existingSegments, title } = context;
  const n = config.lengthWeight;

  const phaseDesc: Record<string, string> = {
    opening:    'Opening (establish background and starting state)',
    rising:     'Rising (trend evolution, building toward turning point)',
    climax:     'Climax (highest tension moment, strongest data evidence)',
    resolution: 'Resolution (final state interpretation, analytical conclusion)',
    coda:       'Coda (core insight or actionable recommendation)',
  };

  const otherSegs = existingSegments
    .filter(s => s.phase !== phase)
    .map(s => `[${s.phase}]: ${s.text}`)
    .join('\n');

  const prompt = `You are revising a single segment of an affective data narrative report.

Report title: ${title}
Overall emotional lens: ${analysis.dominantEmotion}
Global intensity: ${globalIntensity}/100
Data summary: ${analysis.summary}

Other segments (unchanged — for context and style reference only):
${otherSegs}

[Segment to revise]: ${phase} — ${phaseDesc[phase] ?? phase}
New intensity: ${config.intensity}/100 (${intensityLabel(config.intensity)})
⚠ Hard sentence count requirement: exactly ${n} sentence(s), no more no less

Requirements:
1. Output only the segment text, nothing else
2. Must cite at least one specific data value
3. Tone and style must connect with adjacent segments
4. No metaphors or literary imagery
5. Write in English

Return strictly the following JSON (no Markdown):
{ "text": "<exactly ${n} sentence(s) in English>" }`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  return (JSON.parse(res.choices[0].message.content!) as { text: string }).text;
}
