import type { LeaveStatus } from '../services/api';

type StatusBadgeProps = {
  status: LeaveStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status}
    </span>
  );
}
