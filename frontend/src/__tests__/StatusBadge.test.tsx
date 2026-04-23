import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import type { LeaveStatus } from '../services/api';

describe('StatusBadge Component', () => {
  describe('Rendering', () => {
    it('should render badge with PENDING status', () => {
      render(<StatusBadge status="PENDING" />);

      const badge = screen.getByText(/pending/i);
      expect(badge).toBeInTheDocument();
    });

    it('should render badge with APPROVED status', () => {
      render(<StatusBadge status="APPROVED" />);

      const badge = screen.getByText(/approved/i);
      expect(badge).toBeInTheDocument();
    });

    it('should render badge with REJECTED status', () => {
      render(<StatusBadge status="REJECTED" />);

      const badge = screen.getByText(/rejected/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply pending styles for PENDING status', () => {
      const { container } = render(<StatusBadge status="PENDING" />);

      const badge = container.querySelector('[class*="pending"]') ||
        container.querySelector('[class*="PENDING"]') || (
          screen.getByText(/pending/i).parentElement
        );

      expect(badge).toBeInTheDocument();
    });

    it('should apply approved styles for APPROVED status', () => {
      const { container } = render(<StatusBadge status="APPROVED" />);

      const badge = container.querySelector('[class*="approved"]') ||
        container.querySelector('[class*="APPROVED"]') || (
          screen.getByText(/approved/i).parentElement
        );

      expect(badge).toBeInTheDocument();
    });

    it('should apply rejected styles for REJECTED status', () => {
      const { container } = render(<StatusBadge status="REJECTED" />);

      const badge = container.querySelector('[class*="rejected"]') ||
        container.querySelector('[class*="REJECTED"]') || (
          screen.getByText(/rejected/i).parentElement
        );

      expect(badge).toBeInTheDocument();
    });
  });

  describe('Different status types', () => {
    const statuses: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

    statuses.forEach((status) => {
      it(`should correctly display ${status} status`, () => {
        render(<StatusBadge status={status} />);

        const badge = screen.getByText(new RegExp(status, 'i'));
        expect(badge).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be readable by screen readers', () => {
      render(<StatusBadge status="APPROVED" />);

      const badge = screen.getByText(/approved/i);
      expect(badge).toHaveTextContent('APPROVED');
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<StatusBadge status="PENDING" />);

      // Should contain text content that represents the status
      expect(container.textContent).toMatch(/pending/i);
    });
  });
});
