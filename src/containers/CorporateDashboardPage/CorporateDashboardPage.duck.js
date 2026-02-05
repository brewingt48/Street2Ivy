import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { updatedEntities, denormalisedEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { fetchCorporateDashboardStats as fetchCorporateDashboardStatsApi } from '../../util/api';

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
  ]);
};
