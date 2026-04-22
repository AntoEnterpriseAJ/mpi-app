import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';
import { validateEmail, validatePassword } from '../utils/validation';

type LoginFormState = {
  email: string;
  password: string;
};

type LoginState = {
  from?: {
    pathname?: string;
  };
  prefillEmail?: string;
};

const INITIAL_STATE: LoginFormState = {
  email: '',
  password: '',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const navigationState = location.state as LoginState | null;

  const [formState, setFormState] = useState<LoginFormState>({
    ...INITIAL_STATE,
    email: navigationState?.prefillEmail ?? '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const emailError = validateEmail(formState.email);
    if (emailError) {
      setFormError(emailError);
      return;
    }

    const passwordError = validatePassword(formState.password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await login({
        email: formState.email.trim(),
        password: formState.password,
      });

      showToast({
        type: 'success',
        title: 'Signed in',
        message: `Welcome back, ${profile.name}.`,
      });

      const targetPath = navigationState?.from?.pathname;
      if (targetPath && targetPath !== '/login' && targetPath !== '/register') {
        navigate(targetPath, { replace: true });
      } else {
        navigate(
          profile.role.toLowerCase() === 'manager' ? '/manager' : '/leave',
          { replace: true },
        );
      }
    } catch (error) {
      setFormError(
        getApiErrorMessage(error, 'Login failed. Please try again.'),
      );
      showToast({
        type: 'error',
        title: 'Authentication failed',
        message: getApiErrorMessage(error, 'Login failed.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Leave Management System</p>
        <h1>Sign in</h1>
        <p className="auth-copy">
          Access your leave dashboard and review requests based on your role.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={formState.email}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={formState.password}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  password: event.target.value,
                }))
              }
              required
            />
          </label>

          {formError ? (
            <p className="status-message error">{formError}</p>
          ) : null}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footnote">
          Don&apos;t have an account? <Link to="/register">Create one</Link>.
        </p>
      </section>
    </main>
  );
}
