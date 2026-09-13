import { useState } from 'react';
import { formatClockTime } from '../lib/date';

type Rating = 1 | 2 | 3 | 4 | 5;

const RATING_OPTIONS: Rating[] = [1, 2, 3, 4, 5];

interface AlertnessPromptProps {
  onRate: (rating: Rating) => void;
}

export function AlertnessPrompt({ onRate }: AlertnessPromptProps) {
  const [lastRatedAt, setLastRatedAt] = useState<number | null>(null);

  function handleRate(rating: Rating) {
    onRate(rating);
    setLastRatedAt(Date.now());
  }

  return (
    <section className="card">
      <h2 className="section-title">How alert do you feel?</h2>
      <div className="alertness-options">
        {RATING_OPTIONS.map((rating) => (
          <button key={rating} type="button" className="alertness-option" onClick={() => handleRate(rating)}>
            {rating}
          </button>
        ))}
      </div>
      {lastRatedAt !== null ? <p className="text-muted">Logged at {formatClockTime(lastRatedAt)}</p> : null}
    </section>
  );
}
