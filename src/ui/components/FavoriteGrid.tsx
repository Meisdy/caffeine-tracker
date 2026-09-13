import type { Favorite } from '../../data/entities';

interface FavoriteGridProps {
  favorites: Favorite[];
  onLogFavorite: (favorite: Favorite) => void;
}

export function FavoriteGrid({ favorites, onLogFavorite }: FavoriteGridProps) {
  if (favorites.length === 0) {
    return <p className="text-muted">No favorites yet — save one from the Log screen.</p>;
  }

  return (
    <div className="favorite-grid">
      {favorites.map((favorite) => (
        <button key={favorite.id} type="button" className="favorite-tile" onClick={() => onLogFavorite(favorite)}>
          <span className="favorite-tile-label">{favorite.label}</span>
          <span className="favorite-tile-dose">{favorite.caffeineMg.toFixed(0)} mg</span>
        </button>
      ))}
    </div>
  );
}
