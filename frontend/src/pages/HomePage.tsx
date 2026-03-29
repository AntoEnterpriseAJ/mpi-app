import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { API_BASE_URL } from '../config/env';
import { getHealth, type HealthResponse } from '../services/api';

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleHealthCheck = async () => {
    setIsLoading(true);
    setError('');
    setHealth(null);

    try {
      const response = await getHealth();
      setHealth(response);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not reach backend API.';
      setError(message);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page page-home">
      <div className="page-glow page-glow-a" aria-hidden="true" />
      <div className="page-glow page-glow-b" aria-hidden="true" />

      <AppHeader
        subtitle="MPI APP"
        title="Leave Management Control Room"
        description="A quick integration dashboard for validating communication between Vite and FastAPI."
      />

      <section className="card card-hero">
        <div className="api-pill">
          <span>API Endpoint</span>
          <code>{API_BASE_URL}</code>
        </div>

        <div className="hero-actions">
          <button
            className="btn btn-primary"
            onClick={handleHealthCheck}
            type="button"
            disabled={isLoading}
          >
            {isLoading ? 'Checking backend...' : 'Run Health Check'}
          </button>

          <Link className="btn btn-secondary" to="/users">
            Open Users Directory
          </Link>
        </div>

        {health && (
          <p className="status ok">
            Backend status: {health.status} | {health.message}
          </p>
        )}
        {error && <p className="status error">{error}</p>}
      </section>
    </main>
  );
}
