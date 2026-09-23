/**
 * The four games, and the one thing they all measure: Drive.
 *
 * Each game has a demonstration, an easy round that teaches the gesture, and
 * a hard round. Drive is not read from how well a person plays — speed,
 * precision, the minimum number of moves and knowing the puzzle format are
 * explicitly *not* Drive. It is read from what happens at the obstacle: an
 * «episode» opens on the hard round, and when it stalls the same panel always
 * appears with the same three choices, none of them rewarded or punished:
 *
 *     Riprovo · Me lo faccio spiegare · Vado avanti
 *
 * The rule that has to survive contact with whoever reads the data later:
 * solving the hard round straight away is **not low Drive and not high Drive**
 * — it is Drive not observed. A missing observation stays missing; it never
 * becomes a zero.
 *
 * Every session shows two games — one to look at, one to handle — plus La
 * Salita at the end, so the same kind of evidence is collected from everyone
 * even though nobody sees all four. Whether the four are truly equivalent is
 * an open question: until it is tested, this is evidence to read, not a number
 * to rank people with.
 */

export type GameKey = 'exit' | 'triangles' | 'shadow' | 'pour';

/** Games you solve by looking, and games you solve with your hands. */
export const OBSERVATION_GAMES = ['triangles', 'shadow'] as const;
export const MANIPULATION_GAMES = ['exit', 'pour'] as const;

export type ObservationGame = (typeof OBSERVATION_GAMES)[number];
export type ManipulationGame = (typeof MANIPULATION_GAMES)[number];

/** Which games a session shows, in order, and after which scenario. */
export const GAME_AFTER_SCENARIO = [7, 14] as const;

export interface GamePair { first: GameKey; second: GameKey }

/**
 * One from each family, then a coin toss for the order: four pairs, eight
 * arrangements, all equally likely. Nothing depends on the field or on the
 * answers so far — a link like that would be impossible to tell apart from
 * Drive afterwards.
 */
export function pickPair(random: () => number = Math.random): GamePair {
  const look = OBSERVATION_GAMES[Math.floor(random() * OBSERVATION_GAMES.length)];
  const hands = MANIPULATION_GAMES[Math.floor(random() * MANIPULATION_GAMES.length)];
  return random() < 0.5 ? { first: look, second: hands } : { first: hands, second: look };
}

/**
 * The choice opens when the person stops acting, not on a stopwatch: a hidden
 * countdown that interrupts someone mid-thought reads as a telling-off. The
 * long cap is there so a round left open forever still offers a way out.
 */
export const IDLE_SECONDS = 25;
export const MAX_ACTIVE_SECONDS = 90;

/** Why the panel opened. Error, dead end and simple waiting stay apart. */
export type OpenReason = 'wrong' | 'invalid' | 'stuck' | 'idle' | 'voluntary';

/** What the person did at the obstacle. No option is the good one. */
export type Choice = 'retry' | 'explain' | 'skip';

/** What could be seen of Drive at all in this game. */
export type Observation =
  | 'solved_without_choice'   // solved the hard round before any obstacle: Drive not observed
  | 'choice_met'              // the panel opened at least once: this is the observation
  | 'left_before_choice'      // skipped the game before the hard round: missing
  | 'not_reached';            // the game was never shown

export interface Episode {
  /** 1-based: a new one starts on «Riprovo» and on going back after the explanation. */
  n: number;
  openedBy: OpenReason | null;
  /** Seconds with the page visible and the round open, explanation time excluded. */
  seconds: number;
  choice: Choice | null;
}

export interface GameRun {
  game: GameKey;
  /** 1 or 2: where the game sat in the session, so position can be told apart later. */
  position: 1 | 2;
  demoSeen: boolean;
  easyDone: boolean;
  observation: Observation;
  episodes: Episode[];
  helpAsked: boolean;
  /** The explanation ran to the end. It does not mean it was understood. */
  helpFinished: boolean;
  /** Came back to the round after the explanation **and acted on it**. */
  resumedAfterHelp: boolean;
  outcome: 'solved_before_help' | 'solved_after_help' | 'moved_on' | 'skipped';
}

export const emptyRun = (game: GameKey, position: 1 | 2): GameRun => ({
  game, position, demoSeen: false, easyDone: false, observation: 'left_before_choice',
  episodes: [], helpAsked: false, helpFinished: false, resumedAfterHelp: false, outcome: 'skipped',
});

export interface DriveReading {
  /** How many of the games shown actually produced an observation (0, 1 or 2). */
  occasions: number;
  /** The first choice in each game that produced one, in the order they were played. */
  firstChoices: Choice[];
  retries: number;
  helpAsked: number;
  /** Came back and acted after asking for the explanation. */
  resumed: number;
  /** Games solved before meeting any obstacle: Drive not observed, neither high nor low. */
  notObserved: number;
  /** Seconds spent on hard rounds, as exposure — never as merit. */
  hardSeconds: number;
}

/**
 * Reads the two runs together. There is no average and no single number: with
 * one or two occasions a percentage would pretend to be a trait.
 */
export function readDrive(runs: GameRun[]): DriveReading {
  const withChoice = runs.filter((r) => r.observation === 'choice_met');
  return {
    occasions: withChoice.length,
    firstChoices: withChoice.map((r) => r.episodes.find((e) => e.choice)?.choice).filter(Boolean) as Choice[],
    retries: runs.reduce((n, r) => n + r.episodes.filter((e) => e.choice === 'retry').length, 0),
    helpAsked: runs.filter((r) => r.helpAsked).length,
    resumed: runs.filter((r) => r.resumedAfterHelp).length,
    notObserved: runs.filter((r) => r.observation === 'solved_without_choice').length,
    hardSeconds: runs.reduce((n, r) => n + r.episodes.reduce((m, e) => m + e.seconds, 0), 0),
  };
}
