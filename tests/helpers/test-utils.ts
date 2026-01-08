/**
 * Utility functions for tests
 */

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${randomInt(1000, 9999)}`;
}

/**
 * Assert that a value is defined (TypeScript type guard)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * Deep clone an object (useful for test fixtures)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
