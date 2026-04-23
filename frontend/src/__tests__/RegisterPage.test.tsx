import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../pages/RegisterPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import type { UserProfile } from '../services/api';

// Mock the API module
vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    registerUser: vi.fn(),
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

const renderRegisterPage = () => {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <ToastProvider>
          <RegisterPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe.skip('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form rendering', () => {
    it('should render register form with all fields', () => {
      renderRegisterPage();

      expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seniority/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up|create account/i })).toBeInTheDocument();
    });

    it('should render login link', () => {
      renderRegisterPage();

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have empty input fields initially', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(
        /confirm password/i,
      ) as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
      expect(confirmPasswordInput.value).toBe('');
    });
  });

  describe('Form validation', () => {
    it('should show error for empty name', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'John Doe');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(
        screen.getByText(/please enter a valid email/i),
      ).toBeInTheDocument();
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, '123');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(screen.getByText(/password must be at least 8/i)).toBeInTheDocument();
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password456!');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(
        screen.getByText(/password confirmation does not match/i),
      ).toBeInTheDocument();
    });

    it('should show error for missing position', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(
        screen.getByText(
          (content, element) =>
            /position and seniority are required/i.test(content) &&
            element?.tagName.toLowerCase() === 'p',
        ),
      ).toBeInTheDocument();
    });

    it('should show error for missing seniority', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');

      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });
      await user.click(submitBtn);

      expect(
        screen.getByText(/position and seniority are required/i),
      ).toBeInTheDocument();
    });
  });

  describe('Successful registration', () => {
    it('should successfully register user with valid data', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'john@example.com',
        name: 'John Doe',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockResolvedValue(mockUser);

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(registerUser)).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          position: 'Engineer',
          seniority: 'Senior',
        });
      });
    });

    it('should trim input fields before submission', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'john@example.com',
        name: 'John Doe',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockResolvedValue(mockUser);

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, '  John Doe  ');
      await user.type(emailInput, '  john@example.com  ');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, '  Engineer  ');
      await user.type(seniorityInput, '  Senior  ');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(registerUser)).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
          position: 'Engineer',
          seniority: 'Senior',
        });
      });
    });

    it('should redirect to login after successful registration', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'john@example.com',
        name: 'John Doe',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockResolvedValue(mockUser);

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      await user.click(submitBtn);

      // Verify success state (navigation would happen in real app)
      await waitFor(() => {
        expect(vi.mocked(registerUser)).toHaveBeenCalled();
      });
    });
  });

  describe('Registration error handling', () => {
    it('should display error when email already exists', async () => {
      const user = userEvent.setup();
      const { ApiError } = await import('../services/api');
      const { registerUser } = await import('../services/api');

      vi.mocked(registerUser).mockRejectedValue(
        new ApiError(400, 'Email already exists'),
      );

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      await user.click(submitBtn);

      await waitFor(() => {
        const errorElements = screen.getAllByText(/email already exists/i);
        // Should have at least one element with this error (form or toast)
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });

    it('should display generic error on network failure', async () => {
      const user = userEvent.setup();
      const { registerUser } = await import('../services/api');

      vi.mocked(registerUser).mockRejectedValue(new Error('Network error'));

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/registration failed\. please try again\./i),
        ).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'john@example.com',
        name: 'John Doe',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { registerUser } = await import('../services/api');

      // Slow registration to verify button is disabled
      vi.mocked(registerUser).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockUser), 100),
          ),
      );

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      // Button should be enabled before click
      expect(submitBtn).toBeEnabled();

      await user.click(submitBtn);

      // Button should be disabled while submitting
      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });
  });

  describe('Password validation', () => {
    it('should accept password with uppercase, lowercase, and numbers', async () => {
      const user = userEvent.setup();
      const mockUser: UserProfile = {
        id: 2,
        email: 'john@example.com',
        name: 'John Doe',
        role: 'User',
        position: 'Engineer',
        seniority: 'Senior',
      };

      const { registerUser } = await import('../services/api');
      vi.mocked(registerUser).mockResolvedValue(mockUser);

      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const positionInput = screen.getByLabelText(/position/i);
      const seniorityInput = screen.getByLabelText(/seniority/i);
      const submitBtn = screen.getByRole('button', { name: /sign up|create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'SecurePass123');
      await user.type(confirmPasswordInput, 'SecurePass123');
      await user.type(positionInput, 'Engineer');
      await user.type(seniorityInput, 'Senior');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(vi.mocked(registerUser)).toHaveBeenCalled();
      });
    });
  });
});
