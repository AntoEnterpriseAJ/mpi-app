import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { LoadingScreen } from '../components/LoadingScreen';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  createLeaveRequest,
  getApiErrorMessage,
  getMyLeaveRequests,
  type LeaveRequest,
} from '../services/api';

type LeaveFormState = {
  startDate: string;
  endDate: string;
};

const INITIAL_FORM_STATE: LeaveFormState = {
  startDate: '',
  endDate: '',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(value: string): string {
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

export function LeavePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [formState, setFormState] =
    useState<LeaveFormState>(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const isDateRangeInvalid =
    formState.startDate.length > 0 &&
    formState.endDate.length > 0 &&
    formState.endDate < formState.startDate;

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError('');

    try {
      const entries = await getMyLeaveRequests();
      setHistory(entries);
    } catch (error) {
      setHistory([]);
      setHistoryError(
        getApiErrorMessage(error, 'Could not load your leave history.'),
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const statusSummary = useMemo(() => {
    return history.reduce<Record<string, number>>((accumulator, request) => {
      accumulator[request.status] = (accumulator[request.status] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [history]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!formState.startDate || !formState.endDate) {
      setFormError('Start and end dates are required.');
      return;
    }

    if (isDateRangeInvalid) {
      setFormError('End date must be on or after start date.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdRequest = await createLeaveRequest({
        start_date: formState.startDate,
        end_date: formState.endDate,
      });

      setHistory((previous) => [createdRequest, ...previous]);
      setFormState(INITIAL_FORM_STATE);

      showToast({
        type: 'success',
        title: 'Request submitted',
        message: `Leave request #${createdRequest.id} is pending review.`,
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Could not submit leave request.',
      );
      setFormError(message);
      showToast({
        type: 'error',
        title: 'Request failed',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee Workspace</p>
          <h2>My Leave Requests</h2>
          <p className="page-copy">
            Submit new leave periods and track approval status in real time.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadHistory()}
          disabled={isHistoryLoading}
        >
          {isHistoryLoading ? 'Refreshing...' : 'Refresh history'}
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span>Total</span>
          <strong>{history.length}</strong>
        </article>
        <article className="kpi-card">
          <span>Pending</span>
          <strong>{statusSummary.PENDING ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <span>Approved</span>
          <strong>{statusSummary.APPROVED ?? 0}</strong>
        </article>
        <article className="kpi-card">
          <span>Rejected</span>
          <strong>{statusSummary.REJECTED ?? 0}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <h3>Create request</h3>
          <p className="panel-copy">
            Signed in as <strong>{user?.name}</strong>.
          </p>

          <form className="form-grid" onSubmit={handleSubmit}>
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
                required
              />
            </label>

            <label className="field">
              <span>End date</span>
              <input
                type="date"
                min={formState.startDate || undefined}
                value={formState.endDate}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    endDate: event.target.value,
                  }))
                }
                aria-invalid={isDateRangeInvalid}
                required
              />
            </label>

            {isDateRangeInvalid ? (
              <p className="status-message error">
                End date must be on or after start date.
              </p>
            ) : null}

            {formError ? (
              <p className="status-message error">{formError}</p>
            ) : null}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit request'}
            </button>
          </form>
        </article>

        <article className="panel">
          <h3>History</h3>
          <p className="panel-copy">
            Status colors: orange for pending, green for approved, red for
            rejected.
          </p>

          {isHistoryLoading ? (
            <LoadingScreen label="Loading your requests..." />
          ) : null}

          {!isHistoryLoading && historyError ? (
            <section className="status-message error">
              <p>{historyError}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void loadHistory()}
              >
                Retry
              </button>
            </section>
          ) : null}

          {!isHistoryLoading && !historyError && history.length === 0 ? (
            <p className="status-message info">
              No requests yet. Submit your first leave request.
            </p>
          ) : null}

          {!isHistoryLoading && !historyError && history.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Request #</th>
                    <th scope="col">Start</th>
                    <th scope="col">End</th>
                    <th scope="col">Days</th>
                    <th scope="col">Status</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((request) => (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>{formatDate(request.start_date)}</td>
                      <td>{formatDate(request.end_date)}</td>
                      <td>{request.days_requested}</td>
                      <td>
                        <StatusBadge status={request.status} />
                      </td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td>{request.rejection_reason ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
