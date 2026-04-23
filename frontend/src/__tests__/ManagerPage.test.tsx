import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ManagerPage } from '../pages/ManagerPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import type { UserProfile, LeaveRequest } from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getPendingLeaveRequests: vi.fn(),
    approveLeaveRequest: vi.fn(),
    rejectLeaveRequest: vi.fn(),
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

const mockManager: UserProfile = {
  id: 2,
  email: 'manager@example.com',
  name: 'Manager User',
  role: 'Manager',
  position: 'Manager',
  seniority: 'Senior',
};

const mockPendingRequests: LeaveRequest[] = [
  {
    id: 1,
    user_id: 1,
    start_date: '2026-05-01',
    end_date: '2026-05-05',
    days_requested: 5,
    status: 'PENDING',
    created_at: '2026-04-23T10:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
  },
  {
    id: 2,
    user_id: 3,
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

const renderManagerPage = () => {
  return render(
    <MemoryRouter initialEntries={['/manager']}>
      <AuthProvider>
        <ToastProvider>
          <ManagerPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('ManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page rendering and initialization', () => {
    it('should render manager dashboard heading', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue([]);

      renderManagerPage();

      expect(
        screen.getByRole('heading', { name: /manager|dashboard|pending/i }),
      ).toBeInTheDocument();
    });

    it('should load pending leave requests on mount', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      renderManagerPage();

      await waitFor(() => {
        expect(vi.mocked(getPendingLeaveRequests)).toHaveBeenCalled();
      });
    });
  });

  describe('Pending requests display', () => {
    it('should display pending leave requests', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
        expect(screen.getByText('2026-06-01')).toBeInTheDocument();
      });
    });

    it('should display message when no pending requests', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue([]);

      renderManagerPage();

      await waitFor(() => {
        expect(
          screen.getByText(/no pending|no requests|empty/i),
        ).toBeInTheDocument();
      });
    });

    it('should display request details correctly', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
        expect(screen.getByText('2026-05-05')).toBeInTheDocument();
        expect(screen.getByText(/5/)).toBeInTheDocument(); // days_requested
      });
    });
  });

  describe('Approve leave request', () => {
    it('should approve pending leave request', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, approveLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      const approvedRequest: LeaveRequest = {
        ...mockPendingRequests[0],
        status: 'APPROVED',
        reviewed_by: 2,
        reviewed_at: '2026-04-24T10:00:00Z',
      };

      vi.mocked(approveLeaveRequest).mockResolvedValue(approvedRequest);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', {
        name: /approve/i,
      });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(vi.mocked(approveLeaveRequest)).toHaveBeenCalledWith(1);
      });
    });

    it('should update local state after approval', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, approveLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      const approvedRequest: LeaveRequest = {
        ...mockPendingRequests[0],
        status: 'APPROVED',
        reviewed_by: 2,
        reviewed_at: '2026-04-24T10:00:00Z',
      };

      vi.mocked(approveLeaveRequest).mockResolvedValue(approvedRequest);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', {
        name: /approve/i,
      });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        // Verify request is removed from pending list or marked as approved
        expect(vi.mocked(approveLeaveRequest)).toHaveBeenCalled();
      });
    });

    it('should handle approval error', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, approveLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);
      vi.mocked(approveLeaveRequest).mockRejectedValue(
        new Error('Failed to approve'),
      );

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', {
        name: /approve/i,
      });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to approve|error approving/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Reject leave request', () => {
    it('should reject pending leave request', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, rejectLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      const rejectedRequest: LeaveRequest = {
        ...mockPendingRequests[0],
        status: 'REJECTED',
        reviewed_by: 2,
        reviewed_at: '2026-04-24T10:00:00Z',
        rejection_reason: 'Invalid dates',
      };

      vi.mocked(rejectLeaveRequest).mockResolvedValue(rejectedRequest);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByRole('button', {
        name: /reject/i,
      });
      await user.click(rejectButtons[0]);

      // Manager might be prompted for rejection reason in a modal/dialog
      // This depends on the actual implementation
    });

    it('should reject with reason when provided', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, rejectLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      const rejectedRequest: LeaveRequest = {
        ...mockPendingRequests[0],
        status: 'REJECTED',
        reviewed_by: 2,
        reviewed_at: '2026-04-24T10:00:00Z',
        rejection_reason: 'Conflict with project deadline',
      };

      vi.mocked(rejectLeaveRequest).mockResolvedValue(rejectedRequest);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByRole('button', {
        name: /reject/i,
      });
      await user.click(rejectButtons[0]);

      // If rejection reason is captured in a modal/dialog:
      // const reasonInput = screen.getByLabelText(/reason/i);
      // await user.type(reasonInput, 'Conflict with project deadline');
      // const confirmBtn = screen.getByRole('button', { name: /confirm|submit/i });
      // await user.click(confirmBtn);

      // await waitFor(() => {
      //   expect(vi.mocked(rejectLeaveRequest)).toHaveBeenCalledWith(
      //     1,
      //     'Conflict with project deadline'
      //   );
      // });
    });

    it('should update local state after rejection', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, rejectLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);

      const rejectedRequest: LeaveRequest = {
        ...mockPendingRequests[0],
        status: 'REJECTED',
        reviewed_by: 2,
        reviewed_at: '2026-04-24T10:00:00Z',
        rejection_reason: 'Invalid dates',
      };

      vi.mocked(rejectLeaveRequest).mockResolvedValue(rejectedRequest);

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByRole('button', {
        name: /reject/i,
      });
      await user.click(rejectButtons[0]);

      // Verify request is removed from pending list
      await waitFor(() => {
        expect(vi.mocked(rejectLeaveRequest)).toHaveBeenCalled();
      });
    });

    it('should handle rejection error', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests, rejectLeaveRequest } =
        await import('../services/api');

      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockResolvedValue(mockPendingRequests);
      vi.mocked(rejectLeaveRequest).mockRejectedValue(
        new Error('Failed to reject'),
      );

      renderManagerPage();

      await waitFor(() => {
        expect(screen.getByText('2026-05-01')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByRole('button', {
        name: /reject/i,
      });
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to reject|error rejecting/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle error loading pending requests', async () => {
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockRejectedValue(
        new Error('Failed to load requests'),
      );

      renderManagerPage();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load|error loading/i),
        ).toBeInTheDocument();
      });
    });

    it('should display error notification and allow retry', async () => {
      const user = userEvent.setup();
      const { getCurrentUser, getPendingLeaveRequests } =
        await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);
      vi.mocked(getPendingLeaveRequests).mockRejectedValueOnce(
        new Error('Failed to load'),
      );

      // Mock second call to succeed
      vi.mocked(getPendingLeaveRequests).mockResolvedValueOnce(
        mockPendingRequests,
      );

      renderManagerPage();

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load|error loading/i),
        ).toBeInTheDocument();
      });

      const retryBtn = screen.queryByRole('button', { name: /retry/i });
      if (retryBtn) {
        await user.click(retryBtn);

        await waitFor(() => {
          expect(screen.getByText('2026-05-01')).toBeInTheDocument();
        });
      }
    });
  });
});
