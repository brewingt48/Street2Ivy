import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { parse, getValidInboxSort } from '../../util/urlHelpers';
import { getSupportedProcessesInfo } from '../../transactions/transaction';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchMessageInbox, fetchDirectMessageInbox } from '../../util/api';

const INBOX_PAGE_SIZE = 10;
const MESSAGES_PAGE_SIZE = 20;

// ================ Helper functions ================ //

const entityRefs = entities =>
  entities.map(entity => ({
    id: entity.id,
    type: entity.type,
  }));

// ================ Slice ================ //

const inboxPageSlice = createSlice({
  name: 'InboxPage',
  initialState: {
    fetchInProgress: false,
    fetchOrdersOrSalesError: null,
    pagination: null,
    transactionRefs: [],
    // Custom messaging state (for the "messages" tab)
    conversations: [],
    conversationsPagination: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadDataThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchOrdersOrSalesError = null;
      })
      .addCase(loadDataThunk.fulfilled, (state, action) => {
        const { isMessagesTab } = action.meta.arg;
        state.fetchInProgress = false;

        if (isMessagesTab) {
          // Custom messaging data from our API
          state.conversations = action.payload.conversations || [];
          state.conversationsPagination = action.payload.pagination || null;
          state.transactionRefs = [];
          state.pagination = null;
        } else {
          // Sharetribe transaction data
          const transactions = action.payload.data.data;
          state.transactionRefs = entityRefs(transactions);
          state.pagination = action.payload.data.meta;
          state.conversations = [];
          state.conversationsPagination = null;
        }
      })
      .addCase(loadDataThunk.rejected, (state, action) => {
        console.error(action.payload || action.error); // eslint-disable-line
        state.fetchInProgress = false;
        state.fetchOrdersOrSalesError = action.payload;
      });
  },
});

export default inboxPageSlice.reducer;

// ================ Load data ================ //

const loadDataPayloadCreator = ({ params, search, isMessagesTab }, { dispatch, rejectWithValue, extra: sdk }) => {
  const { tab } = params;

  // "messages" tab: fetch from our custom messaging API + direct messages, then merge
  if (isMessagesTab || tab === 'messages') {
    const { page = 1 } = parse(search);
    const offset = (page - 1) * MESSAGES_PAGE_SIZE;

    return Promise.all([
      fetchMessageInbox({ limit: MESSAGES_PAGE_SIZE, offset }),
      fetchDirectMessageInbox({ limit: MESSAGES_PAGE_SIZE, offset }).catch(() => ({ threads: [] })),
    ])
      .then(([appResponse, directResponse]) => {
        // Tag application conversations with their type
        const appConversations = (appResponse.conversations || []).map(c => ({
          ...c,
          conversationType: 'application',
        }));

        // Convert direct message threads to the same shape
        const directConversations = (directResponse.threads || []).map(t => ({
          ...t,
          id: t.threadId,
          conversationType: 'direct',
        }));

        // Merge both lists, sorted by lastMessageAt descending
        const allConversations = [...appConversations, ...directConversations].sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || a.submittedAt || 0);
          const dateB = new Date(b.lastMessageAt || b.submittedAt || 0);
          return dateB - dateA;
        });

        return {
          conversations: allConversations,
          pagination: appResponse.pagination,
        };
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  }

  // Map URL tab names to Sharetribe API filter values
  // "applications" = student's view (customer/order), "received" = corporate partner's view (provider/sale)
  const onlyFilterValues = {
    all: 'all', // Unified view — fetches both orders and sales
    applications: 'order',
    received: 'sale',
    // Legacy tab names (for backward compatibility with old bookmarks)
    orders: 'order',
    sales: 'sale',
  };

  const onlyFilter = onlyFilterValues[tab];
  if (!onlyFilter) {
    return Promise.reject(new Error(`Invalid tab for InboxPage: ${tab}`));
  }

  const { page = 1, sort } = parse(search);
  const processNames = getSupportedProcessesInfo().map(p => p.name);

  const commonParams = {
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
    'fields.listing': ['title', 'availabilityPlan', 'publicData.listingType'],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    ...getValidInboxSort(sort),
  };

  // "All" tab: fire two parallel API calls and merge results client-side
  if (onlyFilter === 'all') {
    return Promise.all([
      sdk.transactions.query({ ...commonParams, only: 'order', page, perPage: INBOX_PAGE_SIZE }),
      sdk.transactions.query({ ...commonParams, only: 'sale', page, perPage: INBOX_PAGE_SIZE }),
    ])
      .then(([ordersResponse, salesResponse]) => {
        // Dispatch marketplace entities for both responses
        dispatch(addMarketplaceEntities(ordersResponse));
        dispatch(addMarketplaceEntities(salesResponse));

        // Merge and sort by lastTransitionedAt (newest first)
        const allTransactions = [
          ...ordersResponse.data.data,
          ...salesResponse.data.data,
        ].sort((a, b) => {
          const dateA = new Date(a.attributes.lastTransitionedAt);
          const dateB = new Date(b.attributes.lastTransitionedAt);
          return dateB - dateA;
        });

        // Build combined pagination meta
        const ordersMeta = ordersResponse.data.meta;
        const salesMeta = salesResponse.data.meta;
        const combinedMeta = {
          totalItems: (ordersMeta.totalItems || 0) + (salesMeta.totalItems || 0),
          totalPages: Math.max(ordersMeta.totalPages || 1, salesMeta.totalPages || 1),
          page: page,
          perPage: INBOX_PAGE_SIZE,
        };

        // Return in the same shape as a single-tab response
        return {
          data: {
            data: allTransactions,
            meta: combinedMeta,
          },
        };
      })
      .catch(e => {
        return rejectWithValue(storableError(e));
      });
  }

  // Single-tab fetch (applications or received)
  const apiQueryParams = {
    only: onlyFilter,
    ...commonParams,
    page,
    perPage: INBOX_PAGE_SIZE,
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

// Backward compatible wrapper for the thunk
export const loadData = (params, search) => (dispatch, getState, sdk) => {
  const isMessagesTab = params.tab === 'messages';
  return dispatch(loadDataThunk({ params, search, isMessagesTab }));
};
