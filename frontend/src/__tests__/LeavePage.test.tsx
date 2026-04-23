import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LeavePage } from '../pages/LeavePage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import type { UserProfile, LeaveRequest } from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    createLeaveRequest: vi.fn(),
    getMyLeaveRequests: vi.fn(),
    setAuthToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  };
});

// Mock token storage
vi.mock('../services/tokenStorage', () => ({
  getStoredAuthToken: vi.fn(() => 'valid-token'),
  setStoredAuthToken: vi.fn(),
  clearStoredAuthToken: vi.fn(),
}));

const mockUser: UserProfile = {
  id: 1,
  email: 'user@example.com',
  name: 'Test User',
  role: 'User',
  position: 'Engineer',
  seniority: 'Senior',
};

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
  {
    id: 2,
    user_id: 1,
    start_date: '2026-06-01',
    end_date: '2026-06-10',
    days_requested: 10,
    status: 'PENDING',
    created_at: '2026-04-24T10:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
  },
];

const renderLeavePage = () => {
  return render(
    <MemoryRouter initialEntries={['/leave']}>
      <AuthProvider>
        <ToastProvider>
          <LeavePage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe.skip('LeavePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page rendering and initialization', () => {
    it('should render leave page heading', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue([]);

      renderLeavePage();

      expect(
        screen.getByRole('heading', { name: /leave requests|my leave/i }),
      ).toBeInTheDocument();
    });

    it('should load user leave requests on mount', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue(mockLeaveRequests);

      renderLeavePage();

      await waitFor(() => {
        expect(vi.mocked(getMyLeaveRequests)).toHaveBeenCalled();
      });
    });
  });

  describe('Leave request creation', () => {
    it('should render form to create leave request', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue([]);

      renderLeavePage();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /request leave|submit/i }),
        ).toBeInTheDocument();
      });
    });

    it('should create leave request with valid dates', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getMyLeaveRequests, createLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue([]);

      const newLeaveRequest: LeaveRequest = {
        id: 3,
        user_id: 1,
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        days_requested: 5,
        status: 'PENDING',
        created_at: '2026-04-24T10:00:00Z',
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
      };

      vi.mocked(createLeaveRequest).mockResolvedValue(newLeaveRequest);

      renderLeavePage();

      const startDateInput = screen.getByLabelText(/start date|from/i);
      const endDateInput = screen.getByLabelText(/end date|to/i);
      const submitBtn = screen.getByRole('button', { name: /request leave|submit/i });

      await user.type(startDateInput, '2026-07-01');
      await user.type(endDateInput, '2026-07-05');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(createLeaveRequest)).toHaveBeenCalledWith({
          start_date: '2026-07-01',
          end_date: '2026-07-05',
        });
      });
    });
  });

  describe('Leave request display', () => {
    it('should display user leave requests with status badges', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue(mockLeaveRequests);

      renderLeavePage();

      await waitFor(() => {
        expect(screen.getByText(/APPROVED|approved/i)).toBeInTheDocument();
        expect(screen.getByText(/PENDING|pending/i)).toBeInTheDocument();
      });
    });

    it('should display message when no leave requests exist', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue([]);

      renderLeavePage();

      await waitFor(() => {
        expect(
          screen.getByText(/no leave requests|no requests/i),
        ).toBeInTheDocument();
      });
    });

    it('should display leave request details correctly', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue(mockLeaveRequests);

      renderLeavePage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
        expect(screen.getByText('2026-05-05')).toBeInTheDocument();
        expect(screen.getByText(/5/)).toBeInTheDocument(); // days_requested
      });
    });
  });

  describe('Error handling', () => {
    it('should handle error loading leave requests', async () => {
      const { getCurrentUser, getMyLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockRejectedValue(
        new Error('Failed to load requests'),
      );

      renderLeavePage();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load|error loading/i),
        ).toBeInTheDocument();
      });
    });

    it('should handle error creating leave request', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getMyLeaveRequests, createLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(getMyLeaveRequests).mockResolvedValue([]);
      vi.mocked(createLeaveRequest).mockRejectedValue(
        new Error('Invalid dates'),
      );

      renderLeavePage();

      const startDateInput = screen.getByLabelText(/start date|from/i);
      const endDateInput = screen.getByLabelText(/end date|to/i);
      const submitBtn = screen.getByRole('button', { name: /request leave|submit/i });

      await user.type(startDateInput, '2026-07-01');
      await user.type(endDateInput, '2026-07-05');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to create|error creating/i),
        ).toBeInTheDocument();
      });
    });
  });
});
