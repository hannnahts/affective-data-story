import type { EmotionId, EmotionMeta, MockOutput } from '../types/emotion';

export const EMOTION_META: EmotionMeta[] = [
  { id: 'curiosity', label: 'Curiosity', valence: 0.3,  arousal: 0.5,  dim: 'mid-V / mid-A',  hex: '#F59E0B', bg: '#FEF3C7', textColor: '#92400E' },
  { id: 'concern',   label: 'Concern',   valence: -0.5, arousal: 0.4,  dim: 'low-V / mid-A',  hex: '#378ADD', bg: '#E6F1FB', textColor: '#0C447C' },
  { id: 'tension',   label: 'Tension',   valence: -0.6, arousal: 0.8,  dim: 'low-V / high-A', hex: '#DC2626', bg: '#FEE2E2', textColor: '#7F1D1D' },
  { id: 'surprise',  label: 'Surprise',  valence: 0.2,  arousal: 0.9,  dim: 'mid-V / high-A', hex: '#D4537E', bg: '#FBEAF0', textColor: '#72243E' },
  { id: 'awe',       label: 'Awe',       valence: 0.7,  arousal: 0.6,  dim: 'high-V / mid-A', hex: '#7C3AED', bg: '#EDE9FE', textColor: '#4C1D95' },
  { id: 'hope',      label: 'Hope',      valence: 0.8,  arousal: 0.3,  dim: 'high-V / low-A', hex: '#10B981', bg: '#D1FAE5', textColor: '#064E3B' },
];

export const MOCK_OUTPUTS: Record<EmotionId, MockOutput> = {
  curiosity: {
    narrative:
      "The trajectory here is unusual enough to warrant a closer look: what exactly is driving this? The inflection in April is particularly striking — it fits neither random noise nor established seasonal patterns. The data itself is posing a question that remains unanswered, and the answer may only emerge in the next observation cycle.",
    visualProps: {
      primaryHex: '#F59E0B', saturation: '70%', strokeWeight: 1.5,
      animEasing: 'ease-in-out', chartForm: 'smooth', fillOpacity: 0.18,
    },
    data: [
      { month: 'Jan', value: 42 }, { month: 'Feb', value: 49 },
      { month: 'Mar', value: 46 }, { month: 'Apr', value: 63 },
      { month: 'May', value: 58 }, { month: 'Jun', value: 71 },
    ],
  },
  concern: {
    narrative:
      "These figures deserve careful attention. While overall numbers remain within acceptable bounds, the volatility concealed within them is unsettling. The month-to-month inconsistency suggests some external pressure is quietly eroding the underlying foundation — and it warrants vigilance before conditions deteriorate further.",
    visualProps: {
      primaryHex: '#378ADD', saturation: '55%', strokeWeight: 1.5,
      animEasing: 'ease-in-out', chartForm: 'jagged', fillOpacity: 0.10,
    },
    data: [
      { month: 'Jan', value: 45 }, { month: 'Feb', value: 49 },
      { month: 'Mar', value: 58 }, { month: 'Apr', value: 52 },
      { month: 'May', value: 67 }, { month: 'Jun', value: 60 },
    ],
  },
  tension: {
    narrative:
      "Pressure has built to a critical threshold. Three consecutive periods from March to May show that the negative deviations are no longer isolated events — they are a signal of systematic tightening. Each rebound has been absorbed by a deeper drawdown, and the accumulated gap is now sufficient to trigger structural risk. The window is narrowing.",
    visualProps: {
      primaryHex: '#DC2626', saturation: '90%', strokeWeight: 2.5,
      animEasing: 'ease-in', chartForm: 'jagged', fillOpacity: 0.08,
    },
    data: [
      { month: 'Jan', value: 58 }, { month: 'Feb', value: 62 },
      { month: 'Mar', value: 44 }, { month: 'Apr', value: 55 },
      { month: 'May', value: 38 }, { month: 'Jun', value: 47 },
    ],
  },
  surprise: {
    narrative:
      "June's figures completely overturn every prior trend projection. After five months of stable movement, a single month spiked to 112 — a deviation of more than 80% from the mean. This is not gradual change; it is a categorical break. Whether it signals opportunity or anomaly, the story has been fundamentally rewritten.",
    visualProps: {
      primaryHex: '#D4537E', saturation: '67%', strokeWeight: 1.5,
      animEasing: 'cubic-bezier(0.9,0,0.1,1)', chartForm: 'spike', fillOpacity: 0.15,
    },
    data: [
      { month: 'Jan', value: 45 }, { month: 'Feb', value: 52 },
      { month: 'Mar', value: 48 }, { month: 'Apr', value: 51 },
      { month: 'May', value: 49 }, { month: 'Jun', value: 112 },
    ],
  },
  awe: {
    narrative:
      "Only when you pull back from individual data points to the full growth curve does the true magnitude of these numbers become apparent. A cumulative gain of 67% within six months exceeds what is ordinarily called strong performance — it marks a genuine order-of-magnitude shift. When you are inside it, you almost always underestimate the scale of what is happening.",
    visualProps: {
      primaryHex: '#7C3AED', saturation: '75%', strokeWeight: 1.5,
      animEasing: 'ease-out', chartForm: 'smooth', fillOpacity: 0.22,
    },
    data: [
      { month: 'Jan', value: 38 }, { month: 'Feb', value: 47 },
      { month: 'Mar', value: 54 }, { month: 'Apr', value: 66 },
      { month: 'May', value: 75 }, { month: 'Jun', value: 89 },
    ],
  },
  hope: {
    narrative:
      "After an adjustment period through the first half of the year, a clear inflection emerged in May. June's reading of 59 has returned to the level seen at the start of the year, and the slope indicates momentum is still accumulating. Over the next two quarters, if external conditions hold, there is strong reason to expect this trajectory to continue upward.",
    visualProps: {
      primaryHex: '#10B981', saturation: '65%', strokeWeight: 1.2,
      animEasing: 'ease-out', chartForm: 'smooth', fillOpacity: 0.20,
    },
    data: [
      { month: 'Jan', value: 60 }, { month: 'Feb', value: 54 },
      { month: 'Mar', value: 49 }, { month: 'Apr', value: 51 },
      { month: 'May', value: 56 }, { month: 'Jun', value: 64 },
    ],
  },
};
