import { useEmotionStore } from '../store/emotionStore';
import { translations } from './translations';

export function useT() {
  const language = useEmotionStore(s => s.language);
  return translations[language];
}
