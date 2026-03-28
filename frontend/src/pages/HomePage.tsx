import { useState } from 'react';
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
    <main className="app-shell">
      <AppHeader
        subtitle="MPI App"
        title="Leave Management Frontend is ready"
      />

      <section className="card">
        <p>
          API base URL: <code>{API_BASE_URL}</code>
        </p>
        <button onClick={handleHealthCheck} type="button" disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Backend Health'}
        </button>
        {health && <p className="status ok">Status: {health.status}</p>}
        {error && <p className="status error">{error}</p>}
      </section>
    </main>
  );
}
