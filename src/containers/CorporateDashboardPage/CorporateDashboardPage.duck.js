import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updatedEntities, denormalisedEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';
import {
  fetchCorporateDashboardStats as fetchCorporateDashboardStatsApi,
  fetchCorporateInvites as fetchCorporateInvitesApi,
} from '../../util/api';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';

import { fetchCurrentUser } from '../../ducks/user.duck';

const RESULT_PAGE_SIZE = 42;

// ================ Selectors ================ //

export const getOwnListingsById = (state, listingIds) => {
  const { ownEntities } = state.CorporateDashboardPage;
  const resources = listingIds.map(id => ({
    id,
    type: 'ownListing',
  }));
  const throwIfNotFound = false;
  return denormalisedEntities(ownEntities, resources, throwIfNotFound);
};

// ================ Async Thunks ================ //

const queryOwnListingsPayloadCreator = (queryParams, { extra: sdk, dispatch, rejectWithValue }) => {
  const { perPage, ...rest } = queryParams;
  const params = { ...rest, perPage };

  return sdk.ownListings
    .query(params)
    .then(response => {
      dispatch(addOwnEntities(response));
      return response;
    })
    .catch(e => {
      return rejectWithValue(storableError(e));
    });
};

export const queryOwnListingsThunk = createAsyncThunk(
  'app/CorporateDashboardPage/queryOwnListings',
  queryOwnListingsPayloadCreator
);

export const queryOwnListings = queryParams => (dispatch, getState, sdk) => {
  return dispatch(queryOwnListingsThunk(queryParams)).unwrap();
};

// Fetch enhanced dashboard stats
export const fetchDashboardStatsThunk = createAsyncThunk(
  'app/CorporateDashboardPage/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchCorporateDashboardStatsApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchDashboardStats = () => dispatch => dispatch(fetchDashboardStatsThunk()).unwrap();

// Fetch corporate inbox transactions (orders)
export const fetchCorporateInboxThunk = createAsyncThunk(
  'app/CorporateDashboardPage/fetchCorporateInbox',
  async (_, { extra: sdk, rejectWithValue, dispatch }) => {
    try {
      // Fetch sales (applications to corporate's projects)
      const salesResponse = await sdk.transactions.query({
        only: 'sale',
        lastTransitions: [
          'transition/inquire',
          'transition/request-project-application',
          'transition/accept',
          'transition/decline',
          'transition/complete',
          'transition/review-1-by-provider',
          'transition/review-1-by-customer',
          'transition/review-2-by-provider',
          'transition/review-2-by-customer',
        ],
        include: ['customer', 'customer.profileImage', 'provider', 'listing'],
        perPage: 50,
      });

      // Fetch orders (as customer)
      const ordersResponse = await sdk.transactions.query({
        only: 'order',
        include: ['customer', 'provider', 'provider.profileImage', 'listing'],
        perPage: 50,
      });

      return {
        sales: salesResponse.data.data,
        orders: ordersResponse.data.data,
        included: [...(salesResponse.data.included || []), ...(ordersResponse.data.included || [])],
      };
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchCorporateInbox = () => dispatch => dispatch(fetchCorporateInboxThunk()).unwrap();

// Fetch sent invites
export const fetchSentInvitesThunk = createAsyncThunk(
  'app/CorporateDashboardPage/fetchSentInvites',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await fetchCorporateInvitesApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchSentInvites = (params = {}) => dispatch =>
  dispatch(fetchSentInvitesThunk(params)).unwrap();

// ================ Slice ================ //

const resultIds = data => data.data.map(l => l.id);

const corporateDashboardPageSlice = createSlice({
  name: 'CorporateDashboardPage',
  initialState: {
    pagination: null,
    queryParams: null,
    queryInProgress: false,
    queryListingsError: null,
    currentPageResultIds: [],
    ownEntities: {},
    // Enhanced stats
    dashboardStats: null,
    statsInProgress: false,
    statsError: null,
    // Inbox messages (transactions)
    inboxSales: [],
    inboxOrders: [],
    inboxInProgress: false,
    inboxError: null,
    // Sent invites
    sentInvites: [],
    sentInvitesStats: null,
    sentInvitesInProgress: false,
    sentInvitesError: null,
  },
  reducers: {
    addOwnEntities: (state, action) => {
      const apiResponse = action.payload.data;
      state.ownEntities = updatedEntities({ ...state.ownEntities }, apiResponse);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(queryOwnListingsThunk.pending, (state, action) => {
        state.queryParams = action.meta.arg;
        state.queryInProgress = true;
        state.queryListingsError = null;
        state.currentPageResultIds = [];
      })
      .addCase(queryOwnListingsThunk.fulfilled, (state, action) => {
        state.currentPageResultIds = resultIds(action.payload.data);
        state.pagination = action.payload.data.meta;
        state.queryInProgress = false;
      })
      .addCase(queryOwnListingsThunk.rejected, (state, action) => {
        console.error(action.payload || action.error);
        state.queryInProgress = false;
        state.queryListingsError = action.payload;
      })
      // Dashboard stats
      .addCase(fetchDashboardStatsThunk.pending, state => {
        state.statsInProgress = true;
        state.statsError = null;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action) => {
        state.statsInProgress = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, action) => {
        state.statsInProgress = false;
        state.statsError = action.payload;
      })
      // Inbox messages
      .addCase(fetchCorporateInboxThunk.pending, state => {
        state.inboxInProgress = true;
        state.inboxError = null;
      })
      .addCase(fetchCorporateInboxThunk.fulfilled, (state, action) => {
        state.inboxInProgress = false;
        state.inboxSales = action.payload.sales;
        state.inboxOrders = action.payload.orders;
      })
      .addCase(fetchCorporateInboxThunk.rejected, (state, action) => {
        state.inboxInProgress = false;
        state.inboxError = action.payload;
      })
      // Sent invites
      .addCase(fetchSentInvitesThunk.pending, state => {
        state.sentInvitesInProgress = true;
        state.sentInvitesError = null;
      })
      .addCase(fetchSentInvitesThunk.fulfilled, (state, action) => {
        state.sentInvitesInProgress = false;
        state.sentInvites = action.payload?.invites || [];
        state.sentInvitesStats = action.payload?.stats || null;
      })
      .addCase(fetchSentInvitesThunk.rejected, (state, action) => {
        state.sentInvitesInProgress = false;
        state.sentInvitesError = action.payload;
      });
  },
});

export const { addOwnEntities } = corporateDashboardPageSlice.actions;
export default corporateDashboardPageSlice.reducer;

// ================ Load data ================ //

export const loadData = (params, search, config) => (dispatch, getState, sdk) => {
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  return Promise.all([
    dispatch(fetchCurrentUser()),
    dispatch(
      queryOwnListings({
        perPage: RESULT_PAGE_SIZE,
        include: ['images'],
        'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
        ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
        'limit.images': 1,
      })
    ),
    dispatch(fetchDashboardStatsThunk()),
    dispatch(fetchCorporateInboxThunk()),
    dispatch(fetchSentInvitesThunk()),
  ]);
};
