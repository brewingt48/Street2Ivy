import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { searchUsers as searchUsersApi, fetchCompanyListings as fetchCompanyListingsApi } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

const searchCompaniesPayloadCreator = (params, { rejectWithValue }) => {
  return searchUsersApi({ ...params, userType: 'corporate-partner' })
    .then(response => response)
    .catch(e => rejectWithValue(storableError(e)));
};

export const searchCompaniesThunk = createAsyncThunk(
  'app/SearchCompaniesPage/searchCompanies',
  searchCompaniesPayloadCreator
);

export const searchCompanies = params => dispatch => {
  return dispatch(searchCompaniesThunk(params)).unwrap();
};

// Thunk to fetch listings for a specific company
const fetchCompanyListingsPayloadCreator = (authorId, { rejectWithValue }) => {
  return fetchCompanyListingsApi(authorId, { perPage: 5 })
    .then(response => ({ authorId, ...response }))
    .catch(e => rejectWithValue(storableError(e)));
};

export const fetchCompanyListingsThunk = createAsyncThunk(
  'app/SearchCompaniesPage/fetchCompanyListings',
  fetchCompanyListingsPayloadCreator
);

export const fetchCompanyListings = authorId => dispatch => {
  return dispatch(fetchCompanyListingsThunk(authorId)).unwrap();
};

// ================ Slice ================ //

const searchCompaniesPageSlice = createSlice({
  name: 'SearchCompaniesPage',
  initialState: {
    users: [],
    pagination: null,
    searchInProgress: false,
    searchError: null,
    // Map of authorId -> { listings, pagination, isLoading, error }
    companyListings: {},
  },
  reducers: {
    clearCompanyListings: state => {
      state.companyListings = {};
    },
  },
  extraReducers: builder => {
    builder
      .addCase(searchCompaniesThunk.pending, state => {
        state.searchInProgress = true;
        state.searchError = null;
      })
      .addCase(searchCompaniesThunk.fulfilled, (state, action) => {
        state.searchInProgress = false;
        state.users = action.payload.users || [];
        state.pagination = action.payload.pagination || null;
        // Clear company listings when search results change
        state.companyListings = {};
      })
      .addCase(searchCompaniesThunk.rejected, (state, action) => {
        state.searchInProgress = false;
        state.searchError = action.payload;
      })
      // Company listings
      .addCase(fetchCompanyListingsThunk.pending, (state, action) => {
        const authorId = action.meta.arg;
        state.companyListings[authorId] = {
          listings: [],
          pagination: null,
          isLoading: true,
          error: null,
        };
      })
      .addCase(fetchCompanyListingsThunk.fulfilled, (state, action) => {
        const { authorId, listings, pagination } = action.payload;
        state.companyListings[authorId] = {
          listings: listings || [],
          pagination: pagination || null,
          isLoading: false,
          error: null,
        };
      })
      .addCase(fetchCompanyListingsThunk.rejected, (state, action) => {
        const authorId = action.meta.arg;
        state.companyListings[authorId] = {
          listings: [],
          pagination: null,
          isLoading: false,
          error: action.payload,
        };
      });
  },
});

export const { clearCompanyListings } = searchCompaniesPageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  const urlParams = new URLSearchParams(search);
  const searchParams = {};
  for (const [key, value] of urlParams.entries()) {
    searchParams[key] = value;
  }

  return Promise.all([dispatch(fetchCurrentUser()), dispatch(searchCompaniesThunk(searchParams))]);
};

export default searchCompaniesPageSlice.reducer;
