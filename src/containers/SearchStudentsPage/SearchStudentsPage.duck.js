import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { searchUsers as searchUsersApi, inviteToApply as inviteToApplyApi } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

const searchStudentsPayloadCreator = (params, { rejectWithValue }) => {
  return searchUsersApi({ ...params, userType: 'student' })
    .then(response => response)
    .catch(e => rejectWithValue(storableError(e)));
};

export const searchStudentsThunk = createAsyncThunk(
  'app/SearchStudentsPage/searchStudents',
  searchStudentsPayloadCreator
);

// Backward-compatible wrapper
export const searchStudents = params => dispatch => {
  return dispatch(searchStudentsThunk(params)).unwrap();
};

const inviteToApplyPayloadCreator = (body, { rejectWithValue }) => {
  return inviteToApplyApi(body)
    .then(response => response)
    .catch(e => rejectWithValue(storableError(e)));
};

export const inviteToApplyThunk = createAsyncThunk(
  'app/SearchStudentsPage/inviteToApply',
  inviteToApplyPayloadCreator
);

export const inviteToApply = body => dispatch => {
  return dispatch(inviteToApplyThunk(body)).unwrap();
};

const queryOwnListingsPayloadCreator = (params, { rejectWithValue, extra: sdk }) => {
  return sdk.ownListings
    .query({
      ...params,
      'fields.listing': ['title', 'state'],
      'limit.images': 0,
    })
    .then(response => {
      const listings = response.data.data.map(l => ({
        id: l.id.uuid,
        title: l.attributes.title,
        state: l.attributes.state,
      }));
      return listings;
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const queryOwnListingsThunk = createAsyncThunk(
  'app/SearchStudentsPage/queryOwnListings',
  queryOwnListingsPayloadCreator
);

export const queryOwnListings = params => dispatch => {
  return dispatch(queryOwnListingsThunk(params)).unwrap();
};

// ================ Slice ================ //

const searchStudentsPageSlice = createSlice({
  name: 'SearchStudentsPage',
  initialState: {
    users: [],
    pagination: null,
    searchInProgress: false,
    searchError: null,
    inviteInProgress: false,
    inviteError: null,
    inviteSuccess: false,
    ownListings: [],
    ownListingsInProgress: false,
  },
  reducers: {
    clearInviteState: state => {
      state.inviteInProgress = false;
      state.inviteError = null;
      state.inviteSuccess = false;
    },
  },
  extraReducers: builder => {
    builder
      // Search students
      .addCase(searchStudentsThunk.pending, state => {
        state.searchInProgress = true;
        state.searchError = null;
      })
      .addCase(searchStudentsThunk.fulfilled, (state, action) => {
        state.searchInProgress = false;
        state.users = action.payload.users || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(searchStudentsThunk.rejected, (state, action) => {
        state.searchInProgress = false;
        state.searchError = action.payload;
      })
      // Invite to apply
      .addCase(inviteToApplyThunk.pending, state => {
        state.inviteInProgress = true;
        state.inviteError = null;
        state.inviteSuccess = false;
      })
      .addCase(inviteToApplyThunk.fulfilled, state => {
        state.inviteInProgress = false;
        state.inviteSuccess = true;
      })
      .addCase(inviteToApplyThunk.rejected, (state, action) => {
        state.inviteInProgress = false;
        state.inviteError = action.payload;
      })
      // Own listings
      .addCase(queryOwnListingsThunk.pending, state => {
        state.ownListingsInProgress = true;
      })
      .addCase(queryOwnListingsThunk.fulfilled, (state, action) => {
        state.ownListingsInProgress = false;
        state.ownListings = action.payload;
      })
      .addCase(queryOwnListingsThunk.rejected, state => {
        state.ownListingsInProgress = false;
      });
  },
});

export const { clearInviteState } = searchStudentsPageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  // Parse search/query params from URL
  const urlParams = new URLSearchParams(search);
  const searchParams = {};
  for (const [key, value] of urlParams.entries()) {
    searchParams[key] = value;
  }

  return Promise.all([
    dispatch(fetchCurrentUser()),
    dispatch(searchStudentsThunk(searchParams)),
    dispatch(queryOwnListingsThunk({ perPage: 100 })),
  ]);
};

export default searchStudentsPageSlice.reducer;
