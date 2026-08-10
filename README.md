# Affective Data Storytelling

A research prototype exploring affective computing applied to data journalism. It takes a structured dataset, maps it onto the Russell Circumplex Model of emotion (valence × arousal), and uses GPT-4o-mini to generate a five-act narrative following Freytag's Pyramid structure, with chart styling derived from the selected emotion.

## Theoretical basis

**Russell Circumplex Model** — six emotions (curiosity, concern, tension, surprise, awe, hope) are positioned on a valence/arousal plane. Each carries a distinct visual grammar: for example, high-arousal negative emotions (tension) produce jagged, heavy-stroke charts, while high-valence low-arousal emotions (hope) produce smooth filled area charts with low opacity.

**Freytag's Pyramid** — the narrative is structured as five phases: exposition, rising action, climax, falling action, and denouement. Each phase has independently configurable intensity (0–100) and length (sentence count), mapped onto the arc diagram in the UI. The five segments are generated as a single coherent piece, not five independent paragraphs.

**Affective visual encoding** — chart form, stroke weight, fill opacity, and colour saturation are derived deterministically from the dominant emotion and intensity setting. No manual styling is needed.

## Three-stage pipeline

1. **Data analysis** (`analyzeData`) — GPT-4o-mini reads the dataset and returns dominant emotion, narrative arc type, key highlights (peak, trough, anomaly, inflection), and an emotion trajectory across all data points
2. **Narrative generation** (`generateNarrative`) — produces the five Freytag segments with per-phase intensity and sentence count constraints; segments are prompted to connect narratively
3. **Visual encoding** (`deriveVisualProps`) — deterministic, no LLM call; maps emotion + intensity to chart properties using a predefined visual grammar table

## Stack

- React 19, TypeScript, Vite
- Zustand for global state
- Recharts for chart rendering (area/line, with annotation overlays)
- OpenAI `gpt-4o-mini` via browser SDK

## Running locally

```bash
npm install
npm run dev
```

Add a `VITE_OPENAI_API_KEY` environment variable in `.env.local` to enable live generation. Without it, the app runs in mock mode using pre-written outputs for each emotion, so the interface is fully explorable without an API key.

## Key interactions

- **Emotion picker** — selects the affective lens; changing it after first generation triggers a debounced auto-regenerate (1.2 s)
- **Phase tuning** — an interactive SVG arc diagram lets you drag each Freytag phase node; vertical position maps to intensity, horizontal to sentence count; releasing a node regenerates only that segment without touching the rest
- **Data upload** — accepts CSV or JSON; axis assignment (x column, y columns, optional group-by) is configurable after upload
