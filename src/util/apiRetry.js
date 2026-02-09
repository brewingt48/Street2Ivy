/**
 * API Retry Utility
 *
 * Provides a wrapper for API calls that retries on network errors and 5xx responses.
 * Uses exponential backoff with jitter to avoid thundering herd problems.
 *
 * Stage 5 Production Hardening.
 */

/**
 * Determine if an error is retryable.
 * Only retry on network errors and 5xx server errors.
 *
 * @param {Error} error - The error to check
 * @returns {boolean} Whether the error is retryable
 */
function isRetryableError(error) {
  // Network errors (no response from server)
  if (!error.status && !error.statusCode) {
    // Check for common network error indicators
    const message = (error.message || '').toLowerCase();
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return true;
    }
  }

  // 5xx server errors
  const status = error.status || error.statusCode;
  if (status && status >= 500 && status < 600) {
    return true;
  }

  return false;
}

/**
 * Wrap an API call with retry logic.
 *
 * @param {Function} apiCall - Async function that makes the API call
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 2)
 * @param {number} options.baseDelayMs - Base delay in ms before first retry (default: 1000)
 * @param {number} options.maxDelayMs - Maximum delay in ms (default: 5000)
 * @returns {Promise<*>} The result of the API call
 * @throws {Error} The last error if all retries fail
 */
export async function withRetry(apiCall, options = {}) {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 5000,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Don't retry non-retryable errors (4xx, auth errors, etc.)
      if (!isRetryableError(error)) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelayMs * 0.5;
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
