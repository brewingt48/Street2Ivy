import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { searchUsers as searchUsersApi } from '../../util/api';
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

// ================ Slice ================ //

const searchCompaniesPageSlice = createSlice({
  name: 'SearchCompaniesPage',
  initialState: {
    users: [],
    pagination: null,
    searchInProgress: false,
    searchError: null,
  },
  reducers: {},
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
      })
      .addCase(searchCompaniesThunk.rejected, (state, action) => {
        state.searchInProgress = false;
        state.searchError = action.payload;
      });
  },
});

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
