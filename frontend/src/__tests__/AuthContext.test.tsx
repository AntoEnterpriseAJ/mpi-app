import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import {
  setAuthToken,
  setUnauthorizedHandler,
  type UserProfile,
} from '../services/api';
import {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
} from '../services/tokenStorage';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    setAuthToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  };
});

// Mock the token storage module
vi.mock('../services/tokenStorage', () => ({
  getStoredAuthToken: vi.fn(),
  setStoredAuthToken: vi.fn(),
  clearStoredAuthToken: vi.fn(),
}));

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component that uses useAuth
function TestComponent() {
  const { status, user, isAuthenticated, isManager, login, register, logout } =
    useAuth();

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="manager">{isManager.toString()}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="user-role">{user?.role || 'none'}</div>
      <button
        data-testid="login-btn"
        onClick={() =>
          login({ email: 'test@example.com', password: 'password123' })
        }
      >
        Login
      </button>
      <button
        data-testid="register-btn"
        onClick={() =>
          register({
            email: 'new@example.com',
            password: 'password123',
            name: 'New User',
            position: 'Engineer',
            seniority: 'Senior',
          })
        }
      >
        Register
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (component: ReactNode) => {
    return render(<AuthProvider>{component}</AuthProvider>);
  };

  describe('AuthProvider initialization', () => {
    it('should start with unauthorized status when no token is stored', () => {
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithAuth(<TestComponent />);

      expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    it('should start with loading status when token is stored', () => {
      vi.mocked(getStoredAuthToken).mockReturnValue('stored-token');

      renderWithAuth(<TestComponent />);

      expect(screen.getByTestId('status')).toHaveTextContent('loading');
    });
  });

  describe('Session recovery on app load', () => {
    it('should recover session with valid stored token', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        mockUser.email,
      );
      expect(setAuthToken).toHaveBeenCalledWith('valid-token');
    });

    it('should clear session on 401 error during recovery', async () => {
      const { ApiError } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('expired-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockRejectedValue(
        new ApiError(401, 'Unauthorized'),
      );

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      });

      expect(clearStoredAuthToken).toHaveBeenCalled();
      expect(setAuthToken).toHaveBeenCalledWith(null);
    });

    it('should keep token on transient errors during recovery', async () => {
      const { ApiError } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockRejectedValue(
        new ApiError(500, 'Server error'),
      );

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      });

      // Should NOT clear the token on transient errors
      expect(clearStoredAuthToken).not.toHaveBeenCalled();
    });
  });

  describe('Login flow', () => {
    it('should successfully login user', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue(null);
      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'new-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      expect(setStoredAuthToken).toHaveBeenCalledWith('new-token');
      expect(setAuthToken).toHaveBeenCalledWith('new-token');
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        mockUser.email,
      );
    });

    it('should handle login error', async () => {
      const { ApiError } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue(null);
      const { loginUser } = await import('../services/api');
      vi.mocked(loginUser).mockRejectedValue(
        new ApiError(401, 'Invalid credentials'),
      );

      renderWithAuth(<TestComponent />);

      const loginBtn = screen.getByTestId('login-btn');
      loginBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      });

      expect(clearStoredAuthToken).toHaveBeenCalled();
    });
  });

  describe('Register flow', () => {
    it('should successfully register user', async () => {
      const mockUser: UserProfile = {
        id: 2,
        email: 'new@example.com',
        name: 'New User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue(null);
      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      const registerBtn = screen.getByTestId('register-btn');
      registerBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent(
          mockUser.email,
        );
      });
    });

    it('should handle register error', async () => {
      const { ApiError } = await import('../services/api');

      vi.mocked(getStoredAuthToken).mockReturnValue(null);
      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockRejectedValue(
        new ApiError(400, 'Email already exists'),
      );

      renderWithAuth(<TestComponent />);

      const registerBtn = screen.getByTestId('register-btn');
      registerBtn.click();

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      });
    });
  });

  describe('Logout flow', () => {
    it('should clear auth state on logout', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      logoutBtn.click();

      expect(clearStoredAuthToken).toHaveBeenCalled();
      expect(setAuthToken).toHaveBeenCalledWith(null);
      expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });
  });

  describe('Role-based state', () => {
    it('should set isManager to true for Manager role', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'Manager',
        position: 'Manager',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('manager')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('user-role')).toHaveTextContent('Manager');
    });

    it('should set isManager to false for User role', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Regular User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Junior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('manager')).toHaveTextContent('false');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponentWithoutProvider = () => {
        const auth = useAuth();
        return <div>{auth.status}</div>;
      };

      expect(() => render(<TestComponentWithoutProvider />)).toThrow(
        'useAuth must be used inside AuthProvider.',
      );
    });

    it('should provide auth context values', async () => {
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      vi.mocked(getStoredAuthToken).mockReturnValue('valid-token');
      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Verify all values are accessible
      expect(screen.getByTestId('status')).toBeInTheDocument();
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByTestId('manager')).toBeInTheDocument();
      expect(screen.getByTestId('user-email')).toBeInTheDocument();
    });
  });

  describe('Unauthorized handler integration', () => {
    it('should register unauthorized handler on mount', () => {
      vi.mocked(getStoredAuthToken).mockReturnValue(null);

      renderWithAuth(<TestComponent />);

      expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clear auth when unauthorized handler is called', async () => {
      let unauthorizedCallback: (() => void) | null = null;

      vi.mocked(getStoredAuthToken).mockReturnValue(null);
      vi.mocked(setUnauthorizedHandler).mockImplementation((cb) => {
        unauthorizedCallback = cb;
      });

      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { getCurrentUser } = await import('../services/api');
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderWithAuth(<TestComponent />);

      // Verify handler was registered
      expect(unauthorizedCallback).not.toBeNull();

      // Call the unauthorized handler
      unauthorizedCallback?.();

      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('unauthorized');
      });

      expect(clearStoredAuthToken).toHaveBeenCalled();
    });
  });
});
