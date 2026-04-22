/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  ApiError,
  getCurrentUser,
  loginUser,
  registerUser,
  setAuthToken,
  setUnauthorizedHandler,
  type RegisterPayload,
  type UserProfile,
} from '../services/api';
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from '../services/tokenStorage';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthorized';

type LoginCredentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  status: AuthStatus;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isManager: boolean;
  login: (credentials: LoginCredentials) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasManagerRole(user: UserProfile | null): boolean {
  return user?.role.toLowerCase() === 'manager';
}

function isUnauthorizedApiError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredAuthToken() ? 'loading' : 'unauthorized',
  );
  const [user, setUser] = useState<UserProfile | null>(null);

  const clearSession = useCallback(() => {
    clearStoredAuthToken();
    setAuthToken(null);
    setUser(null);
    setStatus('unauthorized');
  }, []);

  const setUnauthorizedState = useCallback(() => {
    setUser(null);
    setStatus('unauthorized');
  }, []);

  const refreshSession = useCallback(async () => {
    const existingToken = getStoredAuthToken();
    if (!existingToken) {
      clearSession();
      return;
    }

    setAuthToken(existingToken);
    setStatus('loading');

    try {
      const profile = await getCurrentUser();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      if (isUnauthorizedApiError(error)) {
        clearSession();
        return;
      }

      // Keep persisted token for transient backend/network failures.
      setUnauthorizedState();
    }
  }, [clearSession, setUnauthorizedState]);

  useEffect(() => {
    const existingToken = getStoredAuthToken();

    if (!existingToken) {
      setAuthToken(null);
      return;
    }

    setAuthToken(existingToken);

    let isActive = true;
    void getCurrentUser()
      .then((profile) => {
        if (!isActive) {
          return;
        }

        setUser(profile);
        setStatus('authenticated');
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        if (isUnauthorizedApiError(error)) {
          clearSession();
          return;
        }

        // Keep persisted token for transient backend/network failures.
        setUnauthorizedState();
      });

    return () => {
      isActive = false;
    };
  }, [clearSession, setUnauthorizedState]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };

    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials): Promise<UserProfile> => {
      setStatus('loading');

      try {
        const tokenResponse = await loginUser({ email, password });
        setStoredAuthToken(tokenResponse.access_token);
        setAuthToken(tokenResponse.access_token);

        const profile = await getCurrentUser();
        setUser(profile);
        setStatus('authenticated');
        return profile;
      } catch (error) {
        if (isUnauthorizedApiError(error)) {
          clearSession();
        } else {
          setUnauthorizedState();
        }
        throw error;
      }
    },
    [clearSession, setUnauthorizedState],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    return registerUser(payload);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated' && user !== null,
      isManager: hasManagerRole(user),
      login,
      register,
      logout: clearSession,
      refreshSession,
    }),
    [clearSession, login, refreshSession, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
