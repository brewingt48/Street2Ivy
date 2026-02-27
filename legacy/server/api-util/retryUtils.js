/**
 * Retry utility with exponential backoff for transient API failures.
 * Used to wrap Sharetribe SDK calls that may fail due to network issues.
 */

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 5000;

/**
 * Execute a function with exponential backoff retry logic.
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 300)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @returns {Promise} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY_MS,
    maxDelay = DEFAULT_MAX_DELAY_MS,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const statusCode = error?.status || error?.statusCode || error?.response?.status;
      const isRetryable =
        RETRYABLE_STATUS_CODES.includes(statusCode) ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'EPIPE';

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 100, maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = { withRetry, RETRYABLE_STATUS_CODES };
