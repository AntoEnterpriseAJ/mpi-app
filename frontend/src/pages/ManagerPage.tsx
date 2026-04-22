import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingScreen } from '../components/LoadingScreen';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../contexts/ToastContext';
import {
  approveLeaveRequest,
  getApiErrorMessage,
  getPendingLeaveRequests,
  rejectLeaveRequest,
  type LeaveRequest,
} from '../services/api';

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

export function ManagerPage() {
  const { showToast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>(
    {},
  );

  const loadPendingRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const requests = await getPendingLeaveRequests();
      setPendingRequests(requests);
    } catch (requestError) {
      setPendingRequests([]);
      setError(
        getApiErrorMessage(
          requestError,
          'Could not load pending leave requests.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPendingRequests();
  }, [loadPendingRequests]);

  const totalPendingDays = useMemo(() => {
    return pendingRequests.reduce(
      (sum, request) => sum + request.days_requested,
      0,
    );
  }, [pendingRequests]);

  const handleApprove = async (requestId: number) => {
    setActiveRequestId(requestId);
    setError('');

    try {
      await approveLeaveRequest(requestId);
      setPendingRequests((previous) =>
        previous.filter((request) => request.id !== requestId),
      );
      showToast({
        type: 'success',
        title: 'Request approved',
        message: `Leave request #${requestId} was approved.`,
      });
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Could not approve this request.',
      );
      setError(message);
      showToast({
        type: 'error',
        title: 'Approval failed',
        message,
      });
    } finally {
      setActiveRequestId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setActiveRequestId(requestId);
    setError('');

    try {
      await rejectLeaveRequest(requestId, rejectReasons[requestId]);
      setPendingRequests((previous) =>
        previous.filter((request) => request.id !== requestId),
      );
      showToast({
        type: 'success',
        title: 'Request rejected',
        message: `Leave request #${requestId} was rejected.`,
      });
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Could not reject this request.',
      );
      setError(message);
      showToast({
        type: 'error',
        title: 'Rejection failed',
        message,
      });
    } finally {
      setActiveRequestId(null);
    }
  };

  return (
    <section className="dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manager Control Center</p>
          <h2>Pending Leave Requests</h2>
          <p className="page-copy">
            Review requests in queue and approve or reject without reloading the
            page.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void loadPendingRequests()}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh queue'}
        </button>
      </header>

      <div className="kpi-grid">
        <article className="kpi-card">
          <span>Pending requests</span>
          <strong>{pendingRequests.length}</strong>
        </article>
        <article className="kpi-card">
          <span>Total days requested</span>
          <strong>{totalPendingDays}</strong>
        </article>
      </div>

      <article className="panel">
        <h3>Action center</h3>
        <p className="panel-copy">
          Process pending requests directly from this dashboard.
        </p>

        {isLoading ? (
          <LoadingScreen label="Loading pending requests..." />
        ) : null}

        {!isLoading && error ? (
          <p className="status-message error">{error}</p>
        ) : null}

        {!isLoading && !error && pendingRequests.length === 0 ? (
          <p className="status-message info">
            No pending requests at the moment.
          </p>
        ) : null}

        {!isLoading && pendingRequests.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Request #</th>
                  <th scope="col">User</th>
                  <th scope="col">Start</th>
                  <th scope="col">End</th>
                  <th scope="col">Days</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col">Reject reason</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => {
                  const isRowBusy = activeRequestId === request.id;

                  return (
                    <tr key={request.id}>
                      <td>{request.id}</td>
                      <td>#{request.user_id}</td>
                      <td>{formatDate(request.start_date)}</td>
                      <td>{formatDate(request.end_date)}</td>
                      <td>{request.days_requested}</td>
                      <td>
                        <StatusBadge status={request.status} />
                      </td>
                      <td>{formatDateTime(request.created_at)}</td>
                      <td>
                        <input
                          className="table-input"
                          type="text"
                          placeholder="Optional"
                          value={rejectReasons[request.id] ?? ''}
                          onChange={(event) =>
                            setRejectReasons((previous) => ({
                              ...previous,
                              [request.id]: event.target.value,
                            }))
                          }
                          disabled={isRowBusy}
                        />
                      </td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-primary btn-table"
                          onClick={() => void handleApprove(request.id)}
                          disabled={isRowBusy}
                        >
                          {isRowBusy ? 'Working...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-table"
                          onClick={() => void handleReject(request.id)}
                          disabled={isRowBusy}
                        >
                          {isRowBusy ? 'Working...' : 'Reject'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
