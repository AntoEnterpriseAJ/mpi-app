import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';
import { validateEmail, validatePassword } from '../utils/validation';

type RegisterFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  position: string;
  seniority: string;
};

const INITIAL_STATE: RegisterFormState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  position: '',
  seniority: '',
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [formState, setFormState] = useState<RegisterFormState>(INITIAL_STATE);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!formState.name.trim()) {
      setFormError('Name is required.');
      return;
    }

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

    if (formState.password !== formState.confirmPassword) {
      setFormError('Password confirmation does not match.');
      return;
    }

    if (!formState.position.trim() || !formState.seniority.trim()) {
      setFormError('Position and seniority are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: formState.email.trim(),
        password: formState.password,
        name: formState.name.trim(),
        position: formState.position.trim(),
        seniority: formState.seniority.trim(),
      });

      showToast({
        type: 'success',
        title: 'Account created',
        message: 'Registration completed. You can now sign in.',
      });

      navigate('/login', {
        replace: true,
        state: { prefillEmail: formState.email.trim() },
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Registration failed. Please try again.',
      );
      setFormError(message);
      showToast({
        type: 'error',
        title: 'Registration failed',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Leave Management System</p>
        <h1>Create account</h1>
        <p className="auth-copy">
          Register as an employee account and start requesting leave.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Full name</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={formState.name}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              required
            />
          </label>

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
              autoComplete="new-password"
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

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={formState.confirmPassword}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  confirmPassword: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Position</span>
            <input
              type="text"
              name="position"
              value={formState.position}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  position: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="field">
            <span>Seniority</span>
            <input
              type="text"
              name="seniority"
              value={formState.seniority}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  seniority: event.target.value,
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
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footnote">
          Already have an account? <Link to="/login">Sign in</Link>.
        </p>
      </section>
    </main>
  );
}
