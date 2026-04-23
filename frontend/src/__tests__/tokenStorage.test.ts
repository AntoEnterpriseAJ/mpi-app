import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
} from '../services/tokenStorage';

// Mock localStorage
const localStorageMock = (() => {
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
  value: localStorageMock,
});

describe('Token Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('setStoredAuthToken', () => {
    it('should store auth token in localStorage', () => {
      const token = 'test-jwt-token';
      setStoredAuthToken(token);

      expect(localStorageMock.getItem('auth_token')).toBe(token);
    });

    it('should overwrite existing token', () => {
      setStoredAuthToken('old-token');
      setStoredAuthToken('new-token');

      expect(localStorageMock.getItem('auth_token')).toBe('new-token');
    });
  });

  describe('getStoredAuthToken', () => {
    it('should retrieve stored auth token', () => {
      const token = 'test-jwt-token';
      setStoredAuthToken(token);

      const retrieved = getStoredAuthToken();

      expect(retrieved).toBe(token);
    });

    it('should return null when no token is stored', () => {
      const retrieved = getStoredAuthToken();

      expect(retrieved).toBeNull();
    });
  });

  describe('clearStoredAuthToken', () => {
    it('should remove auth token from localStorage', () => {
      setStoredAuthToken('test-token');
      clearStoredAuthToken();

      expect(localStorageMock.getItem('auth_token')).toBeNull();
    });

    it('should handle clearing when no token exists', () => {
      // Should not throw
      expect(() => clearStoredAuthToken()).not.toThrow();
    });
  });

  describe('Token lifecycle', () => {
    it('should handle complete token lifecycle', () => {
      // 1. No token initially
      expect(getStoredAuthToken()).toBeNull();

      // 2. Set token
      setStoredAuthToken('jwt-token-123');
      expect(getStoredAuthToken()).toBe('jwt-token-123');

      // 3. Update token
      setStoredAuthToken('jwt-token-456');
      expect(getStoredAuthToken()).toBe('jwt-token-456');

      // 4. Clear token
      clearStoredAuthToken();
      expect(getStoredAuthToken()).toBeNull();
    });
  });
});
