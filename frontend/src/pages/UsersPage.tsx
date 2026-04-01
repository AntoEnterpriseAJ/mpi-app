import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { getUsers, type User } from '../services/api';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getUsers();
      setUsers(data);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Failed to fetch users.';
      setError(message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  return (
    <main className="page page-users">
      <div className="page-glow page-glow-a" aria-hidden="true" />
      <div className="page-glow page-glow-b" aria-hidden="true" />

      <AppHeader
        title="Users"
        subtitle="TEAM DIRECTORY"
        description="Profiles fetched live from the backend `/users` endpoint."
      />

      <section className="card card-toolbar">
        <Link className="inline-link" to="/">
          Back to Home
        </Link>

        <button
          className="btn btn-secondary"
          onClick={() => void fetchUsers()}
          type="button"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {isLoading && (
        <section className="card">
          <p className="loading-text">
            <span className="spinner" aria-hidden="true" />
            Loading team profiles...
          </p>
          <ul className="user-grid user-grid-loading" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <li className="user-card user-card-skeleton" key={index}>
                <span className="skeleton-line skeleton-line-title" />
                <span className="skeleton-line" />
                <span className="skeleton-line skeleton-line-short" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isLoading && error && (
        <section className="card status-panel status-panel-error">
          <h2 className="section-title">Could not load users</h2>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => void fetchUsers()}
            type="button"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading && !error && users.length === 0 && (
        <section className="card status-panel">
          <h2 className="section-title">No users available</h2>
          <p>The backend returned an empty list.</p>
        </section>
      )}

      {!isLoading && !error && users.length > 0 && (
        <section className="card">
          <ul className="user-grid">
            {users.map((user) => (
              <li className="user-card" key={user.id}>
                <div className="user-heading-row">
                  <h3>{user.name}</h3>
                  <span className="role-pill">{user.role}</span>
                </div>

                <dl className="user-meta">
                  <div>
                    <dt>Position</dt>
                    <dd>{user.position}</dd>
                  </div>
                  <div>
                    <dt>Seniority</dt>
                    <dd>{user.seniority}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
