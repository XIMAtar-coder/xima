import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadAloudButton } from '@/components/candidate/audio/ReadAloudButton';
import { cn } from '@/lib/utils';
import {
  IDLE_SECONDS, MAX_ACTIVE_SECONDS, emptyRun,
  type Choice, type Episode, type GameKey, type GameRun, type OpenReason,
} from '@/lib/games/model';

/**
 * The frame the four games share, and the only place Drive is recorded.
 *
 * Demonstration → easy round → the principle in one line → hard round →
 * (if it stalls) the choice → the explanation, if asked for. The panel always
 * looks the same, always has the same three buttons in the same order, and
 * none of them is styled as the right one. The choice opens when the person
 * stops acting — not on a hidden countdown — or on an invalid move, a wrong
 * answer, a dead end, or because they asked for it.
 *
 * A game that is solved before any of that leaves `solved_without_choice`:
 * Drive was not observed, which is not the same as low.
 */

export type Stage = 'demo' | 'easy' | 'bridge' | 'hard' | 'choice' | 'explain' | 'done';

export interface GameApi {
  /** Call on every meaningful action: it keeps the idle clock honest. */
  acted: () => void;
  /** An invalid move or a wrong answer: shows the amber note and opens the choice. */
  failed: (reason: Extract<OpenReason, 'wrong' | 'invalid' | 'stuck'>, note?: string) => void;
  /** The round is done. */
  solved: () => void;
  stage: Stage;
  /** Goes up by one on every «Riprovo» and after the explanation: reset your state on it. */
  attempt: number;
}

interface Props {
  game: GameKey;
  position: 1 | 2;
  /** The whole game, drawn by the caller for each stage. */
  render: (api: GameApi) => React.ReactNode;
  /** The explanation: the part that makes the game worth playing. */
  explanation: React.ReactNode;
  /** One line under the easy round: what was just learned. */
  bridge: React.ReactNode;
  /** «Annulla» and «Ricomincia», when the game has them. */
  onUndo?: () => void;
  onRestart?: () => void;
  canUndo?: boolean;
  onDone: (run: GameRun) => void;
  onSkip: (run: GameRun) => void;
}

export const GameShell: React.FC<Props> = ({ game, position, render, explanation, bridge, onUndo, onRestart, canUndo, onDone, onSkip }) => {
  const { t } = useTranslation();
  const base = `games.${game}`;
  const [stage, setStage] = useState<Stage>('demo');
  const [attempt, setAttempt] = useState(1);
  const [note, setNote] = useState<string | null>(null);
  const run = useRef<GameRun>(emptyRun(game, position));
  const episode = useRef<Episode | null>(null);
  const lastAction = useRef(Date.now());
  /** Dead ends inside this episode: the first one is just a note, not an obstacle. */
  const fails = useRef(0);
  const episodeStart = useRef(Date.now());
  const [, force] = useState(0);

  const startEpisode = useCallback(() => {
    fails.current = 0;
    episode.current = { n: run.current.episodes.length + 1, openedBy: null, seconds: 0, choice: null };
    episodeStart.current = Date.now();
    lastAction.current = Date.now();
  }, []);

  const openChoice = useCallback((reason: OpenReason, text?: string) => {
    if (stage !== 'hard') return;
    const ep = episode.current;
    if (ep) {
      ep.openedBy = reason;
      ep.seconds = Math.round((Date.now() - episodeStart.current) / 1000);
      run.current.episodes = [...run.current.episodes.filter((e) => e.n !== ep.n), ep];
    }
    run.current.observation = 'choice_met';
    setNote(text ?? null);
    setStage('choice');
  }, [stage]);

  // The idle clock: still hands, not a stopwatch. The long cap only exists so
  // a round left open forever still offers a way out.
  useEffect(() => {
    if (stage !== 'hard') return;
    const id = setInterval(() => {
      const idle = (Date.now() - lastAction.current) / 1000;
      const active = (Date.now() - episodeStart.current) / 1000;
      if (idle >= IDLE_SECONDS || active >= MAX_ACTIVE_SECONDS) openChoice('idle');
    }, 1000);
    return () => clearInterval(id);
  }, [stage, openChoice, attempt]);

  const api: GameApi = {
    stage,
    attempt,
    acted: () => { lastAction.current = Date.now(); setNote(null); },
    failed: (reason, text) => {
      // Trying something that does not work is how a puzzle is explored. The
      // first dead end only says so; the choice comes when it happens again.
      lastAction.current = Date.now();
      fails.current += 1;
      if (fails.current < 2 && reason !== 'stuck') { setNote(text ?? null); return; }
      openChoice(reason, text);
    },
    solved: () => {
      if (stage === 'easy') { run.current.easyDone = true; setStage('bridge'); return; }
      if (stage !== 'hard') return;
      const ep = episode.current;
      if (ep) {
        ep.seconds = Math.round((Date.now() - episodeStart.current) / 1000);
        run.current.episodes = [...run.current.episodes.filter((e) => e.n !== ep.n), ep];
      }
      if (run.current.observation !== 'choice_met') run.current.observation = 'solved_without_choice';
      run.current.outcome = run.current.helpAsked ? 'solved_after_help' : 'solved_before_help';
      if (run.current.helpAsked) run.current.resumedAfterHelp = true;
      setStage('done');
    },
  };

  const choose = (choice: Choice) => {
    const ep = episode.current;
    if (ep) {
      ep.choice = choice;
      run.current.episodes = [...run.current.episodes.filter((e) => e.n !== ep.n), ep];
    }
    setNote(null);
    if (choice === 'retry') {
      setAttempt((n) => n + 1);
      startEpisode();
      setStage('hard');
      force((n) => n + 1);
      return;
    }
    if (choice === 'explain') {
      run.current.helpAsked = true;
      setStage('explain');
      return;
    }
    run.current.outcome = 'moved_on';
    onDone(run.current);
  };

  const afterExplanation = (back: boolean) => {
    run.current.helpFinished = true;
    if (!back) { run.current.outcome = 'moved_on'; onDone(run.current); return; }
    setAttempt((n) => n + 1);
    startEpisode();
    setStage('hard');
  };

  const skip = () => {
    if (run.current.observation === 'left_before_choice') run.current.outcome = 'skipped';
    onSkip(run.current);
  };

  const spoken = [t(`${base}.title`), t(`${base}.how`), stage === 'hard' ? t(`${base}.hard_lead`) : ''].filter(Boolean).join('. ');

  return (
    <div>
      {/* the frame: same chip, same places, in all four games */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
          <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
          {t('games.common.chip')}
        </span>
        <div className="flex items-center gap-2">
          <ReadAloudButton text={spoken} />
          <button type="button" onClick={skip} className="text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {t('games.common.skip')}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.5px] text-foreground sm:text-[28px]">{t(`${base}.title`)}</h2>
        <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
          {t('games.common.round', { n: stage === 'demo' || stage === 'easy' || stage === 'bridge' ? 1 : 2 })}
        </span>
      </div>
      <p className="mt-1.5 text-[14px] leading-[1.5] text-muted-foreground">
        {stage === 'demo' || stage === 'easy' || stage === 'bridge' ? t(`${base}.how`) : t(`${base}.hard_lead`)}
      </p>

      <div className="mt-4">{render(api)}</div>

      {note && (stage === 'choice' || stage === 'hard') && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-[#c98a1a]/50 bg-[#fff4dd] px-3 py-2 text-[13px] text-[#7a5200] dark:bg-[#c98a1a]/15 dark:text-[#f0c877]">
          <span aria-hidden className="mt-[3px] inline-block h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-[#c98a1a]" />
          {note}
        </p>
      )}

      {/* demo → easy */}
      {stage === 'demo' && (
        <div className="mt-5 flex justify-end border-t border-[hsl(var(--xs-line))] pt-4">
          <Button onClick={() => { run.current.demoSeen = true; setStage('easy'); }}>
            {t('games.common.got_it')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* what the easy round just showed, then the hard one */}
      {stage === 'bridge' && (
        <div className="mt-5 border-t border-[hsl(var(--xs-line))] pt-4">
          <div className="text-[14.5px] leading-[1.55] text-foreground">{bridge}</div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => { setAttempt((n) => n + 1); startEpisode(); setStage('hard'); }}>
              {t('games.common.next_round')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* the controls, always in the same corners */}
      {(stage === 'easy' || stage === 'hard') && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[hsl(var(--xs-line))] pt-4">
          <div className="flex items-center gap-2">
            {onUndo && (
              <Button variant="ghost" size="sm" onClick={() => { onUndo(); api.acted(); }} disabled={!canUndo}>
                <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />{t('games.common.undo')}
              </Button>
            )}
            {onRestart && (
              <Button variant="ghost" size="sm" onClick={() => { onRestart(); api.acted(); }}>
                <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />{t('games.common.restart')}
              </Button>
            )}
          </div>
          {stage === 'hard' && (
            <button type="button" onClick={() => openChoice('voluntary')} className="text-[13px] font-medium text-primary underline-offset-2 hover:underline">
              {t('games.common.how_to_go_on')}
            </button>
          )}
        </div>
      )}

      {/* the choice: three buttons, same order, none of them the good one */}
      {stage === 'choice' && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--xs-line))] bg-card p-4">
          <p className="text-[15px] font-medium text-foreground">{t('games.common.choice_title')}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t('games.common.choice_sub')}</p>
          <div className="mt-3 grid gap-2">
            {(['retry', 'explain', 'skip'] as Choice[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => choose(c)}
                className="rounded-lg border border-[hsl(var(--xs-line))] bg-background px-4 py-3 text-left text-[14.5px] text-foreground transition-colors hover:border-primary/60"
              >
                {t(`games.common.choice_${c}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* the explanation, and the way back */}
      {stage === 'explain' && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--xs-line))] bg-card p-4">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t('games.common.explanation')}</div>
          <div className="mt-2">{explanation}</div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[hsl(var(--xs-line))] pt-3">
            <Button variant="ghost" onClick={() => afterExplanation(false)}>{t('games.common.go_on')}</Button>
            <Button onClick={() => afterExplanation(true)}>{t('games.common.try_again_now')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      )}

      {/* solved: the principle, then back to the questions */}
      {stage === 'done' && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--xs-line))] bg-card p-4">
          <p className="text-[15px] font-semibold text-foreground">{t(`${base}.solved`)}</p>
          <div className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{explanation}</div>
          <div className="mt-4 flex justify-end border-t border-[hsl(var(--xs-line))] pt-3">
            <Button onClick={() => onDone(run.current)}>{t('games.common.continue')}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          </div>
        </div>
      )}

      <p className={cn('mt-4 text-[12.5px] text-muted-foreground', stage === 'done' && 'hidden')}>{t('games.common.calm')}</p>
    </div>
  );
};

export default GameShell;
