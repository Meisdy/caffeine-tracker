import { useEffect, useRef, useState } from 'react';
import type { Favorite } from '../../data/entities';

const LOGGED_FEEDBACK_MS = 1500;

interface FavoriteGridProps {
  favorites: Favorite[];
  onLogFavorite: (favorite: Favorite) => void;
}

export function FavoriteGrid({ favorites, onLogFavorite }: FavoriteGridProps) {
  const [justLoggedId, setJustLoggedId] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearFeedbackTimeout(), []);

  function clearFeedbackTimeout() {
    if (feedbackTimeoutRef.current !== null) clearTimeout(feedbackTimeoutRef.current);
  }

  // A tap logs instantly with no navigation, so without this it reads as a tap that did nothing.
  function handleTap(favorite: Favorite) {
    onLogFavorite(favorite);
    clearFeedbackTimeout();
    setJustLoggedId(favorite.id);
    feedbackTimeoutRef.current = setTimeout(() => setJustLoggedId(null), LOGGED_FEEDBACK_MS);
  }

  if (favorites.length === 0) {
    return <p className="text-muted">No favorites yet — save one from the Log screen.</p>;
  }

  return (
    <div className="favorite-grid">
      {favorites.map((favorite) => {
        const isJustLogged = favorite.id === justLoggedId;
        return (
          <button
            key={favorite.id}
            type="button"
            className={isJustLogged ? 'favorite-tile is-logged' : 'favorite-tile'}
            onClick={() => handleTap(favorite)}
          >
            <span className="favorite-tile-label">{favorite.label}</span>
            <span className="favorite-tile-dose" aria-live="polite">
              {isJustLogged ? `✓ Logged ${favorite.caffeineMg.toFixed(0)} mg` : `${favorite.caffeineMg.toFixed(0)} mg`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
