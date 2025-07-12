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
    image: '/lovable-uploads/29354704-151e-4e3c-a9ae-adfe07e62896.png', // Lion image
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
    animal: 'Owl',
    title: 'The Analyst',
    description: 'Rational, precise, data-driven',
    traits: ['Rational', 'Precise', 'Data-driven', 'Methodical', 'Thorough'],
    strengths: ['Analytical thinking', 'Attention to detail', 'Problem solving', 'Research skills'],
    weaknesses: ['Can be overly critical', 'May overthink decisions', 'Struggles with ambiguity'],
    idealRoles: ['Analyst', 'Engineer', 'Researcher', 'Data Scientist'],
    image: '/lovable-uploads/ae79af7a-e780-4f42-8fbf-529eb1e4d1f8.png', // Owl image
    personality: {
      en: {
        description: 'The Owl XIMAtar represents analytical minds who excel at processing information and finding logical solutions. They are methodical, precise, and driven by data and facts.',
        traits: ['Rational', 'Precise', 'Data-driven', 'Methodical', 'Thorough'],
        strengths: ['Exceptional analytical thinking', 'Attention to detail', 'Complex problem solving', 'Research and investigation skills', 'Logical reasoning'],
        weaknesses: ['Can be overly critical', 'May overthink decisions', 'Struggles with ambiguous situations', 'Difficulty with quick decisions'],
        idealRoles: ['Business Analyst', 'Software Engineer', 'Research Scientist', 'Data Scientist', 'Quality Assurance']
      },
      it: {
        description: 'Il XIMAtar Gufo rappresenta menti analitiche che eccellono nell\'elaborazione di informazioni e nella ricerca di soluzioni logiche. Sono metodici, precisi e guidati da dati e fatti.',
        traits: ['Razionale', 'Preciso', 'Guidato dai dati', 'Metodico', 'Approfondito'],
        strengths: ['Pensiero analitico eccezionale', 'Attenzione ai dettagli', 'Risoluzione di problemi complessi', 'Capacità di ricerca e investigazione', 'Ragionamento logico'],
        weaknesses: ['Può essere eccessivamente critico', 'Può riflettere troppo sulle decisioni', 'Ha difficoltà con situazioni ambigue', 'Difficoltà con decisioni rapide'],
        idealRoles: ['Analista di Business', 'Ingegnere Software', 'Ricercatore Scientifico', 'Data Scientist', 'Controllo Qualità']
      }
    }
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    animal: 'Dolphin',
    title: 'The Team Facilitator',
    description: 'Empathetic, morale-builder',
    traits: ['Empathetic', 'Collaborative', 'Supportive', 'Intuitive', 'Harmonious'],
    strengths: ['Team building', 'Emotional intelligence', 'Conflict resolution', 'Motivation'],
    weaknesses: ['May avoid difficult conversations', 'Can be too accommodating', 'Struggles with tough decisions'],
    idealRoles: ['HR', 'Coach', 'Team Facilitator', 'Counselor'],
    image: '/placeholder.svg', // Placeholder for Dolphin
    personality: {
      en: {
        description: 'The Dolphin XIMAtar represents natural team facilitators who excel at bringing people together and creating harmonious work environments. They are highly empathetic and skilled at understanding team dynamics.',
        traits: ['Empathetic', 'Collaborative', 'Supportive', 'Intuitive', 'Harmonious'],
        strengths: ['Exceptional team building skills', 'High emotional intelligence', 'Conflict resolution abilities', 'Natural motivation skills', 'Creating inclusive environments'],
        weaknesses: ['May avoid difficult conversations', 'Can be too accommodating', 'Struggles with tough decisions', 'May prioritize harmony over efficiency'],
        idealRoles: ['HR Manager', 'Team Coach', 'Project Facilitator', 'Counselor', 'Training Coordinator']
      },
      it: {
        description: 'Il XIMAtar Delfino rappresenta facilitatori di team naturali che eccellono nel riunire le persone e creare ambienti di lavoro armoniosi. Sono altamente empatici e abili nel comprendere le dinamiche di gruppo.',
        traits: ['Empatico', 'Collaborativo', 'Supportivo', 'Intuitivo', 'Armonioso'],
        strengths: ['Eccezionali capacità di team building', 'Alta intelligenza emotiva', 'Capacità di risoluzione conflitti', 'Capacità motivazionali naturali', 'Creazione di ambienti inclusivi'],
        weaknesses: ['Può evitare conversazioni difficili', 'Può essere troppo accomodante', 'Ha difficoltà con decisioni difficili', 'Può prioritizzare l\'armonia sull\'efficienza'],
        idealRoles: ['Manager HR', 'Team Coach', 'Facilitatore di Progetto', 'Consulente', 'Coordinatore Formazione']
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
    image: '/placeholder.svg', // Placeholder for Fox
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
    title: 'The Reliable Guardian',
    description: 'Loyal, protective, stable',
    traits: ['Loyal', 'Protective', 'Stable', 'Dependable', 'Patient'],
    strengths: ['Reliability', 'Risk management', 'Consistency', 'Team protection'],
    weaknesses: ['Can be resistant to change', 'May be overly cautious', 'Struggles with innovation'],
    idealRoles: ['Operations', 'Risk Management', 'Security', 'Quality Control'],
    image: '/placeholder.svg', // Placeholder for Bear
    personality: {
      en: {
        description: 'The Bear XIMAtar represents reliable guardians who excel at protecting teams and maintaining stability. They are loyal, dependable, and skilled at managing risks and ensuring consistent operations.',
        traits: ['Loyal', 'Protective', 'Stable', 'Dependable', 'Patient'],
        strengths: ['Exceptional reliability', 'Risk management expertise', 'Consistent performance', 'Team protection instincts', 'Long-term stability'],
        weaknesses: ['Can be resistant to change', 'May be overly cautious', 'Struggles with rapid innovation', 'May avoid taking risks'],
        idealRoles: ['Operations Manager', 'Risk Management Specialist', 'Security Director', 'Quality Control Manager', 'Compliance Officer']
      },
      it: {
        description: 'Il XIMAtar Orso rappresenta guardiani affidabili che eccellono nel proteggere i team e mantenere la stabilità. Sono leali, affidabili e abili nella gestione dei rischi e nel garantire operazioni coerenti.',
        traits: ['Leale', 'Protettivo', 'Stabile', 'Affidabile', 'Paziente'],
        strengths: ['Affidabilità eccezionale', 'Expertise nella gestione del rischio', 'Performance costante', 'Istinti di protezione del team', 'Stabilità a lungo termine'],
        weaknesses: ['Può essere resistente al cambiamento', 'Può essere eccessivamente cauto', 'Ha difficoltà con l\'innovazione rapida', 'Può evitare di prendere rischi'],
        idealRoles: ['Manager Operazioni', 'Specialista Gestione Rischi', 'Direttore Sicurezza', 'Manager Controllo Qualità', 'Responsabile Compliance']
      }
    }
  },
  {
    id: 'cat',
    name: 'Cat',
    animal: 'Cat',
    title: 'The Independent Specialist',
    description: 'Curious, analytical, autonomous',
    traits: ['Curious', 'Analytical', 'Autonomous', 'Precise', 'Innovative'],
    strengths: ['Independent work', 'Creative solutions', 'Technical expertise', 'Innovation'],
    weaknesses: ['May struggle with teamwork', 'Can be too independent', 'Difficulty with collaboration'],
    idealRoles: ['Developer', 'Designer', 'Specialist', 'Researcher'],
    image: '/placeholder.svg', // Placeholder for Cat
    personality: {
      en: {
        description: 'The Cat XIMAtar represents independent specialists who excel at working autonomously and developing innovative solutions. They are curious, analytical, and prefer to work with precision and creativity.',
        traits: ['Curious', 'Analytical', 'Autonomous', 'Precise', 'Innovative'],
        strengths: ['Exceptional independent work abilities', 'Creative problem solving', 'Technical expertise', 'Innovation and experimentation', 'Attention to detail'],
        weaknesses: ['May struggle with extensive teamwork', 'Can be too independent', 'Difficulty with collaborative processes', 'May resist micromanagement'],
        idealRoles: ['Software Developer', 'UX/UI Designer', 'Technical Specialist', 'Research Scientist', 'Creative Director']
      },
      it: {
        description: 'Il XIMAtar Gatto rappresenta specialisti indipendenti che eccellono nel lavorare autonomamente e sviluppare soluzioni innovative. Sono curiosi, analitici e preferiscono lavorare con precisione e creatività.',
        traits: ['Curioso', 'Analitico', 'Autonomo', 'Preciso', 'Innovativo'],
        strengths: ['Eccezionali capacità di lavoro indipendente', 'Risoluzione creativa dei problemi', 'Expertise tecnica', 'Innovazione e sperimentazione', 'Attenzione ai dettagli'],
        weaknesses: ['Può avere difficoltà con il teamwork esteso', 'Può essere troppo indipendente', 'Difficoltà con processi collaborativi', 'Può resistere alla microgestione'],
        idealRoles: ['Sviluppatore Software', 'UX/UI Designer', 'Specialista Tecnico', 'Ricercatore Scientifico', 'Direttore Creativo']
      }
    }
  },
  {
    id: 'bee',
    name: 'Bee',
    animal: 'Bee',
    title: 'The Productive Worker',
    description: 'Disciplined, efficient, consistent',
    traits: ['Disciplined', 'Efficient', 'Consistent', 'Organized', 'Dedicated'],
    strengths: ['High productivity', 'Organization', 'Consistency', 'Process optimization'],
    weaknesses: ['May be too rigid', 'Can struggle with creativity', 'Difficulty with change'],
    idealRoles: ['Admin', 'Logistics', 'Operations', 'Project Coordinator'],
    image: '/placeholder.svg', // Placeholder for Bee
    personality: {
      en: {
        description: 'The Bee XIMAtar represents productive workers who excel at efficient execution and maintaining high standards. They are disciplined, organized, and skilled at optimizing processes and workflows.',
        traits: ['Disciplined', 'Efficient', 'Consistent', 'Organized', 'Dedicated'],
        strengths: ['Exceptional productivity levels', 'Strong organizational skills', 'Consistent quality output', 'Process optimization abilities', 'Attention to deadlines'],
        weaknesses: ['May be too rigid in approach', 'Can struggle with creative tasks', 'Difficulty adapting to sudden changes', 'May resist new methodologies'],
        idealRoles: ['Administrative Manager', 'Logistics Coordinator', 'Operations Specialist', 'Project Coordinator', 'Process Manager']
      },
      it: {
        description: 'Il XIMAtar Ape rappresenta lavoratori produttivi che eccellono nell\'esecuzione efficiente e nel mantenere alti standard. Sono disciplinati, organizzati e abili nell\'ottimizzare processi e flussi di lavoro.',
        traits: ['Disciplinato', 'Efficiente', 'Coerente', 'Organizzato', 'Dedicato'],
        strengths: ['Livelli di produttività eccezionali', 'Forti capacità organizzative', 'Output di qualità coerente', 'Capacità di ottimizzazione processi', 'Attenzione alle scadenze'],
        weaknesses: ['Può essere troppo rigido nell\'approccio', 'Può avere difficoltà con compiti creativi', 'Difficoltà ad adattarsi a cambi improvvisi', 'Può resistere a nuove metodologie'],
        idealRoles: ['Manager Amministrativo', 'Coordinatore Logistica', 'Specialista Operazioni', 'Coordinatore Progetto', 'Manager Processi']
      }
    }
  },
  {
    id: 'parrot',
    name: 'Parrot',
    animal: 'Parrot',
    title: 'The Communicator',
    description: 'Expressive, social, energizing',
    traits: ['Expressive', 'Social', 'Energizing', 'Charismatic', 'Engaging'],
    strengths: ['Communication', 'Public speaking', 'Team motivation', 'Networking'],
    weaknesses: ['May talk too much', 'Can be easily distracted', 'Difficulty with detailed work'],
    idealRoles: ['PR', 'Customer Success', 'Training', 'Event Management'],
    image: '/placeholder.svg', // Placeholder for Parrot
    personality: {
      en: {
        description: 'The Parrot XIMAtar represents natural communicators who excel at expressing ideas and energizing teams. They are charismatic, social, and skilled at building relationships and inspiring others.',
        traits: ['Expressive', 'Social', 'Energizing', 'Charismatic', 'Engaging'],
        strengths: ['Exceptional communication skills', 'Public speaking abilities', 'Team motivation and inspiration', 'Strong networking capabilities', 'Relationship building'],
        weaknesses: ['May talk excessively', 'Can be easily distracted', 'Difficulty with detailed analytical work', 'May struggle with solitary tasks'],
        idealRoles: ['Public Relations Manager', 'Customer Success Director', 'Training Coordinator', 'Event Manager', 'Communications Specialist']
      },
      it: {
        description: 'Il XIMAtar Pappagallo rappresenta comunicatori naturali che eccellono nell\'esprimere idee e nell\'energizzare i team. Sono carismatici, sociali e abili nel costruire relazioni e ispirare gli altri.',
        traits: ['Espressivo', 'Sociale', 'Energizzante', 'Carismatico', 'Coinvolgente'],
        strengths: ['Eccezionali capacità comunicative', 'Abilità nel parlare in pubblico', 'Motivazione e ispirazione del team', 'Forti capacità di networking', 'Costruzione di relazioni'],
        weaknesses: ['Può parlare eccessivamente', 'Può essere facilmente distratto', 'Difficoltà con lavori analitici dettagliati', 'Può avere difficoltà con compiti solitari'],
        idealRoles: ['Manager Relazioni Pubbliche', 'Direttore Customer Success', 'Coordinatore Formazione', 'Event Manager', 'Specialista Comunicazioni']
      }
    }
  },
  {
    id: 'elephant',
    name: 'Elephant',
    animal: 'Elephant',
    title: 'The Long-Term Strategist',
    description: 'Wise, legacy-minded, reflective',
    traits: ['Wise', 'Legacy-minded', 'Reflective', 'Patient', 'Visionary'],
    strengths: ['Strategic planning', 'Long-term thinking', 'Wisdom', 'Mentoring'],
    weaknesses: ['May be slow to act', 'Can be resistant to quick changes', 'Overthinks decisions'],
    idealRoles: ['Strategy', 'Governance', 'Advisory', 'Senior Leadership'],
    image: '/placeholder.svg', // Placeholder for Elephant
    personality: {
      en: {
        description: 'The Elephant XIMAtar represents wise strategists who excel at long-term planning and creating lasting impact. They are reflective, patient, and skilled at seeing the bigger picture and mentoring others.',
        traits: ['Wise', 'Legacy-minded', 'Reflective', 'Patient', 'Visionary'],
        strengths: ['Exceptional strategic planning', 'Long-term visionary thinking', 'Deep wisdom and experience', 'Natural mentoring abilities', 'Institutional memory'],
        weaknesses: ['May be slow to take action', 'Can be resistant to rapid changes', 'Tendency to overthink decisions', 'May struggle with urgent deadlines'],
        idealRoles: ['Chief Strategy Officer', 'Board Member', 'Senior Advisor', 'Executive Coach', 'Governance Director']
      },
      it: {
        description: 'Il XIMAtar Elefante rappresenta strateghi saggi che eccellono nella pianificazione a lungo termine e nella creazione di un impatto duraturo. Sono riflessivi, pazienti e abili nel vedere il quadro generale e nel mentorare gli altri.',
        traits: ['Saggio', 'Orientato al lascito', 'Riflessivo', 'Paziente', 'Visionario'],
        strengths: ['Pianificazione strategica eccezionale', 'Pensiero visionario a lungo termine', 'Profonda saggezza ed esperienza', 'Capacità naturali di mentoring', 'Memoria istituzionale'],
        weaknesses: ['Può essere lento nell\'agire', 'Può essere resistente a cambi rapidi', 'Tendenza a riflettere troppo sulle decisioni', 'Può avere difficoltà con scadenze urgenti'],
        idealRoles: ['Chief Strategy Officer', 'Membro del Consiglio', 'Senior Advisor', 'Executive Coach', 'Direttore Governance']
      }
    }
  },
  {
    id: 'wolf',
    name: 'Wolf',
    animal: 'Wolf',
    title: 'The Tactical Team Player',
    description: 'Collaborative, adaptable, tribal',
    traits: ['Collaborative', 'Adaptable', 'Tribal', 'Loyal', 'Strategic'],
    strengths: ['Team coordination', 'Tactical planning', 'Adaptability', 'Loyalty'],
    weaknesses: ['May struggle without team', 'Can be too dependent on others', 'Difficulty with solo leadership'],
    idealRoles: ['Squad Leader', 'Agile Coach', 'Team Coordinator', 'Project Manager'],
    image: '/placeholder.svg', // Placeholder for Wolf
    personality: {
      en: {
        description: 'The Wolf XIMAtar represents tactical team players who excel at coordinating group efforts and adapting to changing circumstances. They are collaborative, loyal, and skilled at bringing out the best in their pack.',
        traits: ['Collaborative', 'Adaptable', 'Tribal', 'Loyal', 'Strategic'],
        strengths: ['Exceptional team coordination', 'Tactical planning abilities', 'High adaptability', 'Strong loyalty to team', 'Group motivation skills'],
        weaknesses: ['May struggle without team support', 'Can be too dependent on group dynamics', 'Difficulty with solo leadership roles', 'May avoid individual accountability'],
        idealRoles: ['Scrum Master', 'Agile Coach', 'Team Coordinator', 'Project Manager', 'Squad Leader']
      },
      it: {
        description: 'Il XIMAtar Lupo rappresenta giocatori di squadra tattici che eccellono nel coordinare gli sforzi di gruppo e nell\'adattarsi a circostanze mutevoli. Sono collaborativi, leali e abili nel tirare fuori il meglio dal loro branco.',
        traits: ['Collaborativo', 'Adattabile', 'Tribale', 'Leale', 'Strategico'],
        strengths: ['Coordinamento di squadra eccezionale', 'Abilità di pianificazione tattica', 'Alta adattabilità', 'Forte lealtà verso il team', 'Capacità di motivazione di gruppo'],
        weaknesses: ['Può avere difficoltà senza supporto del team', 'Può essere troppo dipendente dalle dinamiche di gruppo', 'Difficoltà con ruoli di leadership solitaria', 'Può evitare responsabilità individuali'],
        idealRoles: ['Scrum Master', 'Agile Coach', 'Coordinatore Team', 'Project Manager', 'Squad Leader']
      }
    }
  },
  {
    id: 'chameleon',
    name: 'Chameleon',
    animal: 'Chameleon',
    title: 'The Adaptive Operator',
    description: 'Fast learner, versatile, perceptive',
    traits: ['Fast learner', 'Versatile', 'Perceptive', 'Flexible', 'Observant'],
    strengths: ['Adaptability', 'Quick learning', 'Versatility', 'Environmental awareness'],
    weaknesses: ['May lack consistency', 'Can be seen as unreliable', 'Difficulty with specialization'],
    idealRoles: ['Startup', 'Consultant', 'Business Analyst', 'Change Manager'],
    image: '/placeholder.svg', // Placeholder for Chameleon
    personality: {
      en: {
        description: 'The Chameleon XIMAtar represents adaptive operators who excel at quickly adjusting to new environments and learning new skills. They are versatile, perceptive, and skilled at reading situations and adapting accordingly.',
        traits: ['Fast learner', 'Versatile', 'Perceptive', 'Flexible', 'Observant'],
        strengths: ['Exceptional adaptability', 'Rapid learning capabilities', 'High versatility', 'Strong environmental awareness', 'Situational intelligence'],
        weaknesses: ['May lack consistency in approach', 'Can be perceived as unreliable', 'Difficulty with deep specialization', 'May struggle with routine tasks'],
        idealRoles: ['Startup Generalist', 'Management Consultant', 'Business Analyst', 'Change Management Specialist', 'Product Manager']
      },
      it: {
        description: 'Il XIMAtar Camaleonte rappresenta operatori adattivi che eccellono nel adattarsi rapidamente a nuovi ambienti e nell\'apprendere nuove competenze. Sono versatili, percettivi e abili nel leggere le situazioni e adattarsi di conseguenza.',
        traits: ['Apprendimento rapido', 'Versatile', 'Percettivo', 'Flessibile', 'Osservatore'],
        strengths: ['Adattabilità eccezionale', 'Capacità di apprendimento rapido', 'Alta versatilità', 'Forte consapevolezza ambientale', 'Intelligenza situazionale'],
        weaknesses: ['Può mancare di consistenza nell\'approccio', 'Può essere percepito come inaffidabile', 'Difficoltà con specializzazione profonda', 'Può avere difficoltà con compiti di routine'],
        idealRoles: ['Generalista Startup', 'Consulente di Management', 'Analista di Business', 'Specialista Change Management', 'Product Manager']
      }
    }
  },
  {
    id: 'horse',
    name: 'Horse',
    animal: 'Horse',
    title: 'The Reliable Driver',
    description: 'Hardworking, consistent, resilient',
    traits: ['Hardworking', 'Consistent', 'Resilient', 'Dependable', 'Enduring'],
    strengths: ['Work ethic', 'Consistency', 'Reliability', 'Perseverance'],
    weaknesses: ['May be resistant to change', 'Can be overly focused on work', 'Difficulty with innovation'],
    idealRoles: ['Execution', 'Support', 'Implementation', 'Operations'],
    image: '/placeholder.svg', // Placeholder for Horse
    personality: {
      en: {
        description: 'The Horse XIMAtar represents reliable drivers who excel at consistent execution and delivering results. They are hardworking, resilient, and skilled at maintaining steady progress toward goals.',
        traits: ['Hardworking', 'Consistent', 'Resilient', 'Dependable', 'Enduring'],
        strengths: ['Exceptional work ethic', 'Consistent performance', 'High reliability', 'Strong perseverance', 'Steady progress delivery'],
        weaknesses: ['May be resistant to change', 'Can be overly focused on work', 'Difficulty with innovative thinking', 'May struggle with creative tasks'],
        idealRoles: ['Implementation Manager', 'Operations Specialist', 'Support Team Lead', 'Execution Coordinator', 'Delivery Manager']
      },
      it: {
        description: 'Il XIMAtar Cavallo rappresenta conduttori affidabili che eccellono nell\'esecuzione coerente e nel fornire risultati. Sono laboriosi, resilienti e abili nel mantenere un progresso costante verso gli obiettivi.',
        traits: ['Laborioso', 'Coerente', 'Resiliente', 'Affidabile', 'Duraturo'],
        strengths: ['Etica del lavoro eccezionale', 'Performance coerente', 'Alta affidabilità', 'Forte perseveranza', 'Consegna di progresso costante'],
        weaknesses: ['Può essere resistente al cambiamento', 'Può essere eccessivamente focalizzato sul lavoro', 'Difficoltà con il pensiero innovativo', 'Può avere difficoltà con compiti creativi'],
        idealRoles: ['Manager Implementazione', 'Specialista Operazioni', 'Team Lead Support', 'Coordinatore Esecuzione', 'Delivery Manager']
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