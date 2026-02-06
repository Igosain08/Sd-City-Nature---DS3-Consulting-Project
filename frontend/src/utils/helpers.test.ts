import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatDate,
  calculateBiodiversityYield,
  getPriorityColor,
  getBiodiversityYieldColor,
  truncateText,
} from './helpers';

describe('Helper Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(42)).toBe('42');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
    });
  });

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      const result = formatDate('2024-04-15T12:00:00Z');
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/2024/);
      // Day could be 14 or 15 depending on timezone
      expect(result).toMatch(/1[45]/);
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2024-12-25T12:00:00Z');
      expect(result).toMatch(/Dec/);
      expect(result).toMatch(/2024/);
      // Day could be 24 or 25 depending on timezone
      expect(result).toMatch(/2[45]/);
    });
  });

  describe('calculateBiodiversityYield', () => {
    it('should calculate correct yield', () => {
      expect(calculateBiodiversityYield(50, 100)).toBe(0.5);
      expect(calculateBiodiversityYield(75, 100)).toBe(0.75);
      expect(calculateBiodiversityYield(100, 100)).toBe(1);
    });

    it('should handle zero observations', () => {
      expect(calculateBiodiversityYield(10, 0)).toBe(0);
    });

    it('should handle zero species', () => {
      expect(calculateBiodiversityYield(0, 100)).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(calculateBiodiversityYield(33, 100)).toBe(0.33);
    });
  });

  describe('getPriorityColor', () => {
    it('should return red for high priority (>=75)', () => {
      expect(getPriorityColor(75)).toBe('#dc2626');
      expect(getPriorityColor(100)).toBe('#dc2626');
      expect(getPriorityColor(90)).toBe('#dc2626');
    });

    it('should return orange for medium-high priority (50-74)', () => {
      expect(getPriorityColor(50)).toBe('#f97316');
      expect(getPriorityColor(60)).toBe('#f97316');
      expect(getPriorityColor(74)).toBe('#f97316');
    });

    it('should return yellow for medium priority (25-49)', () => {
      expect(getPriorityColor(25)).toBe('#eab308');
      expect(getPriorityColor(40)).toBe('#eab308');
      expect(getPriorityColor(49)).toBe('#eab308');
    });

    it('should return green for low priority (<25)', () => {
      expect(getPriorityColor(0)).toBe('#22c55e');
      expect(getPriorityColor(10)).toBe('#22c55e');
      expect(getPriorityColor(24)).toBe('#22c55e');
    });
  });

  describe('getBiodiversityYieldColor', () => {
    it('should return green for excellent yield (>=0.7)', () => {
      expect(getBiodiversityYieldColor(0.7)).toBe('#059669');
      expect(getBiodiversityYieldColor(1.0)).toBe('#059669');
      expect(getBiodiversityYieldColor(0.85)).toBe('#059669');
    });

    it('should return lime for good yield (0.5-0.69)', () => {
      expect(getBiodiversityYieldColor(0.5)).toBe('#84cc16');
      expect(getBiodiversityYieldColor(0.6)).toBe('#84cc16');
      expect(getBiodiversityYieldColor(0.69)).toBe('#84cc16');
    });

    it('should return yellow for fair yield (0.3-0.49)', () => {
      expect(getBiodiversityYieldColor(0.3)).toBe('#eab308');
      expect(getBiodiversityYieldColor(0.4)).toBe('#eab308');
      expect(getBiodiversityYieldColor(0.49)).toBe('#eab308');
    });

    it('should return red for poor yield (<0.3)', () => {
      expect(getBiodiversityYieldColor(0)).toBe('#ef4444');
      expect(getBiodiversityYieldColor(0.1)).toBe('#ef4444');
      expect(getBiodiversityYieldColor(0.29)).toBe('#ef4444');
    });
  });

  describe('truncateText', () => {
    it('should truncate text longer than maxLength', () => {
      expect(truncateText('Hello World!', 5)).toBe('Hello...');
      expect(truncateText('This is a long sentence', 10)).toBe('This is a ...');
    });

    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
      expect(truncateText('Short', 20)).toBe('Short');
    });

    it('should handle text equal to maxLength', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(truncateText('', 5)).toBe('');
    });
  });
});
