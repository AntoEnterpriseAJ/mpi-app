import { API_BASE_URL } from '../config/env';

export type UserRole = 'User' | 'Manager';

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  role: UserRole | string;
  position: string;
  seniority: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  position: string;
  seniority: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
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
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

export type CreateLeaveRequestPayload = {
  start_date: string;
  end_date: string;
};

type ApiErrorPayload = {
  detail?: string;
  message?: string;
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

type JsonBody = Record<string, unknown>;

type RequestOptions = Omit<RequestInit, 'body'> & {
  auth?: boolean;
  body?: BodyInit | JsonBody | null;
  skipUnauthorizedHandler?: boolean;
};

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

function isRecordBody(
  body: BodyInit | JsonBody | null | undefined,
): body is JsonBody {
  if (body === null || body === undefined) {
    return false;
  }

  if (typeof body !== 'object') {
    return false;
  }

  if (
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return false;
  }

  return true;
}

async function parseApiError(response: Response): Promise<ApiError> {
  const contentType = (
    response.headers.get('Content-Type') ?? ''
  ).toLowerCase();
  let detail: string | undefined;

  try {
    const responseBody = await response.text();
    if (responseBody) {
      if (contentType.includes('application/json')) {
        try {
          const errorPayload = JSON.parse(responseBody) as ApiErrorPayload;
          if (typeof errorPayload.detail === 'string') {
            detail = errorPayload.detail;
          } else if (typeof errorPayload.message === 'string') {
            detail = errorPayload.message;
          } else {
            detail = responseBody;
          }
        } catch {
          detail = responseBody;
        }
      } else {
        detail = responseBody;
      }
    }
  } catch {
    detail = undefined;
  }

  return new ApiError(response.status, detail);
}

function parseJsonBody(rawBody: JsonBody | null): BodyInit | null {
  if (!rawBody) {
    return null;
  }

  return JSON.stringify(rawBody);
}

async function requestJson<T>(
  path: string,
  init: RequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    body,
    headers,
    skipUnauthorizedHandler = false,
    ...requestInit
  } = init;

  const normalizedHeaders = new Headers(headers);

  if (auth && authToken) {
    normalizedHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  let normalizedBody: BodyInit | null | undefined;
  if (isRecordBody(body)) {
    normalizedBody = parseJsonBody(body);
    if (!normalizedHeaders.has('Content-Type')) {
      normalizedHeaders.set('Content-Type', 'application/json');
    }
  } else {
    normalizedBody = body;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: normalizedHeaders,
    body: normalizedBody,
  });

  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorizedHandler) {
      unauthorizedHandler?.();
    }

    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<UserProfile> {
  return requestJson<UserProfile>('/auth/register', {
    method: 'POST',
    auth: false,
    skipUnauthorizedHandler: true,
    body: payload,
  });
}

export async function loginUser(payload: LoginPayload): Promise<TokenResponse> {
  return requestJson<TokenResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    skipUnauthorizedHandler: true,
    body: {
      username: payload.email,
      password: payload.password,
    },
  });
}

export async function getCurrentUser(): Promise<UserProfile> {
  return requestJson<UserProfile>('/auth/me');
}

export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  return requestJson<LeaveRequest>('/leave/request', {
    method: 'POST',
    body: payload,
  });
}

export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  return requestJson<LeaveRequest[]>('/leave/my-requests');
}

export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  return requestJson<LeaveRequest[]>('/leave/requests?leave_status=PENDING');
}

export async function approveLeaveRequest(
  requestId: number,
): Promise<LeaveRequest> {
  return requestJson<LeaveRequest>(`/leave/requests/${requestId}/approve`, {
    method: 'PATCH',
  });
}

export async function rejectLeaveRequest(
  requestId: number,
  rejectionReason?: string,
): Promise<LeaveRequest> {
  return requestJson<LeaveRequest>(`/leave/requests/${requestId}/reject`, {
    method: 'PATCH',
    body: {
      rejection_reason: rejectionReason?.trim() || null,
    },
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.detail ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
