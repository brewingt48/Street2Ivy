import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { denormalisedResponseEntities } from '../../util/data';
import { parse, getValidInboxSort } from '../../util/urlHelpers';
import { getSupportedProcessesInfo } from '../../transactions/transaction';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const INBOX_PAGE_SIZE = 10;

// ================ Helper functions ================ //

const entityRefs = entities =>
  entities.map(entity => ({
    id: entity.id,
    type: entity.type,
  }));

// ================ Thunks (defined before slice so extraReducers can reference them) ================ //

// Load transactions for inbox
const loadDataPayloadCreator = ({ params, search }, { dispatch, rejectWithValue, extra: sdk }) => {
  const { tab } = params;

  const onlyFilterValues = {
    orders: 'order',
    sales: 'sale',
  };

  const onlyFilter = onlyFilterValues[tab];
  if (!onlyFilter) {
    return Promise.reject(new Error(`Invalid tab for InboxPage: ${tab}`));
  }

  const { page = 1, sort } = parse(search);
  const processNames = getSupportedProcessesInfo().map(p => p.name);

  const apiQueryParams = {
    only: onlyFilter,
    processNames,
    include: [
      'listing',
      'provider',
      'provider.profileImage',
      'customer',
      'customer.profileImage',
      'booking',
    ],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'lastTransitionedAt',
      'transitions',
      'payinTotal',
      'payoutTotal',
      'lineItems',
    ],
    'fields.listing': ['title', 'availabilityPlan', 'publicData.listingType', 'state'],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    page,
    perPage: INBOX_PAGE_SIZE,
    ...getValidInboxSort(sort),
  };

  return sdk.transactions
    .query(apiQueryParams)
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return response;
    })
    .catch(e => {
      return rejectWithValue(storableError(e));
    });
};

export const loadDataThunk = createAsyncThunk('InboxPage/loadData', loadDataPayloadCreator);

// Fetch reviews for current user (used by Reviews tab)
const fetchReviewsPayloadCreator = ({ userId }, { rejectWithValue, extra: sdk }) => {
  return sdk.reviews
    .query({
      subject_id: userId,
      state: 'public',
      include: ['author', 'author.profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    })
    .then(response => {
      return denormalisedResponseEntities(response);
    })
    .catch(e => {
      return rejectWithValue(storableError(e));
    });
};

export const fetchReviewsThunk = createAsyncThunk(
  'InboxPage/fetchReviews',
  fetchReviewsPayloadCreator
);

// ================ Slice ================ //

const inboxPageSlice = createSlice({
  name: 'InboxPage',
  initialState: {
    fetchInProgress: false,
    fetchOrdersOrSalesError: null,
    pagination: null,
    transactionRefs: [],
    // Messaging redesign state
    selectedTxId: null,
    filter: 'all', // 'all' | 'unread'
    searchQuery: '',
    // Reviews tab state
    reviews: [],
    reviewsInProgress: false,
    reviewsError: null,
  },
  reducers: {
    setSelectedConversation: (state, action) => {
      state.selectedTxId = action.payload;
    },
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearInboxSelection: state => {
      state.selectedTxId = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadDataThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchOrdersOrSalesError = null;
      })
      .addCase(loadDataThunk.fulfilled, (state, action) => {
        const transactions = action.payload.data.data;
        state.fetchInProgress = false;
        state.transactionRefs = entityRefs(transactions);
        state.pagination = action.payload.data.meta;
      })
      .addCase(loadDataThunk.rejected, (state, action) => {
        console.error(action.payload || action.error); // eslint-disable-line
        state.fetchInProgress = false;
        state.fetchOrdersOrSalesError = action.payload;
      })
      // Reviews
      .addCase(fetchReviewsThunk.pending, state => {
        state.reviewsInProgress = true;
        state.reviewsError = null;
      })
      .addCase(fetchReviewsThunk.fulfilled, (state, action) => {
        state.reviewsInProgress = false;
        state.reviews = action.payload;
      })
      .addCase(fetchReviewsThunk.rejected, (state, action) => {
        state.reviewsInProgress = false;
        state.reviewsError = action.payload;
      });
  },
});

export const {
  setSelectedConversation,
  setFilter,
  setSearchQuery,
  clearInboxSelection,
} = inboxPageSlice.actions;

export default inboxPageSlice.reducer;

// Backward compatible wrapper for the thunk
export const loadData = (params, search) => (dispatch, getState, sdk) => {
  return dispatch(loadDataThunk({ params, search }));
};
