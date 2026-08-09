# Affective Data Storytelling

A research prototype that turns structured datasets into emotionally framed narratives. You upload a CSV or JSON file, pick an emotion target (curiosity, tension, awe, etc.), and the app runs it through a three-stage GPT-4o-mini pipeline to produce a five-part story with matching chart styling.

## How it works

1. **Data analysis** - the model identifies dominant emotion, narrative arc, and key data moments
2. **Narrative generation** - produces five connected segments (exposition through denouement) with per-phase intensity and length controls
3. **Visual encoding** - derives chart form, colour, stroke weight, and fill opacity from the emotion and intensity settings

The five segments are treated as chapters of a single piece, not independent paragraphs. Each one is constrained to pick up from where the previous left off.

## Stack

- React 19, TypeScript, Vite
- Zustand for state
- Recharts for visualisation
- OpenAI `gpt-4o-mini` via browser SDK

## Running locally

```bash
npm install
npm run dev
```

Add a `VITE_OPENAI_API_KEY` environment variable in `.env.local` to enable live generation. Without it, the app falls back to mock outputs so you can still explore the interface.

## Controls

- **Emotion target** - sets the interpretive lens for the whole narrative
- **Phase tuning** - drag nodes on the arc diagram to adjust intensity (vertical) and sentence count (horizontal) per phase independently
- After the first generation, changing the emotion or committing a phase drag will automatically regenerate the relevant content without touching the rest
