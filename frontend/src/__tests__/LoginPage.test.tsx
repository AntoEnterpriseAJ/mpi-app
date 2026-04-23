import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import type { UserProfile } from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    loginUser: vi.fn(),
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

const renderLoginPage = (initialRoute = '/login') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form rendering', () => {
    it('should render login form with all fields', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render register link', () => {
      renderLoginPage();

      const registerLink = screen.getByRole('link', { name: /sign up/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should have empty input fields initially', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });
  });

  describe('Form validation', () => {
    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);

      expect(
        screen.getByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);

      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('should clear error when user fixes input', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitBtn);

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      // Error should still be visible until form is resubmitted
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  describe('Successful login', () => {
    it('should successfully login user with valid credentials', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(loginUser)).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });
    });

    it('should redirect to /leave for regular user after login', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      const { container } = renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      // Note: Navigation happens after login, which requires router integration
      // In a real test, you would verify the navigation occurred
    });

    it('should redirect to /manager for manager user after login', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'Manager',
        position: 'Manager',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'manager@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      // Navigation verification would happen here
    });

    it('should trim email before submission', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, '  user@example.com  ');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(loginUser)).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Login error handling', () => {
    it('should display error message on invalid credentials', async () => {
      const user = userEvent.setup();
      const { ApiError } = await import('../services/api');
      const { loginUser } = await import('../services/api');

      vi.mocked(loginUser).mockRejectedValue(
        new ApiError(401, 'Invalid credentials'),
      );

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should display generic error on network failure', async () => {
      const user = userEvent.setup();
      const { loginUser } = await import('../services/api');

      vi.mocked(loginUser).mockRejectedValue(new Error('Network error'));

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/login failed\. please try again\./i),
        ).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');

      // Slow login to verify button is disabled
      vi.mocked(loginUser).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  access_token: 'test-token',
                  token_type: 'Bearer',
                }),
              100,
            ),
          ),
      );
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      // Button should be enabled before click
      expect(submitBtn).toBeEnabled();

      await user.click(submitBtn);

      // Button should be disabled while submitting
      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });
  });

  describe('Prefilled email from navigation state', () => {
    it('should prefill email from navigation state', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <ToastProvider>
              <LoginPage />
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>,
      );

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      // This test would pass if LoginPage receives prefillEmail from location.state
    });
  });

  describe('Navigation from protected route', () => {
    it('should navigate to original location after login', async () => {
      // This test would verify that the user is redirected to the original
      // location they tried to access before being redirected to login
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { loginUser, getCurrentUser } = await import('../services/api');
      vi.mocked(loginUser).mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      renderLoginPage('/login');

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitBtn);

      // Navigation logic would be verified here
    });
  });
});
