export interface XIMAtar {
  id: string;
  name: string;
  animal: string;
  title: string;
  description: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  idealRoles: string[];
  image: string;
  personality: {
    en: {
      description: string;
      traits: string[];
      strengths: string[];
      weaknesses: string[];
      idealRoles: string[];
    };
    it: {
      description: string;
      traits: string[];
      strengths: string[];
      weaknesses: string[];
      idealRoles: string[];
    };
  };
}

export const XIMATAR_TYPES: XIMAtar[] = [
  {
    id: 'lion',
    name: 'Lion',
    animal: 'Lion',
    title: 'The Executive Leader',
    description: 'Assertive, strategic, commanding',
    traits: ['Assertive', 'Strategic', 'Commanding', 'Decisive', 'Confident'],
    strengths: ['Natural leadership', 'Strategic thinking', 'Decision making', 'Goal-oriented'],
    weaknesses: ['Can be overly dominant', 'May overlook details', 'Impatient with others'],
    idealRoles: ['CEO', 'Project Lead', 'Executive', 'Team Leader'],
    image: '/ximatars/lion.png',
    personality: {
      en: {
        description: 'The Lion XIMAtar represents natural born leaders who thrive in positions of authority. They are strategic thinkers who can see the big picture and make decisive choices under pressure.',
        traits: ['Assertive', 'Strategic', 'Commanding', 'Decisive', 'Confident'],
        strengths: ['Natural leadership abilities', 'Strategic thinking', 'Quick decision making', 'Goal-oriented mindset', 'Inspiring others'],
        weaknesses: ['Can be overly dominant', 'May overlook important details', 'Impatient with slower processes', 'Risk of micromanaging'],
        idealRoles: ['CEO', 'Project Lead', 'Executive Director', 'Team Leader', 'Department Head']
      },
      it: {
        description: 'Il XIMAtar Leone rappresenta i leader naturali che prosperano in posizioni di autorità. Sono pensatori strategici che riescono a vedere il quadro generale e prendere decisioni decisive sotto pressione.',
        traits: ['Assertivo', 'Strategico', 'Dominante', 'Decisivo', 'Sicuro di sé'],
        strengths: ['Capacità di leadership naturali', 'Pensiero strategico', 'Presa di decisioni rapida', 'Mentalità orientata agli obiettivi', 'Ispirare gli altri'],
        weaknesses: ['Può essere eccessivamente dominante', 'Può trascurare dettagli importanti', 'Impaziente con processi più lenti', 'Rischio di microgestione'],
        idealRoles: ['CEO', 'Capo Progetto', 'Direttore Esecutivo', 'Team Leader', 'Capo Dipartimento']
      }
    }
  },
  {
    id: 'owl',
    name: 'Owl',
    animal: 'owl',
    title: 'The Analytical Thinker',
    description: 'The Owl is a seeker of truth. Quietly powerful, they excel at making sense of complexity and using logic to guide decisions. Knowledge-driven, they transform data into insight and insight into foresight.',
    traits: ['Wise', 'Analytical', 'Reflective', 'Detail-Oriented', 'Strategic'],
    strengths: ['Analysis', 'Insight', 'Focus', 'Data-Driven Decision Making', 'Pattern Recognition'],
    weaknesses: ['May overthink decisions', 'Can struggle with execution speed', 'Sometimes too cautious'],
    idealRoles: ['Research Analyst', 'Data Scientist', 'Strategic Planner', 'Knowledge Manager', 'Risk Analyst', 'Compliance Officer'],
    image: '/ximatars/owl.png',
    personality: {
      en: {
        description: 'The Owl is a seeker of truth. Quietly powerful, they excel at making sense of complexity and using logic to guide decisions. Knowledge-driven, they transform data into insight and insight into foresight.',
        traits: ['Wise', 'Analytical', 'Reflective', 'Detail-Oriented', 'Strategic'],
        strengths: ['Analysis', 'Insight', 'Focus', 'Data-Driven Decision Making', 'Pattern Recognition'],
        weaknesses: ['May overthink decisions', 'Can struggle with execution speed', 'Sometimes too cautious'],
        idealRoles: ['Research Analyst', 'Data Scientist', 'Strategic Planner', 'Knowledge Manager', 'Risk Analyst', 'Compliance Officer']
      },
      it: {
        description: 'Il Gufo è un cercatore di verità. Silenziosamente potente, eccelle nel dare senso alla complessità e nell\'usare la logica per guidare le decisioni. Guidato dalla conoscenza, trasforma i dati in intuizioni e le intuizioni in previsioni.',
        traits: ['Saggio', 'Analitico', 'Riflessivo', 'Attento ai Dettagli', 'Strategico'],
        strengths: ['Analisi', 'Intuizione', 'Concentrazione', 'Decisioni Basate sui Dati', 'Riconoscimento di Pattern'],
        weaknesses: ['Può riflettere troppo sulle decisioni', 'Può avere difficoltà con la velocità di esecuzione', 'A volte troppo cauto'],
        idealRoles: ['Analista di Ricerca', 'Data Scientist', 'Pianificatore Strategico', 'Knowledge Manager', 'Analista del Rischio', 'Responsabile Conformità']
      }
    }
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    animal: 'dolphin',
    title: 'The Team Facilitator',
    description: 'The Dolphin radiates positivity. Socially attuned and emotionally intelligent, they thrive in collaborative settings and spread harmony. They are the ultimate team players with a natural touch for relationships.',
    traits: ['Empathetic', 'Collaborative', 'Emotionally Intelligent', 'Harmonious', 'Social'],
    strengths: ['Empathy', 'Collaboration', 'Emotional Insight', 'Team Building', 'Conflict Resolution'],
    weaknesses: ['May avoid confrontation', 'Needs external motivation', 'Can be overly accommodating'],
    idealRoles: ['HR Manager', 'Team Facilitator', 'Customer Support', 'Community Manager', 'Wellness Coach', 'Mediator'],
    image: '/ximatars/dolphin.png',
    personality: {
      en: {
        description: 'The Dolphin radiates positivity. Socially attuned and emotionally intelligent, they thrive in collaborative settings and spread harmony. They are the ultimate team players with a natural touch for relationships.',
        traits: ['Empathetic', 'Collaborative', 'Emotionally Intelligent', 'Harmonious', 'Social'],
        strengths: ['Empathy', 'Collaboration', 'Emotional Insight', 'Team Building', 'Conflict Resolution'],
        weaknesses: ['May avoid confrontation', 'Needs external motivation', 'Can be overly accommodating'],
        idealRoles: ['HR Manager', 'Team Facilitator', 'Customer Support', 'Community Manager', 'Wellness Coach', 'Mediator']
      },
      it: {
        description: 'Il Delfino irradia positività. Socialmente sintonizzato ed emotivamente intelligente, prospera in contesti collaborativi e diffonde armonia. È il compagno di squadra definitivo con un tocco naturale per le relazioni.',
        traits: ['Empatico', 'Collaborativo', 'Emotivamente Intelligente', 'Armonioso', 'Sociale'],
        strengths: ['Empatia', 'Collaborazione', 'Intuizione Emotiva', 'Team Building', 'Risoluzione dei Conflitti'],
        weaknesses: ['Può evitare il confronto', 'Ha bisogno di motivazione esterna', 'Può essere eccessivamente accomodante'],
        idealRoles: ['HR Manager', 'Facilitatore di Team', 'Supporto Clienti', 'Community Manager', 'Coach del Benessere', 'Mediatore']
      }
    }
  },
  {
    id: 'fox',
    name: 'Fox',
    animal: 'Fox',
    title: 'The Opportunist',
    description: 'Persuasive, clever, adaptive',
    traits: ['Persuasive', 'Clever', 'Adaptive', 'Quick-thinking', 'Resourceful'],
    strengths: ['Sales ability', 'Adaptability', 'Creative solutions', 'Networking'],
    weaknesses: ['May be overly opportunistic', 'Can lack follow-through', 'Risk of being manipulative'],
    idealRoles: ['Sales', 'Marketing', 'Business Development', 'Entrepreneur'],
    image: '/lovable-uploads/c070e0d9-286c-45cb-9a35-39b053c368a5.png', // Fox avatar
    personality: {
      en: {
        description: 'The Fox XIMAtar represents clever opportunists who excel at identifying and seizing business opportunities. They are persuasive, adaptable, and skilled at finding creative solutions to challenges.',
        traits: ['Persuasive', 'Clever', 'Adaptive', 'Quick-thinking', 'Resourceful'],
        strengths: ['Exceptional sales abilities', 'High adaptability', 'Creative problem solving', 'Strong networking skills', 'Opportunity recognition'],
        weaknesses: ['May be overly opportunistic', 'Can lack follow-through', 'Risk of being manipulative', 'May prioritize short-term gains'],
        idealRoles: ['Sales Manager', 'Marketing Director', 'Business Development', 'Entrepreneur', 'Account Manager']
      },
      it: {
        description: 'Il XIMAtar Volpe rappresenta opportunisti intelligenti che eccellono nell\'identificare e cogliere opportunità di business. Sono persuasivi, adattabili e abili nel trovare soluzioni creative alle sfide.',
        traits: ['Persuasivo', 'Intelligente', 'Adattabile', 'Pensatore rapido', 'Intraprendente'],
        strengths: ['Eccezionali capacità di vendita', 'Alta adattabilità', 'Risoluzione creativa dei problemi', 'Forti capacità di networking', 'Riconoscimento opportunità'],
        weaknesses: ['Può essere eccessivamente opportunista', 'Può mancare di costanza', 'Rischio di essere manipolativo', 'Può prioritizzare guadagni a breve termine'],
        idealRoles: ['Manager Vendite', 'Direttore Marketing', 'Sviluppo Business', 'Imprenditore', 'Account Manager']
      }
    }
  },
  {
    id: 'bear',
    name: 'Bear',
    animal: 'Bear',
    title: 'The Grounded Protector',
    description: 'The Bear acts with patience and stability. They move slowly but decisively. Others rely on them during pressure, trusting their strength and reliability.',
    traits: ['Grounded', 'Strong', 'Protective', 'Patient', 'Stable'],
    strengths: ['Resilience', 'Responsibility', 'Calm Under Pressure', 'Reliability', 'Steadfast'],
    weaknesses: ['Slower to adapt', 'Prefers routine', 'May resist change'],
    idealRoles: ['Operations Lead', 'Team Anchor', 'People Manager', 'Governance', 'Compliance', 'Security'],
    image: '/ximatars/bear.png',
    personality: {
      en: {
        description: 'Moves slowly but decisively. Provides stability under pressure. Reliable and protective. The Bear acts with patience and stability, moving deliberately while maintaining calm in high-pressure situations.',
        traits: ['Grounded', 'Strong', 'Protective', 'Patient', 'Stable'],
        strengths: ['Resilience', 'Responsibility', 'Calm Under Pressure', 'Reliability', 'Steadfast Support'],
        weaknesses: ['Slower to adapt', 'Prefers routine', 'May resist change', 'Less comfortable with rapid innovation'],
        idealRoles: ['Operations Lead', 'Team Anchor', 'People Manager', 'Governance', 'Security/Compliance', 'Quality Assurance']
      },
      it: {
        description: 'Si muove lentamente ma con decisione. Porta stabilità sotto pressione. Affidabile e protettivo. L\'Orso agisce con pazienza e stabilità, muovendosi in modo deliberato mantenendo la calma nelle situazioni di alta pressione.',
        traits: ['Solido', 'Forte', 'Protettivo', 'Paziente', 'Stabile'],
        strengths: ['Resilienza', 'Responsabilità', 'Calma sotto pressione', 'Affidabilità', 'Supporto Costante'],
        weaknesses: ['Lento ad adattarsi', 'Preferisce la routine', 'Può resistere al cambiamento', 'Meno a suo agio con innovazione rapida'],
        idealRoles: ['Responsabile Operativo', 'Team Anchor', 'Manager', 'Governance', 'Sicurezza/Compliance', 'Controllo Qualità']
      }
    }
  },
  {
    id: 'cat',
    name: 'Cat',
    animal: 'cat',
    title: 'The Independent Specialist',
    description: 'The Cat values freedom and discretion. Curious and highly selective, they invest their energy only where it matters. They excel when trusted to operate independently and follow their instincts.',
    traits: ['Independent', 'Observant', 'Strategic', 'Selective', 'Focused'],
    strengths: ['Focus', 'Strategic Thinking', 'Autonomy', 'Technical Expertise', 'Creative Problem-Solving'],
    weaknesses: ['May resist collaboration or emotional openness', 'Can be aloof', 'Selective about engagement'],
    idealRoles: ['Analyst', 'Solo Specialist', 'R&D', 'Technical Strategist', 'Creative Problem-Solver', 'Independent Consultant'],
    image: '/ximatars/cat.png',
    personality: {
      en: {
        description: 'The Cat values freedom and discretion. Curious and highly selective, they invest their energy only where it matters. They excel when trusted to operate independently and follow their instincts. Silent observer. Precision-first. Works best with space and independence.',
        traits: ['Independent', 'Observant', 'Strategic', 'Selective', 'Focused'],
        strengths: ['Focus', 'Strategic Thinking', 'Autonomy', 'Technical Expertise', 'Creative Problem-Solving'],
        weaknesses: ['May resist collaboration or emotional openness', 'Can be aloof', 'Selective about engagement'],
        idealRoles: ['Analyst', 'Solo Specialist', 'R&D', 'Technical Strategist', 'Creative Problem-Solver', 'Independent Consultant']
      },
      it: {
        description: 'Il Gatto valorizza la libertà e la discrezione. Curioso e selettivo, investe la propria energia solo dove serve davvero. Rende al massimo quando gli viene concessa autonomia e fiducia. Osservatore silenzioso. Precisione prima di tutto. Rende al massimo con spazio e indipendenza.',
        traits: ['Indipendente', 'Osservatore', 'Strategico', 'Selettivo', 'Concentrato'],
        strengths: ['Focus', 'Pensiero Strategico', 'Autonomia', 'Expertise Tecnica', 'Problem-Solving Creativo'],
        weaknesses: ['Può resistere alla collaborazione o all\'apertura emotiva', 'Può essere distaccato', 'Selettivo nel coinvolgimento'],
        idealRoles: ['Analista', 'Specialista Indipendente', 'R&D', 'Stratega Tecnico', 'Problem-Solver Creativo', 'Consulente Indipendente']
      }
    }
  },
  {
    id: 'bee',
    name: 'Bee',
    animal: 'Bee',
    title: 'The Purposeful Contributor',
    description: 'The Bee works with intention and commitment to the greater good. Thrives in structured environments and contributes tirelessly to team outcomes.',
    traits: ['Diligent', 'Community-Driven', 'Purposeful', 'Disciplined', 'Structured'],
    strengths: ['Discipline', 'Structure', 'Team Contribution', 'Process Adherence', 'Consistency'],
    weaknesses: ['May resist improvisation', 'Needs a clear mission', 'Less comfortable with ambiguity'],
    idealRoles: ['Operations Coordinator', 'Team Support Specialist', 'Process Manager', 'Customer Success', 'Administrative Roles'],
    image: '/ximatars/bee.png',
    personality: {
      en: {
        description: 'The Bee works with intention and commitment to the greater good. Thrives in structured environments and contributes tirelessly to shared outcomes. Disciplined and purpose-driven.',
        traits: ['Diligent', 'Community-Driven', 'Purposeful', 'Disciplined', 'Structured'],
        strengths: ['Discipline', 'Structure', 'Team Contribution', 'Process Adherence', 'Consistency'],
        weaknesses: ['May resist improvisation', 'Needs a clear mission', 'Less comfortable with ambiguity', 'Prefers defined paths'],
        idealRoles: ['Operations Coordinator', 'Team Support Specialist', 'Process Manager', 'Customer Success', 'Administrative Roles']
      },
      it: {
        description: 'L\'Ape lavora con intenzione e impegno verso il bene comune. Prospera in ambienti strutturati e contribuisce instancabilmente ai risultati del team. Disciplinata e guidata dallo scopo.',
        traits: ['Diligente', 'Orientato alla Comunità', 'Guidato dallo Scopo', 'Disciplinato', 'Strutturato'],
        strengths: ['Disciplina', 'Struttura', 'Contributo al Team', 'Aderenza ai Processi', 'Costanza'],
        weaknesses: ['Può resistere all\'improvvisazione', 'Ha bisogno di una missione chiara', 'Meno a suo agio con l\'ambiguità', 'Preferisce percorsi definiti'],
        idealRoles: ['Coordinatore Operativo', 'Supporto Team', 'Manager dei Processi', 'Customer Success', 'Ruoli Amministrativi']
      }
    }
  },
  {
    id: 'parrot',
    name: 'Parrot',
    animal: 'Parrot',
    title: 'The Charismatic Communicator',
    description: 'The Parrot brings color and charisma to every interaction. Gifted in communication, they spread ideas with passion and ease.',
    traits: ['Storytelling', 'Motivation', 'Verbal Agility', 'Social Intelligence'],
    strengths: ['Storytelling', 'Motivation', 'Verbal Agility', 'Social Intelligence'],
    weaknesses: ['May prioritize expression over analysis', 'Can be overly talkative'],
    idealRoles: ['Sales', 'Marketing', 'Public Speaking', 'Community Management', 'Brand Ambassador', 'Content Creator'],
    image: '/ximatars/parrot.png',
    personality: {
      en: {
        description: 'Parrots bring energy and color to every conversation. They excel at spreading ideas with passion and connecting people through words. Natural storytellers who thrive in social environments.',
        traits: ['Storytelling', 'Motivation', 'Verbal Agility', 'Social Intelligence'],
        strengths: ['Exceptional storytelling abilities', 'Powerful motivation skills', 'Verbal agility and expression', 'Strong social intelligence', 'Natural networking'],
        weaknesses: ['May prioritize expression over deep analysis', 'Can be overly talkative', 'Difficulty with analytical tasks', 'May struggle with solitary work'],
        idealRoles: ['Sales Representative', 'Marketing Manager', 'Public Speaker', 'Community Manager', 'Brand Ambassador', 'Content Creator']
      },
      it: {
        description: 'I Pappagalli portano energia e colore in ogni conversazione. Eccellono nel diffondere idee con passione e nel connettere le persone attraverso le parole. Narratori naturali che prosperano in ambienti sociali.',
        traits: ['Narrazione', 'Motivazione', 'Agilità Verbale', 'Intelligenza Sociale'],
        strengths: ['Eccezionali capacità di narrazione', 'Forti capacità motivazionali', 'Agilità verbale ed espressiva', 'Forte intelligenza sociale', 'Networking naturale'],
        weaknesses: ['Può privilegiare l\'espressione rispetto all\'analisi profonda', 'Può essere eccessivamente loquace', 'Difficoltà con compiti analitici', 'Può avere difficoltà con il lavoro solitario'],
        idealRoles: ['Rappresentante Vendite', 'Manager Marketing', 'Oratore Pubblico', 'Community Manager', 'Brand Ambassador', 'Content Creator']
      }
    }
  },
  {
    id: 'elephant',
    name: 'Elephant',
    animal: 'Elephant',
    title: 'The Wise Strategist',
    description: 'Reflective, experienced, long-term thinker',
    traits: ['Memory', 'Emotional Intelligence', 'Long-Term Thinking', 'Wisdom', 'Patience'],
    strengths: ['Memory', 'Emotional Intelligence', 'Long-Term Thinking', 'Strategic planning'],
    weaknesses: ['Resistance to rapid change', 'Cautious', 'Slow to act on urgency'],
    idealRoles: ['Chief Strategy Officer', 'Board Member', 'Senior Advisor', 'Executive Coach', 'Governance Director'],
    image: '/ximatars/elephant.png',
    personality: {
      en: {
        description: 'The Elephant carries the weight of experience with grace. Slow to speak but deeply reflective, they remember what matters and act with foresight. Others turn to them for stability and perspective.',
        traits: ['Memory', 'Emotional Intelligence', 'Long-Term Thinking', 'Wisdom', 'Patience'],
        strengths: ['Exceptional strategic planning', 'Long-term visionary thinking', 'Deep wisdom and experience', 'Natural mentoring abilities', 'Institutional memory and recall'],
        weaknesses: ['Resistance to rapid change', 'Cautious approach', 'May be slow to take action', 'Can overthink decisions', 'Struggles with urgent deadlines'],
        idealRoles: ['Chief Strategy Officer', 'Board Member', 'Senior Advisor', 'Executive Coach', 'Governance Director', 'Strategic Consultant']
      },
      it: {
        description: 'L\'Elefante porta il peso dell\'esperienza con grazia. Lento nel parlare ma profondamente riflessivo, ricorda ciò che conta e agisce con lungimiranza. Altri si rivolgono a loro per stabilità e prospettiva.',
        traits: ['Memoria', 'Intelligenza Emotiva', 'Pensiero a Lungo Termine', 'Saggezza', 'Pazienza'],
        strengths: ['Pianificazione strategica eccezionale', 'Pensiero visionario a lungo termine', 'Profonda saggezza ed esperienza', 'Capacità naturali di mentoring', 'Memoria e richiamo istituzionali'],
        weaknesses: ['Resistenza al cambiamento rapido', 'Approccio cauto', 'Può essere lento nell\'agire', 'Può riflettere troppo sulle decisioni', 'Fatica con scadenze urgenti'],
        idealRoles: ['Chief Strategy Officer', 'Membro del Consiglio', 'Senior Advisor', 'Executive Coach', 'Direttore Governance', 'Consulente Strategico']
      }
    }
  },
  {
    id: 'wolf',
    name: 'Wolf',
    animal: 'Wolf',
    title: 'The Tactical Team Player',
    description: 'Strategic, loyal, pack-oriented',
    traits: ['Teamwork', 'Strategy', 'Integrity', 'Loyalty', 'Coordination'],
    strengths: ['Teamwork', 'Strategy', 'Integrity', 'Loyalty'],
    weaknesses: ['Rigidity in hierarchy', 'Difficulty when isolated', 'Group dependency'],
    idealRoles: ['Scrum Master', 'Agile Coach', 'Team Coordinator', 'Project Manager', 'Squad Leader'],
    image: '/ximatars/wolf.png',
    personality: {
      en: {
        description: 'The Wolf thrives in packs. They are strategic thinkers who value trust, loyalty, and well-defined roles. Wolves are natural team players, often emerging as respected coordinators or quiet leaders within a group.',
        traits: ['Teamwork', 'Strategy', 'Integrity', 'Loyalty', 'Coordination'],
        strengths: ['Exceptional team coordination', 'Tactical and strategic planning', 'High adaptability in group settings', 'Strong loyalty and integrity', 'Natural facilitation skills'],
        weaknesses: ['Rigidity in hierarchy', 'Difficulty when isolated from team', 'Can be overly dependent on group dynamics', 'May avoid individual leadership'],
        idealRoles: ['Scrum Master', 'Agile Coach', 'Team Coordinator', 'Project Manager', 'Squad Leader', 'Operations Manager']
      },
      it: {
        description: 'Il Lupo prospera nel branco. Sono pensatori strategici che valorizzano fiducia, lealtà e ruoli ben definiti. I Lupi sono giocatori di squadra naturali, spesso emergono come coordinatori rispettati o leader silenziosi all\'interno del gruppo.',
        traits: ['Lavoro di squadra', 'Strategia', 'Integrità', 'Lealtà', 'Coordinamento'],
        strengths: ['Coordinamento di squadra eccezionale', 'Pianificazione tattica e strategica', 'Alta adattabilità in contesti di gruppo', 'Forte lealtà e integrità', 'Abilità naturali di facilitazione'],
        weaknesses: ['Rigidità nella gerarchia', 'Difficoltà quando isolati dal team', 'Possono essere eccessivamente dipendenti dalle dinamiche di gruppo', 'Possono evitare leadership individuale'],
        idealRoles: ['Scrum Master', 'Agile Coach', 'Coordinatore Team', 'Project Manager', 'Squad Leader', 'Operations Manager']
      }
    }
  },
  {
    id: 'chameleon',
    name: 'Chameleon',
    animal: 'Chameleon',
    title: 'The Adaptive Operator',
    description: 'Curious, analytical, fast learner',
    traits: ['Flexibility', 'Learning Speed', 'Perception', 'Adaptability', 'Pattern Recognition'],
    strengths: ['Flexibility', 'Learning Speed', 'Perception', 'Adaptability'],
    weaknesses: ['May over-adapt', 'Lack of assertiveness', 'Identity diffusion'],
    idealRoles: ['Analyst', 'Researcher', 'Consultant', 'Problem Solver', 'Strategic Advisor'],
    image: '/ximatars/chameleon.png',
    personality: {
      en: {
        description: 'The Chameleon blends seamlessly into any context. Curious and analytical, they learn fast and adapt even faster. Their strength lies in spotting patterns others miss and navigating change with ease.',
        traits: ['Flexibility', 'Learning Speed', 'Perception', 'Adaptability', 'Pattern Recognition'],
        strengths: ['Exceptional flexibility and adaptability', 'Rapid learning capabilities', 'Strong perception and environmental awareness', 'Pattern recognition skills', 'Thrives in dynamic environments'],
        weaknesses: ['May over-adapt to surroundings', 'Can lack strong personal identity', 'Struggles with assertiveness in conflict', 'Difficulty maintaining consistency'],
        idealRoles: ['Analyst', 'Researcher', 'Management Consultant', 'Problem Solver', 'Strategic Advisor', 'Change Management Specialist']
      },
      it: {
        description: 'Il Camaleonte si fonde perfettamente in qualsiasi contesto. Curioso e analitico, impara velocemente e si adatta ancora più rapidamente. La sua forza sta nello scoprire schemi che altri non vedono e nel navigare il cambiamento con facilità.',
        traits: ['Flessibilità', 'Velocità di Apprendimento', 'Percezione', 'Adattabilità', 'Riconoscimento Pattern'],
        strengths: ['Flessibilità e adattabilità eccezionali', 'Capacità di apprendimento rapido', 'Forte percezione e consapevolezza ambientale', 'Abilità di riconoscimento pattern', 'Prospera in ambienti dinamici'],
        weaknesses: ['Può adattarsi eccessivamente', 'Può mancare di forte identità personale', 'Fatica con l\'assertività nei conflitti', 'Difficoltà nel mantenere la consistenza'],
        idealRoles: ['Analista', 'Ricercatore', 'Consulente di Management', 'Problem Solver', 'Consulente Strategico', 'Specialista Change Management']
      }
    }
  },
  {
    id: 'horse',
    name: 'Horse',
    animal: 'Horse',
    title: 'The Reliable Driver',
    description: 'Persistent, dutiful, goal-driven',
    traits: ['Persistent', 'Dutiful', 'Goal-driven', 'Dependable', 'Enduring'],
    strengths: ['Reliability', 'Endurance', 'Loyalty', 'Work ethic'],
    weaknesses: ['Risk aversion', 'Low flexibility', 'Difficulty with change'],
    idealRoles: ['Project Manager', 'Operations Lead', 'Logistics Coordinator', 'Quality Assurance'],
    image: '/ximatars/horse.png',
    personality: {
      en: {
        description: 'The Horse XIMAtar thrives on persistence and duty. Always moving forward, they are driven by goals and a strong work ethic. Others rely on them to carry the team across the finish line, no matter how hard the path.',
        traits: ['Persistent', 'Dutiful', 'Goal-driven', 'Dependable', 'Enduring'],
        strengths: ['Exceptional reliability', 'High endurance and stamina', 'Strong loyalty to team and goals', 'Unwavering work ethic', 'Steady progress delivery'],
        weaknesses: ['Risk aversion', 'Low flexibility', 'Difficulty adapting to change', 'May struggle with creative exploration'],
        idealRoles: ['Project Manager', 'Operations Lead', 'Logistics Coordinator', 'Quality Assurance Manager', 'Implementation Specialist']
      },
      it: {
        description: 'Il XIMAtar Cavallo prospera sulla persistenza e il dovere. Sempre in movimento, sono guidati da obiettivi e una forte etica del lavoro. Gli altri fanno affidamento su di loro per portare il team al traguardo, non importa quanto difficile sia il percorso.',
        traits: ['Persistente', 'Dovere', 'Orientato agli obiettivi', 'Affidabile', 'Resistente'],
        strengths: ['Affidabilità eccezionale', 'Alta resistenza e energia', 'Forte lealtà al team e agli obiettivi', 'Etica del lavoro incrollabile', 'Consegna di progresso costante'],
        weaknesses: ['Avversione al rischio', 'Bassa flessibilità', 'Difficoltà ad adattarsi al cambiamento', 'Può avere difficoltà con l\'esplorazione creativa'],
        idealRoles: ['Project Manager', 'Responsabile Operazioni', 'Coordinatore Logistico', 'Manager Controllo Qualità', 'Specialista Implementazione']
      }
    }
  }
];

export function getXIMAtarByAssessment(pillars: any): XIMAtar {
  // Simple logic to assign XIMAtar based on highest pillar scores
  // This can be enhanced with more sophisticated algorithms
  const pillarEntries = Object.entries(pillars) as [string, number][];
  const topPillar = pillarEntries.reduce((max, [pillar, score]) => 
    score > max[1] ? [pillar, score] : max
  );

  // Map pillars to XIMAtar types (simplified mapping)
  const pillarToXIMAtar: { [key: string]: string } = {
    'computational': 'owl',
    'communication': 'parrot',
    'knowledge': 'elephant',
    'creativity': 'cat',
    'drive': 'lion'
  };

  const ximatarId = pillarToXIMAtar[topPillar[0]] || 'lion';
  return XIMATAR_TYPES.find(x => x.id === ximatarId) || XIMATAR_TYPES[0];
}