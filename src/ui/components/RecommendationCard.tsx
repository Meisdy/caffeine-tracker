import type { Recommendation } from '../../domain/types';

interface RecommendationCardProps {
  recommendations: Recommendation[];
}

export function RecommendationCard({ recommendations }: RecommendationCardProps) {
  if (recommendations.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">Recommendations</h2>
        <p className="text-muted">Nothing to flag right now.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="section-title">Recommendations</h2>
      <ul className="recommendation-list">
        {recommendations.map((recommendation) => (
          <li key={recommendation.id} className={`recommendation recommendation-${recommendation.severity}`}>
            {recommendation.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
