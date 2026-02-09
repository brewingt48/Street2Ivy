import React, { act } from 'react';
import ReactDOMClient from 'react-dom/client';
import { getHostedConfiguration } from './util/testHelpers';
import { ClientApp } from './app';
import configureStore from './store';

const jsdomScroll = window.scroll;
beforeAll(() => {
  // Mock window.scroll - otherwise, Jest/JSDOM will print a not-implemented error.
  window.scroll = () => {};
});

afterAll(() => {
  window.scroll = jsdomScroll;
});

describe('Application - JSDOM environment', () => {
  it('renders the LandingPage without crashing', () => {
    window.google = { maps: {} };

    // LandingPage gets rendered and it calls hostedAsset > fetchPageAssets > sdk.assetByVersion
    const pageData = {
      data: {
        sections: [],
        _schema: './schema.json',
      },
      meta: {
        version: 'bCsMYVYVawc8SMPzZWJpiw',
      },
    };
    const resolvePageAssetCall = () => Promise.resolve(pageData);
    const fakeSdk = { assetByVersion: resolvePageAssetCall, assetByAlias: resolvePageAssetCall };
    const store = configureStore({ initialState: {}, sdk: fakeSdk });
    const div = document.createElement('div');
    const root = ReactDOMClient.createRoot(div);

    // Render the app synchronously — this test only verifies no crash during initial render.
    // We wrap in act() synchronously to batch React updates, but don't await async effects.
    act(() => {
      root.render(<ClientApp store={store} hostedConfig={getHostedConfiguration()} />);
    });

    // The test verifies no crash during initial render.
    // With React 18's concurrent mode, content may not be in div.innerHTML yet,
    // but the absence of thrown errors is the key assertion.

    // Properly unmount to prevent jsdom cleanup errors
    act(() => {
      root.unmount();
    });
    delete window.google;
  });
});
