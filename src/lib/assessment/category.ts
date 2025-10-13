export type CategoryId = 'comp_power' | 'communication' | 'knowledge' | 'creativity' | 'drive';

// Map localized labels → canonical IDs for IT/EN/ES
const MAP_IT: Record<string, CategoryId> = {
  'Potenza Computazionale': 'comp_power',
  'Comunicazione': 'communication',
  'Conoscenza': 'knowledge',
  'Creatività': 'creativity',
  'Motivazione': 'drive'
};

const MAP_EN: Record<string, CategoryId> = {
  'Computational Power': 'comp_power',
  'Communication': 'communication',
  'Knowledge': 'knowledge',
  'Creativity': 'creativity',
  'Drive': 'drive'
};

const MAP_ES: Record<string, CategoryId> = {
  'Potencia Computacional': 'comp_power',
  'Comunicación': 'communication',
  'Conocimiento': 'knowledge',
  'Creatividad': 'creativity',
  'Impulso': 'drive'
};

export function toCategoryId(localizedLabel: string, lang: string): CategoryId {
  const code = (lang || 'it').slice(0, 2);
  const label = (localizedLabel || '').trim();
  
  const hit =
    (code === 'it' ? MAP_IT[label] :
     code === 'es' ? MAP_ES[label] : MAP_EN[label]);
  
  return hit || 'creativity'; // safe default
}
