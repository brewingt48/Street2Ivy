import React, { Component } from 'react';

import appSettings from '../../config/settings';

import { LoadableComponentErrorBoundaryPage } from './LoadableComponentErrorBoundaryPage';

// Use ErrorBoyndary to catch ChunkLoadError
// https://reactjs.org/docs/error-boundaries.html
class LoadableComponentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.state.error.name === 'ChunkLoadError') {
        return <LoadableComponentErrorBoundaryPage />;
      }
      // For non-ChunkLoadError errors, log and show a fallback
      // instead of re-rendering children (which could cause an infinite loop)
      console.error('Component error caught by boundary:', this.state.error);
      return <LoadableComponentErrorBoundaryPage />;
    }

    return this.props.children;
  }
}

// LoadableComponentErrorBoundary helps in situations
// where production build changes in the server and
// long-living client app tries to fetch code chunks that don't exist anymore.
// Note: in development mode with Hot Module Reloading (HMR) in use, this causes error loops.
const UseLoadableErrorBoundaryOnlyInProdutionMode = props => {
  const { children } = props;
  return appSettings.dev ? (
    children
  ) : (
    <LoadableComponentErrorBoundary>{children}</LoadableComponentErrorBoundary>
  );
};
export default UseLoadableErrorBoundaryOnlyInProdutionMode;
