import React, { Component } from 'react';
import css from './DashboardErrorBoundary.module.css';

/**
 * Error boundary for dashboard pages.
 *
 * Catches render errors in dashboard tab content and displays
 * a friendly fallback UI instead of crashing the entire page.
 *
 * Props:
 *   - pageName: string (optional) — context for error logging
 *   - children: React nodes
 *
 * Stage 5 Production Hardening.
 */
class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const pageName = this.props.pageName || 'Unknown';
    console.error(`[DashboardErrorBoundary] Error in ${pageName}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={css.errorContainer}>
          <div className={css.errorCard}>
            <div className={css.errorIcon}>&#9888;</div>
            <h2 className={css.errorTitle}>Something went wrong</h2>
            <p className={css.errorDescription}>
              We encountered an unexpected error while loading this section.
              Please try again, or reload the page if the problem persists.
            </p>
            <div className={css.errorActions}>
              <button
                type="button"
                className={css.retryButton}
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button
                type="button"
                className={css.reloadButton}
                onClick={this.handleReload}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
