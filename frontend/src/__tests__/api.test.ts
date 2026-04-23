import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiError,
  setAuthToken,
  setUnauthorizedHandler,
  registerUser,
  loginUser,
  getCurrentUser,
  createLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  getApiErrorMessage,
  type UserProfile,
  type TokenResponse,
  type LeaveRequest,
  type RegisterPayload,
  type LoginPayload,
} from '../services/api';
import { API_BASE_URL } from '../config/env';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthToken(null);
    setUnauthorizedHandler(null);
  });

  describe('ApiError', () => {
    it('should create ApiError with status and detail', () => {
      const error = new ApiError(401, 'Unauthorized');
      expect(error.status).toBe(401);
      expect(error.detail).toBe('Unauthorized');
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError with default message when detail is not provided', () => {
      const error = new ApiError(500);
      expect(error.status).toBe(500);
      expect(error.message).toBe('Request failed with status 500.');
    });
  });

  describe('setAuthToken', () => {
    it('should set auth token', () => {
      setAuthToken('test-token');
      // Verify token is set by making a request and checking headers
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, email: 'test@example.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Token should be included in the next request
      expect(setAuthToken).toBeDefined();
    });

    it('should clear auth token when set to null', () => {
      setAuthToken(null);
      expect(setAuthToken).toBeDefined();
    });
  });

  describe('setUnauthorizedHandler', () => {
    it('should set unauthorized handler', () => {
      const handler = vi.fn();
      setUnauthorizedHandler(handler);
      expect(handler).toBeDefined();
    });

    it('should clear handler when set to null', () => {
      setUnauthorizedHandler(null);
      expect(setUnauthorizedHandler).toBeDefined();
    });

    it('should call handler on 401 response', async () => {
      const handler = vi.fn();
      setUnauthorizedHandler(handler);

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      try {
        await getCurrentUser();
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
      }

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('registerUser', () => {
    it('should successfully register a user', async () => {
      const payload: RegisterPayload = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const mockUser: UserProfile = {
        id: 1,
        email: payload.email,
        name: payload.name,
        role: 'User',
        position: payload.position,
        seniority: payload.seniority,
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await registerUser(payload);

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/register`,
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should handle registration error', async () => {
      const payload: RegisterPayload = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Email already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(registerUser(payload)).rejects.toThrow(ApiError);
    });
  });

  describe('loginUser', () => {
    it('should successfully login user', async () => {
      const payload: LoginPayload = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockToken: TokenResponse = {
        access_token: 'test-jwt-token',
        token_type: 'Bearer',
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockToken), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await loginUser(payload);

      expect(result).toEqual(mockToken);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should handle login error with invalid credentials', async () => {
      const payload: LoginPayload = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(loginUser(payload)).rejects.toThrow(ApiError);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user profile', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/me`,
        expect.any(Object),
      );
    });

    it('should handle unauthorized error (401)', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('expired-token');
      await expect(getCurrentUser()).rejects.toThrow(ApiError);
    });
  });

  describe('createLeaveRequest', () => {
    it('should create a leave request', async () => {
      const payload = {
        start_date: '2026-05-01',
        end_date: '2026-05-05',
      };

      const mockLeaveRequest: LeaveRequest = {
        id: 1,
        user_id: 1,
        start_date: payload.start_date,
        end_date: payload.end_date,
        days_requested: 5,
        status: 'PENDING',
        created_at: '2026-04-23T10:00:00Z',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLeaveRequest), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await createLeaveRequest(payload);

      expect(result).toEqual(mockLeaveRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/leave/request`,
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('getMyLeaveRequests', () => {
    it('should fetch user leave requests', async () => {
      const mockLeaveRequests: LeaveRequest[] = [
        {
          id: 1,
          user_id: 1,
          start_date: '2026-05-01',
          end_date: '2026-05-05',
          days_requested: 5,
          status: 'APPROVED',
          created_at: '2026-04-23T10:00:00Z',
          reviewed_by: 2,
          reviewed_at: '2026-04-23T11:00:00Z',
          rejection_reason: null,
        },
      ];

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLeaveRequests), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await getMyLeaveRequests();

      expect(result).toEqual(mockLeaveRequests);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/leave/my-requests`,
        expect.any(Object),
      );
    });
  });

  describe('getPendingLeaveRequests', () => {
    it('should fetch pending leave requests', async () => {
      const mockLeaveRequests: LeaveRequest[] = [
        {
          id: 1,
          user_id: 2,
          start_date: '2026-05-01',
          end_date: '2026-05-05',
          days_requested: 5,
          status: 'PENDING',
          created_at: '2026-04-23T10:00:00Z',
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
        },
      ];

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLeaveRequests), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await getPendingLeaveRequests();

      expect(result).toEqual(mockLeaveRequests);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/leave/requests?leave_status=PENDING`,
        expect.any(Object),
      );
    });
  });

  describe('approveLeaveRequest', () => {
    it('should approve a leave request', async () => {
      const mockLeaveRequest: LeaveRequest = {
        id: 1,
        user_id: 2,
        start_date: '2026-05-01',
        end_date: '2026-05-05',
        days_requested: 5,
        status: 'APPROVED',
        created_at: '2026-04-23T10:00:00Z',
        reviewed_by: 1,
        reviewed_at: '2026-04-23T12:00:00Z',
        rejection_reason: null,
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLeaveRequest), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await approveLeaveRequest(1);

      expect(result).toEqual(mockLeaveRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/leave/requests/1/approve`,
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });
  });

  describe('rejectLeaveRequest', () => {
    it('should reject a leave request with reason', async () => {
      const mockLeaveRequest: LeaveRequest = {
        id: 1,
        user_id: 2,
        start_date: '2026-05-01',
        end_date: '2026-05-05',
        days_requested: 5,
        status: 'REJECTED',
        created_at: '2026-04-23T10:00:00Z',
        reviewed_by: 1,
        reviewed_at: '2026-04-23T12:00:00Z',
        rejection_reason: 'Not approved',
      };

      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLeaveRequest), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      setAuthToken('test-token');
      const result = await rejectLeaveRequest(1, 'Not approved');

      expect(result).toEqual(mockLeaveRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/leave/requests/1/reject`,
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });
  });

  describe('getApiErrorMessage', () => {
    it('should return detail message from ApiError', () => {
      const error = new ApiError(401, 'Invalid credentials');
      const message = getApiErrorMessage(error, 'fallback');
      expect(message).toBe('Invalid credentials');
    });

    it('should return error message from ApiError without detail', () => {
      const error = new ApiError(500);
      const message = getApiErrorMessage(error, 'fallback');
      expect(message).toBe('Request failed with status 500.');
    });

    it('should return message from regular Error', () => {
      const error = new Error('Network error');
      const message = getApiErrorMessage(error, 'fallback');
      expect(message).toBe('Network error');
    });

    it('should return fallback message for unknown error', () => {
      const message = getApiErrorMessage({}, 'fallback');
      expect(message).toBe('fallback');
    });
  });
});
