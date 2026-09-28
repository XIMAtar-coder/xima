import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { useState } from 'react';
import { SpeakAnswerButton } from '../SpeakAnswerButton';

/**
 * Regression: dictating more than one sentence used to keep only the last
 * one. The recogniser's onresult handler is registered once when dictation
 * starts and each caller appends onto the value of its own render, so every
 * chunk after the first was concatenated onto the pre-dictation text. The
 * button must keep using the latest callback for each result.
 */

type FakeResultEvent = {
  resultIndex: number;
  results: Array<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: FakeResultEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start() {}
  stop() {}
}

const recognitions: FakeRecognition[] = [];

beforeEach(() => {
  recognitions.length = 0;
  vi.stubGlobal('SpeechRecognition', class extends FakeRecognition {
    constructor() {
      super();
      recognitions.push(this);
    }
  });
});

const finalEvent = (transcript: string): FakeResultEvent => ({
  resultIndex: 0,
  results: [{ isFinal: true, 0: { transcript } }],
});

/** Mirrors the real callers: append onto the value of the current render. */
function Harness() {
  const [text, setText] = useState('');
  return (
    <div>
      <SpeakAnswerButton onAppend={(spoken) => setText(text ? `${text} ${spoken}` : spoken)} />
      <output data-testid="answer">{text}</output>
    </div>
  );
}

describe('SpeakAnswerButton', () => {
  it('keeps every dictated sentence, not only the last one', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /answer by voice/i }));

    const rec = recognitions[0];
    expect(rec).toBeDefined();

    act(() => rec.onresult?.(finalEvent('Prima frase')));
    expect(screen.getByTestId('answer').textContent).toBe('Prima frase');

    // A second utterance fires its own result event, after the re-render.
    act(() => rec.onresult?.(finalEvent('seconda frase')));
    expect(screen.getByTestId('answer').textContent).toBe('Prima frase seconda frase');

    // The earlier sentence must still be there after a third one.
    act(() => rec.onresult?.(finalEvent('terza frase')));
    expect(screen.getByTestId('answer').textContent).toBe('Prima frase seconda frase terza frase');
  });

  it('joins several final results arriving in one event', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /answer by voice/i }));
    const rec = recognitions[0];

    act(() => rec.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: 'Una cosa' } },
        { isFinal: true, 0: { transcript: 'e un’altra' } },
      ],
    }));

    expect(screen.getByTestId('answer').textContent).toBe('Una cosa e un’altra');
  });
});
