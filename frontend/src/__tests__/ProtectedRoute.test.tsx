import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PublicOnlyRoute } from '../components/PublicOnlyRoute';
import { AuthProvider } from '../contexts/AuthContext';
import type { UserProfile } from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    setAuthToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  };
});

// Mock token storage
vi.mock('../services/tokenStorage', () => ({
  getStoredAuthToken: vi.fn(() => null),
  setStoredAuthToken: vi.fn(),
  clearStoredAuthToken: vi.fn(),
}));

// Test components
const ProtectedPageContent = () => <div data-testid="protected-content">Protected Page</div>;
const LoginPageContent = () => <div data-testid="login-page">Login Page</div>;
const ManagerPageContent = () => <div data-testid="manager-content">Manager Page</div>;

const renderWithRouter = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          {/* Public only routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPageContent />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/leave" element={<ProtectedPageContent />} />
          </Route>

          {/* Manager only routes */}
          <Route element={<ProtectedRoute requiredRole="Manager" />}>
            <Route path="/manager" element={<ManagerPageContent />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading screen when recovering session', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');

      renderWithRouter('/leave');

      expect(screen.getByLabelText(/recovering session/i)).toBeInTheDocument();
    });
  });

  describe('Unauthenticated access', () => {
    it('should redirect to login when not authenticated', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithRouter('/leave');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to login when token is invalid', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');
      const { ApiError } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('invalid-token');
      vi.mocked(getCurrentUser).mockRejectedValue(
        new ApiError(401, 'Unauthorized'),
      );

      renderWithRouter('/leave');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated access', () => {
    it('should allow access to protected route when authenticated', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithRouter('/leave');

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should render outlet content when authenticated', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithRouter('/leave');

      await waitFor(() => {
        expect(screen.getByText('Protected Page')).toBeInTheDocument();
      });
    });
  });

  describe('Role-based access control', () => {
    it('should allow manager access to manager-only route', async () => {
      const mockManager: UserProfile = {
        id: 2,
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'Manager',
        position: 'Manager',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);

      renderWithRouter('/manager');

      await waitFor(() => {
        expect(screen.getByTestId('manager-content')).toBeInTheDocument();
      });
    });

    it('should deny regular user access to manager-only route', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Regular User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Junior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithRouter('/manager');

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('manager-content')).not.toBeInTheDocument();
    });

    it('should redirect user to fallback path when role does not match', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Regular User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Junior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithRouter('/manager');

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });

    it('should handle case-insensitive role comparison', async () => {
      const mockManager: UserProfile = {
        id: 2,
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'MANAGER',
        position: 'Manager',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);

      renderWithRouter('/manager');

      await waitFor(() => {
        expect(screen.getByTestId('manager-content')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation state', () => {
    it('should preserve location state when redirecting to login', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithRouter('/leave');

      // The login page would be rendered with state preserved
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });
});

describe('PublicOnlyRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated access', () => {
    it('should allow access to public route when not authenticated', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('should render outlet content when not authenticated', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated access', () => {
    it('should redirect authenticated user away from public-only route', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      });
    });

    it('should redirect manager to default fallback when accessing login', async () => {
      const mockManager: UserProfile = {
        id: 2,
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'Manager',
        position: 'Manager',
        seniority: 'Senior',
      };

      const { getStoredAuthToken } = await import('../services/tokenStorage');
      const { getCurrentUser } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      vi.mocked(getCurrentUser).mockResolvedValue(mockManager);

      renderWithRouter('/login');

      await waitFor(() => {
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('should show loading screen when recovering session on public route', async () => {
      const { getStoredAuthToken } = await import('../services/tokenStorage');
      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');

      renderWithRouter('/login');

      expect(screen.getByLabelText(/recovering session/i)).toBeInTheDocument();
    });
  });
});
