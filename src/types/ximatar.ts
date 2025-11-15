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
    image: '/lovable-uploads/ae79af7a-e780-4f42-8fbf-529eb1e4d1f8.png', // Dolphin avatar
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
    title: 'The Reliable Guardian',
    description: 'Loyal, protective, stable',
    traits: ['Loyal', 'Protective', 'Stable', 'Dependable', 'Patient'],
    strengths: ['Reliability', 'Risk management', 'Consistency', 'Team protection'],
    weaknesses: ['Can be resistant to change', 'May be overly cautious', 'Struggles with innovation'],
    idealRoles: ['Operations', 'Risk Management', 'Security', 'Quality Control'],
    image: '/lovable-uploads/e4b1fc80-fed1-4028-8bd7-f71eb4cc5ec1.png', // Bear avatar
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
    image: '/lovable-uploads/67baf1dd-15f8-4951-ba4b-1594b4aeab60.png', // Cat avatar
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
    image: '/lovable-uploads/ce92fde6-0154-448f-a838-27aba2b74061.png', // Bee avatar
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
    image: '/lovable-uploads/4fbccddd-ecd3-4ccc-8b2b-1c66d3df46fd.png', // Parrot avatar
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
    image: '/lovable-uploads/f561bed6-0ac5-4d79-a209-02d60bae5d59.png', // Elephant avatar
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