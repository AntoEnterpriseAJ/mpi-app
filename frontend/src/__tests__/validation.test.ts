import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '../utils/validation';
import { formatDisplayDate } from '../utils/date';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return error for empty email', () => {
      const error = validateEmail('');
      expect(error).toBeTruthy();
      expect(error).toMatch(/Email is required/);
    });

    it('should return error for invalid email format', () => {
      const testCases = ['invalid', 'user@', '@example.com', 'user @example.com'];

      testCases.forEach((email) => {
        const error = validateEmail(email);
        expect(error).toBeTruthy();
        expect(error).toMatch(/valid email/i);
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'first+last@example.com',
        'user123@test-domain.com',
      ];

      validEmails.forEach((email) => {
        const error = validateEmail(email);
        expect(error).toBeFalsy();
      });
    });

    it('should accept emails with subdomains', () => {
      const error = validateEmail('user@mail.example.com');
      expect(error).toBeFalsy();
    });

    it('should trim whitespace before validation', () => {
      const error = validateEmail('  user@example.com  ');
      expect(error).toBeFalsy();
    });
  });

  describe('validatePassword', () => {
    it('should return error for empty password', () => {
      const error = validatePassword('');
      expect(error).toBeTruthy();
      expect(error).toMatch(/Password is required/);
    });

    it('should return error for password shorter than 8 characters', () => {
      const error = validatePassword('Pass12');
      expect(error).toBeTruthy();
      expect(error).toMatch(/8-72 chars/);
    });

    it('should return error for password without uppercase', () => {
      const error = validatePassword('password123');
      expect(error).toBeTruthy();
      expect(error).toMatch(/uppercase/);
    });

    it('should return error for password without lowercase', () => {
      const error = validatePassword('PASSWORD123');
      expect(error).toBeTruthy();
      expect(error).toMatch(/lowercase/);
    });

    it('should return error for password without digit', () => {
      const error = validatePassword('PasswordAbc');
      expect(error).toBeTruthy();
      expect(error).toMatch(/digit/);
    });

    it('should accept password with uppercase, lowercase, and digit', () => {
      const validPasswords = [
        'Password123',
        'SecurePass1',
        'MyPassword123',
        'VeryLongPasswordWithNumbers123',
      ];

      validPasswords.forEach((password) => {
        const error = validatePassword(password);
        expect(error).toBeFalsy();
      });
    });

    it('should accept passwords with special characters', () => {
      const error = validatePassword('SecurePass123!');
      expect(error).toBeFalsy();
    });

    it('should accept password up to 72 characters', () => {
      const longPassword = 'A' + 'b'.repeat(70) + '1';
      const error = validatePassword(longPassword);
      expect(error).toBeFalsy();
    });
  });
});

describe('Date Utils', () => {
  describe('formatDisplayDate', () => {
    it('should format date string to readable format', () => {
      const date = '2026-04-23';
      const formatted = formatDisplayDate(date);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
      // Should contain recognizable date components
      expect(formatted).toMatch(/\d{1,2}/);
    });

    it('should handle ISO date format', () => {
      const date = '2026-04-23T10:00:00Z';
      const formatted = formatDisplayDate(date);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should be consistent for same date', () => {
      const date = '2026-04-23';
      const formatted1 = formatDisplayDate(date);
      const formatted2 = formatDisplayDate(date);

      expect(formatted1).toBe(formatted2);
    });

    it('should return original value for invalid dates', () => {
      const invalidDate = 'not-a-date';
      const formatted = formatDisplayDate(invalidDate);

      expect(formatted).toBe(invalidDate);
    });

    it('should format dates in en-GB locale', () => {
      const date = '2026-04-23';
      const formatted = formatDisplayDate(date);

      // en-GB format should be like "23 Apr 2026"
      expect(formatted).toMatch(/23.*Apr/);
    });
  });
});
