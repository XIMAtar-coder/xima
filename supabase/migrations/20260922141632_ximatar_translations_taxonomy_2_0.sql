-- Tassonomia 2.0: quattro animali cambiano forma (coppia forte/debole), i loro
-- testi nel catalogo dicevano ancora l'identità vecchia.
--   Lupo       comunicazione / creatività   «il branco, con schemi collaudati»
--   Leone      comunicazione / conoscenza   «guida e delega il sapere»
--   Delfino    creatività / calcolo         «gioca e inventa, non calcola»
--   Camaleonte creatività / comunicazione   «inventa e si adatta in silenzio»

UPDATE public.ximatar_translations tr SET
  title = v.title, core_traits = v.core_traits, behavior = v.behavior,
  weaknesses = v.weaknesses, ideal_roles = v.ideal_roles
FROM (VALUES
  ('wolf','it','Il branco, con schemi collaudati',
   'Coordinato, leale, tattico, affidabile',
   'Il Lupo rende al massimo dentro una squadra: tiene insieme le persone, coordina, sa chi fa cosa. Lavora con schemi che ha visto funzionare e li ripete con precisione.',
   'Quando serve inventare una strada nuova, preferisce quella già battuta. Fatica quando è solo o quando le regole del gruppo cambiano.',
   'Coordinatore di squadra, capo turno, project manager, responsabile operativo'),
  ('wolf','en','The pack, with proven patterns',
   'Coordinated, loyal, tactical, reliable',
   'The Wolf performs best inside a team: keeps people together, coordinates, knows who does what. Works with patterns seen to work and repeats them precisely.',
   'When a new route has to be invented, prefers the one already travelled. Struggles alone, or when the rules of the group change.',
   'Team coordinator, shift lead, project manager, operations lead'),
  ('wolf','es','La manada, con esquemas probados',
   'Coordinado, leal, táctico, fiable',
   'El Lobo rinde al máximo dentro de un equipo: mantiene unidas a las personas, coordina, sabe quién hace qué. Trabaja con esquemas que ha visto funcionar y los repite con precisión.',
   'Cuando hay que inventar un camino nuevo, prefiere el ya recorrido. Le cuesta estar solo o que cambien las reglas del grupo.',
   'Coordinador de equipo, jefe de turno, jefe de proyecto, responsable de operaciones'),

  ('lion','it','Guida e delega il sapere',
   'Deciso, presente, diretto, orientato al risultato',
   'Il Leone guida: decide in fretta, si mette davanti quando serve e fa muovere gli altri. Non è l''esperto della materia e non pretende di esserlo: sceglie le persone che sanno e si fida.',
   'Può decidere prima di aver capito fino in fondo. Tende a delegare lo studio e a perdere il dettaglio tecnico.',
   'Amministratore, direttore, responsabile di area, imprenditore'),
  ('lion','en','Leads and delegates the knowing',
   'Decisive, present, direct, results-driven',
   'The Lion leads: decides fast, steps in front when needed and gets others moving. Not the subject expert and does not pretend to be: picks the people who know and trusts them.',
   'May decide before fully understanding. Tends to delegate the studying and lose the technical detail.',
   'Executive, director, head of area, entrepreneur'),
  ('lion','es','Guía y delega el saber',
   'Decidido, presente, directo, orientado a resultados',
   'El León guía: decide rápido, se pone delante cuando hace falta y mueve a los demás. No es el experto en la materia ni pretende serlo: elige a quien sabe y confía.',
   'Puede decidir antes de entender del todo. Tiende a delegar el estudio y a perder el detalle técnico.',
   'Directivo, director, responsable de área, emprendedor'),

  ('dolphin','it','Gioca e inventa, non calcola',
   'Inventivo, giocoso, rapido, spontaneo',
   'Il Delfino prova: cambia strada, improvvisa, trova soluzioni che agli altri non vengono in mente. Lavora per tentativi e si diverte a farlo.',
   'Non ama i conti e la pianificazione minuta: può sottovalutare tempi e costi e lasciare imprecisioni dietro di sé.',
   'Ideazione, prodotto, contenuti, sperimentazione, prototipi'),
  ('dolphin','en','Plays and invents, does not calculate',
   'Inventive, playful, quick, spontaneous',
   'The Dolphin tries: changes route, improvises, finds solutions others do not think of. Works by trial and enjoys it.',
   'Not fond of sums and fine planning: may underestimate time and cost and leave loose ends behind.',
   'Ideation, product, content, experimentation, prototyping'),
  ('dolphin','es','Juega e inventa, no calcula',
   'Inventivo, juguetón, rápido, espontáneo',
   'El Delfín prueba: cambia de camino, improvisa, encuentra soluciones que a otros no se les ocurren. Trabaja por tanteo y disfruta haciéndolo.',
   'No le gustan las cuentas ni la planificación fina: puede subestimar tiempos y costes y dejar imprecisiones detrás.',
   'Ideación, producto, contenidos, experimentación, prototipos'),

  ('chameleon','it','Inventa e si adatta in silenzio',
   'Adattabile, inventivo, riservato, osservatore',
   'Il Camaleonte si mette nel contesto e lo cambia da dentro: osserva, prova, trova il modo che funziona qui. Preferisce fare a dire.',
   'Fatica a raccontare quello che fa e a farsi vedere: le sue idee arrivano tardi agli altri, o non arrivano.',
   'Ricerca, sviluppo, laboratorio, ruoli tecnici creativi'),
  ('chameleon','en','Invents and adapts in silence',
   'Adaptable, inventive, reserved, observant',
   'The Chameleon settles into a context and changes it from inside: watches, tries, finds the way that works here. Prefers doing to telling.',
   'Struggles to tell what it does and to be seen: its ideas reach others late, or not at all.',
   'Research, development, lab work, creative technical roles'),
  ('chameleon','es','Inventa y se adapta en silencio',
   'Adaptable, inventivo, reservado, observador',
   'El Camaleón se mete en el contexto y lo cambia desde dentro: observa, prueba, encuentra la manera que funciona aquí. Prefiere hacer a contar.',
   'Le cuesta contar lo que hace y hacerse ver: sus ideas llegan tarde a los demás, o no llegan.',
   'Investigación, desarrollo, laboratorio, roles técnicos creativos')
) AS v(label, lang, title, core_traits, behavior, weaknesses, ideal_roles)
JOIN public.ximatars x ON x.label = v.label
WHERE tr.ximatar_id = x.id AND tr.lang = v.lang::public.lang_code;
