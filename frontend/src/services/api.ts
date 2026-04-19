import { API_BASE_URL } from '../config/env';

export type HealthResponse = {
  message: string;
  status: string;
};

export type User = {
  id: number;
  name: string;
  role: string;
  position: string;
  seniority: string;
};

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LeaveRequest = {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: LeaveStatus;
  created_at: string;
};

export type CreateLeaveRequestPayload = {
  user_id: number;
  start_date: string;
  end_date: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, detail?: string) {
    super(detail ?? `Request failed with status ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  let detail: string | undefined;

  try {
    const errorPayload = (await response.json()) as ApiErrorPayload;
    if (typeof errorPayload.detail === 'string') {
      detail = errorPayload.detail;
    }
  } catch {
    detail = undefined;
  }

  if (!response.ok) {
    return new ApiError(response.status, detail);
  }

  return new ApiError(response.status);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health');
}

export async function getUsers(): Promise<User[]> {
  return requestJson<User[]>('/users');
}

export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  return requestJson<LeaveRequest>('/leave/request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getUserLeaveHistory(
  userId: number,
): Promise<LeaveRequest[]> {
  return requestJson<LeaveRequest[]>(`/leave/my-requests/${userId}`);
}
