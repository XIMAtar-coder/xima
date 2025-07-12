import { XIMATAR_TYPES, XIMAtar } from '@/types/ximatar';

export const getXIMAtarById = (id: string): XIMAtar | undefined => {
  return XIMATAR_TYPES.find(ximatar => ximatar.id === id);
};

export const getXIMAtarByAssessment = (pillars: { [key: string]: number }): XIMAtar => {
  const { computational, communication, knowledge, creativity, drive } = pillars;
  
  // Find the highest scoring pillar
  const maxScore = Math.max(computational, communication, knowledge, creativity, drive);
  
  // Enhanced logic to determine XIMAtar based on pillar combinations
  if (drive === maxScore && drive >= 85) {
    if (communication >= 80) return getXIMAtarById('lion')!; // Lion - Executive Leader
    if (computational >= 80) return getXIMAtarById('bee')!; // Bee - Productive Worker
    return getXIMAtarById('horse')!; // Horse - Reliable Driver
  }
  
  if (computational === maxScore && computational >= 85) {
    if (creativity >= 80) return getXIMAtarById('cat')!; // Cat - Independent Specialist
    return getXIMAtarById('owl')!; // Owl - Analyst
  }
  
  if (communication === maxScore && communication >= 85) {
    if (creativity >= 75) return getXIMAtarById('parrot')!; // Parrot - Communicator
    if (knowledge >= 80) return getXIMAtarById('dolphin')!; // Dolphin - Team Facilitator
    return getXIMAtarById('fox')!; // Fox - Opportunist
  }
  
  if (creativity === maxScore && creativity >= 85) {
    if (communication >= 80) return getXIMAtarById('fox')!; // Fox - Opportunist
    return getXIMAtarById('cat')!; // Cat - Independent Specialist
  }
  
  if (knowledge === maxScore && knowledge >= 85) {
    return getXIMAtarById('elephant')!; // Elephant - Long-Term Strategist
  }
  
  // Check for balanced scores indicating specific types
  const averageScore = (computational + communication + knowledge + creativity + drive) / 5;
  
  if (Math.abs(computational - averageScore) <= 10 && Math.abs(creativity - averageScore) <= 10) {
    return getXIMAtarById('chameleon')!; // Chameleon - Adaptive Operator
  }
  
  if (drive >= 80 && communication >= 75) {
    return getXIMAtarById('wolf')!; // Wolf - Tactical Team Player
  }
  
  if (drive >= 80 && knowledge >= 75) {
    return getXIMAtarById('bear')!; // Bear - Reliable Guardian
  }
  
  // Default fallback
  return getXIMAtarById('horse')!; // Horse - Reliable Driver
};

export { XIMATAR_TYPES };