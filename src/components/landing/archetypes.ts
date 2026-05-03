export interface Archetype {
  id: string;
  name: string;
  trait: string;
  description: string;
  image: string;
  pillarScores: {
    drive: number;
    computational: number;
    knowledge: number;
    communication: number;
    creativity: number;
  };
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'horse',
    name: 'Horse',
    trait: 'High Drive',
    description:
      "We don't define people with labels. We reveal the dynamic between what moves them, what lifts them, and what holds them back.",
    image: '/ximatars/horse.png',
    pillarScores: { drive: 8.1, computational: 7.1, knowledge: 5.6, communication: 2.6, creativity: 5.8 },
  },
  {
    id: 'owl',
    name: 'Owl',
    trait: 'Deep Knowledge',
    description:
      'The Owl sees what others miss. Analytical depth meets patient observation — a mind that finds patterns where others see noise.',
    image: '/ximatars/owl.png',
    pillarScores: { drive: 4.2, computational: 8.5, knowledge: 9.1, communication: 3.8, creativity: 6.2 },
  },
  {
    id: 'lion',
    name: 'Lion',
    trait: 'Natural Leader',
    description:
      'The Lion leads not by title, but by presence. Drive meets communication in someone who moves teams by clarity and conviction.',
    image: '/ximatars/lion.png',
    pillarScores: { drive: 9.0, computational: 5.5, knowledge: 6.0, communication: 8.7, creativity: 4.3 },
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    trait: 'Creative Communicator',
    description:
      'The Dolphin bridges worlds. High creativity meets strong communication — ideas flow freely and connect with everyone around them.',
    image: '/ximatars/dolphin.png',
    pillarScores: { drive: 5.5, computational: 4.8, knowledge: 5.2, communication: 8.9, creativity: 8.4 },
  },
  {
    id: 'fox',
    name: 'Fox',
    trait: 'Strategic Thinker',
    description:
      'The Fox adapts and outmaneuvers. Computational power meets creativity in someone who finds elegant solutions to complex problems.',
    image: '/ximatars/fox.png',
    pillarScores: { drive: 6.3, computational: 8.8, knowledge: 6.5, communication: 5.1, creativity: 7.9 },
  },
  {
    id: 'wolf',
    name: 'Wolf',
    trait: 'Pack Strategist',
    description:
      'The Wolf builds and leads from within. Strategic thinking meets unwavering drive — the one who holds the pack together under pressure.',
    image: '/ximatars/wolf.png',
    pillarScores: { drive: 7.8, computational: 7.2, knowledge: 6.8, communication: 7.5, creativity: 5.4 },
  },
];
