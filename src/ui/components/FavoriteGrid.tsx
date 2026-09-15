import { useEffect, useRef, useState } from 'react';
import type { Favorite } from '../../data/entities';

const LOGGED_FEEDBACK_MS = 1500;

interface FavoriteGridProps {
  favorites: Favorite[];
  /** While editing, a tap offers to delete the favorite instead of logging it. */
  isEditing: boolean;
  onLogFavorite: (favorite: Favorite) => void;
  onDeleteFavorite: (favorite: Favorite) => void;
}

export function FavoriteGrid({ favorites, isEditing, onLogFavorite, onDeleteFavorite }: FavoriteGridProps) {
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

  function requestDelete(favorite: Favorite) {
    if (!window.confirm(`Delete favorite ${favorite.label}? Past intakes stay in History.`)) return;
    onDeleteFavorite(favorite);
  }

  if (favorites.length === 0) {
    return <p className="text-muted">No favorites yet — save one from the Log screen.</p>;
  }

  return (
    <div className="favorite-grid">
      {favorites.map((favorite) => {
        if (isEditing) {
          return (
            <button
              key={favorite.id}
              type="button"
              className="favorite-tile is-editing"
              aria-label={`Delete ${favorite.label}`}
              onClick={() => requestDelete(favorite)}
            >
              <span className="favorite-tile-delete" aria-hidden="true">
                ✕
              </span>
              <span className="favorite-tile-label">{favorite.label}</span>
              <span className="favorite-tile-dose">{favorite.caffeineMg.toFixed(0)} mg</span>
            </button>
          );
        }

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
