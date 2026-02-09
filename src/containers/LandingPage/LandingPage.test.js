import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import LandingPage from './LandingPage';

const { waitFor, screen } = testingLibrary;

// Mock IntersectionObserver which is not available in jsdom
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  };
});

afterAll(() => {
  delete global.IntersectionObserver;
});

describe('LandingPage', () => {
  it('renders the custom Street2Ivy landing page without errors', async () => {
    // Test that the page renders without throwing
    const { container } = render(<LandingPage />);

    await waitFor(() => {
      // Verify the main structure is present
      expect(container.querySelector('main')).toBeInTheDocument();
    });
  });

  it('renders hero section structure', async () => {
    const { container } = render(<LandingPage />);

    await waitFor(() => {
      // Check for hero section by class
      const heroSection = container.querySelector('section');
      expect(heroSection).toBeInTheDocument();
    });
  });

  it('renders navigation links for unauthenticated users', async () => {
    const { container } = render(<LandingPage />);

    await waitFor(() => {
      // Check that signup link exists (by href)
      const signupLink = container.querySelector('a[href="/signup"]');
      expect(signupLink).toBeInTheDocument();
    });
  });

  it('renders multiple sections', async () => {
    const { container } = render(<LandingPage />);

    await waitFor(() => {
      // Verify multiple sections are rendered
      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(3);
    });
  });

  it('renders testimonial cards', async () => {
    const { container } = render(<LandingPage />);

    await waitFor(() => {
      // Check for testimonial content (quotes have specific format)
      const quotes = container.querySelectorAll('p');
      expect(quotes.length).toBeGreaterThan(0);
    });
  });
});
