import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import {
  ApiError,
  createLeaveRequest,
  getUserLeaveHistory,
  getUsers,
  type LeaveRequest,
  type User,
} from '../services/api';

type LeaveFormState = {
  userId: string;
  startDate: string;
  endDate: string;
};

const INITIAL_FORM_STATE: LeaveFormState = {
  userId: '',
  startDate: '',
  endDate: '',
};

function formatDateValue(value: string): string {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    !yearText ||
    !monthText ||
    !dayText
  ) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatDateTimeValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.detail ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function LeaveManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  const [formState, setFormState] =
    useState<LeaveFormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [historyUserId, setHistoryUserId] = useState('');
  const [historyEntries, setHistoryEntries] = useState<LeaveRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyEmptyMessage, setHistoryEmptyMessage] = useState(
    'Select a user to load leave requests.',
  );

  const loadUsers = useCallback(async () => {
    setIsUsersLoading(true);
    setUsersError('');

    try {
      const data = await getUsers();
      setUsers(data);

      const fallbackUserId = data[0] ? String(data[0].id) : '';

      setFormState((previous) => {
        const hasCurrentUser = data.some(
          (user) => String(user.id) === previous.userId,
        );

        return {
          ...previous,
          userId: hasCurrentUser ? previous.userId : fallbackUserId,
        };
      });

      setHistoryUserId((previous) => {
        const hasCurrentUser = data.some(
          (user) => String(user.id) === previous,
        );
        return hasCurrentUser ? previous : fallbackUserId;
      });

      if (data.length === 0) {
        setHistoryEntries([]);
        setHistoryEmptyMessage(
          'No users are available. Add users before creating leave requests.',
        );
      }
    } catch (requestError) {
      setUsers([]);
      setUsersError(getApiMessage(requestError, 'Could not load users.'));
      setFormState(INITIAL_FORM_STATE);
      setHistoryUserId('');
      setHistoryEntries([]);
      setHistoryError('');
      setHistoryEmptyMessage(
        'Users are required before you can manage leave requests.',
      );
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (selectedUserId: string) => {
    if (!selectedUserId) {
      setHistoryEntries([]);
      setHistoryError('');
      setHistoryEmptyMessage('Select a user to load leave requests.');
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError('');
    setHistoryEmptyMessage('');

    try {
      const data = await getUserLeaveHistory(Number(selectedUserId));
      setHistoryEntries(data);
      if (data.length === 0) {
        setHistoryEmptyMessage('No leave requests found for this user.');
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setHistoryEntries([]);
        setHistoryError('');
        setHistoryEmptyMessage(
          requestError.detail ?? 'No leave requests found for this user.',
        );
      } else {
        setHistoryEntries([]);
        setHistoryError(
          getApiMessage(requestError, 'Could not load leave request history.'),
        );
      }
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadHistory(historyUserId);
  }, [historyUserId, loadHistory]);

  const isDateRangeInvalid =
    formState.startDate !== '' &&
    formState.endDate !== '' &&
    formState.endDate < formState.startDate;

  const isSubmitDisabled =
    isSubmitting ||
    isUsersLoading ||
    users.length === 0 ||
    formState.userId === '' ||
    formState.startDate === '' ||
    formState.endDate === '' ||
    isDateRangeInvalid;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formState.userId || !formState.startDate || !formState.endDate) {
      setFormError('Complete all form fields before submitting.');
      return;
    }

    if (formState.endDate < formState.startDate) {
      setFormError('End date must be on or after the start date.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createLeaveRequest({
        user_id: Number(formState.userId),
        start_date: formState.startDate,
        end_date: formState.endDate,
      });

      setFormSuccess('Leave request created successfully.');
      setFormState((previous) => ({
        ...previous,
        startDate: '',
        endDate: '',
      }));

      if (historyUserId !== formState.userId) {
        setHistoryUserId(formState.userId);
      } else {
        await loadHistory(formState.userId);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 400) {
        setFormError(
          requestError.detail ??
            'Not enough leave days. Select fewer days and try again.',
        );
      } else if (
        requestError instanceof ApiError &&
        requestError.status === 404
      ) {
        setFormError(
          'Selected user was not found. Refresh users and choose a valid user.',
        );
      } else {
        setFormError(
          getApiMessage(requestError, 'Failed to create leave request.'),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page page-leave">
      <div className="page-glow page-glow-a" aria-hidden="true" />
      <div className="page-glow page-glow-b" aria-hidden="true" />

      <AppHeader
        title="Leave Management"
        subtitle="REQUESTS AND HISTORY"
        description="Create leave requests and review request history from the same dashboard."
      />

      <section className="card card-toolbar">
        <div className="toolbar-links">
          <Link className="inline-link" to="/">
            Back to Home
          </Link>
          <Link className="inline-link" to="/users">
            Open Users Directory
          </Link>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => void loadUsers()}
          type="button"
          disabled={isUsersLoading}
        >
          {isUsersLoading ? 'Refreshing users...' : 'Refresh Users'}
        </button>
      </section>

      {usersError && (
        <section className="card status-panel status-panel-error">
          <h2 className="section-title">Could not load users</h2>
          <p>{usersError}</p>
          <button
            className="btn btn-primary"
            onClick={() => void loadUsers()}
            type="button"
          >
            Try Again
          </button>
        </section>
      )}

      {!usersError && (
        <section className="leave-layout">
          <article className="card leave-form-card">
            <h2 className="section-title">Create Leave Request</h2>
            <p className="section-copy">
              Submit a new leave request and validate entitlement rules from the
              backend.
            </p>

            <form className="leave-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>User</span>
                <select
                  value={formState.userId}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      userId: event.target.value,
                    }))
                  }
                  disabled={
                    isSubmitting || isUsersLoading || users.length === 0
                  }
                >
                  {users.length === 0 ? (
                    <option value="">No users available</option>
                  ) : (
                    users.map((user) => (
                      <option key={user.id} value={String(user.id)}>
                        {user.name} (#{user.id})
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={formState.startDate}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      startDate: event.target.value,
                    }))
                  }
                  disabled={
                    isSubmitting || isUsersLoading || users.length === 0
                  }
                  required
                />
              </label>

              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={formState.endDate}
                  min={formState.startDate || undefined}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      endDate: event.target.value,
                    }))
                  }
                  disabled={
                    isSubmitting || isUsersLoading || users.length === 0
                  }
                  aria-invalid={isDateRangeInvalid}
                  required
                />
              </label>

              {isDateRangeInvalid && (
                <p className="field-error">
                  End date must be on or after the start date.
                </p>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={isSubmitDisabled}
              >
                {isSubmitting
                  ? 'Submitting request...'
                  : 'Submit Leave Request'}
              </button>
            </form>

            {formSuccess && <p className="status ok">{formSuccess}</p>}
            {formError && <p className="status error">{formError}</p>}
          </article>

          <article className="card leave-history-card">
            <div className="history-header">
              <div>
                <h2 className="section-title">My Leave Requests</h2>
                <p className="section-copy">
                  Requests are displayed in newest-first order from the API.
                </p>
              </div>

              <div className="history-controls">
                <label className="field field-inline">
                  <span>User</span>
                  <select
                    value={historyUserId}
                    onChange={(event) => setHistoryUserId(event.target.value)}
                    disabled={isUsersLoading || users.length === 0}
                  >
                    {users.length === 0 ? (
                      <option value="">No users available</option>
                    ) : (
                      users.map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {user.name} (#{user.id})
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <button
                  className="btn btn-secondary"
                  onClick={() => void loadHistory(historyUserId)}
                  type="button"
                  disabled={!historyUserId || isHistoryLoading}
                >
                  {isHistoryLoading ? 'Refreshing...' : 'Refresh History'}
                </button>
              </div>
            </div>

            {isHistoryLoading && (
              <p className="loading-text">
                <span className="spinner" aria-hidden="true" />
                Loading leave requests...
              </p>
            )}

            {!isHistoryLoading && historyError && (
              <section className="status-panel status-panel-error">
                <h3 className="section-title">Could not load leave history</h3>
                <p>{historyError}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => void loadHistory(historyUserId)}
                  type="button"
                >
                  Retry
                </button>
              </section>
            )}

            {!isHistoryLoading &&
              !historyError &&
              historyEntries.length === 0 && (
                <section className="status-panel">
                  <h3 className="section-title">No leave requests</h3>
                  <p>{historyEmptyMessage || 'No leave requests found.'}</p>
                </section>
              )}

            {!isHistoryLoading &&
              !historyError &&
              historyEntries.length > 0 && (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th scope="col">Start Date</th>
                        <th scope="col">End Date</th>
                        <th scope="col">Days</th>
                        <th scope="col">Status</th>
                        <th scope="col">Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyEntries.map((requestEntry) => (
                        <tr key={requestEntry.id}>
                          <td>{formatDateValue(requestEntry.start_date)}</td>
                          <td>{formatDateValue(requestEntry.end_date)}</td>
                          <td>{requestEntry.days_requested}</td>
                          <td>
                            <span
                              className={`status-chip status-chip-${requestEntry.status.toLowerCase()}`}
                            >
                              {requestEntry.status}
                            </span>
                          </td>
                          <td>
                            {formatDateTimeValue(requestEntry.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </article>
        </section>
      )}
    </main>
  );
}
