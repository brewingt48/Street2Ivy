import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  fetchAdminUsers as fetchAdminUsersApi,
  fetchAdminUser as fetchAdminUserApi,
  blockUser as blockUserApi,
  unblockUser as unblockUserApi,
  deleteUserAdmin as deleteUserAdminApi,
  createAdminUser as createAdminUserApi,
  sendAdminMessage as sendAdminMessageApi,
  fetchAdminMessages as fetchAdminMessagesApi,
  fetchAdminReports as fetchAdminReportsApi,
  fetchPendingApprovals as fetchPendingApprovalsApi,
  approveUserProfile as approveUserProfileApi,
  rejectUserProfile as rejectUserProfileApi,
  fetchPendingDeposits as fetchPendingDepositsApi,
  confirmDeposit as confirmDepositApi,
  revokeDeposit as revokeDepositApi,
  fetchLandingContent as fetchLandingContentApi,
  updateContentSection as updateContentSectionApi,
  addContentItem as addContentItemApi,
  updateContentItem as updateContentItemApi,
  deleteContentItem as deleteContentItemApi,
  resetLandingContent as resetLandingContentApi,
  fetchUserStats as fetchUserStatsApi,
} from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

// Users thunks
export const fetchUsersThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchAdminUsersApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchUsers = params => dispatch => dispatch(fetchUsersThunk(params)).unwrap();

export const fetchUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await fetchAdminUserApi(userId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const blockUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/blockUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await blockUserApi(userId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const blockUserAction = userId => dispatch => dispatch(blockUserThunk(userId)).unwrap();

export const unblockUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/unblockUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await unblockUserApi(userId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const unblockUserAction = userId => dispatch => dispatch(unblockUserThunk(userId)).unwrap();

export const deleteUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await deleteUserAdminApi(userId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteUserAction = userId => dispatch => dispatch(deleteUserThunk(userId)).unwrap();

// Create admin user thunk
export const createAdminUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/createAdminUser',
  async (data, { rejectWithValue }) => {
    try {
      return await createAdminUserApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const createAdminUserAction = data => dispatch =>
  dispatch(createAdminUserThunk(data)).unwrap();

// Messages thunks
export const fetchMessagesThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchMessages',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchAdminMessagesApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchMessages = params => dispatch => dispatch(fetchMessagesThunk(params)).unwrap();

export const sendMessageThunk = createAsyncThunk(
  'app/AdminDashboardPage/sendMessage',
  async (body, { rejectWithValue }) => {
    try {
      return await sendAdminMessageApi(body);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const sendMessage = body => dispatch => dispatch(sendMessageThunk(body)).unwrap();

// Reports thunks
export const fetchReportsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchReports',
  async (type, { rejectWithValue }) => {
    try {
      return await fetchAdminReportsApi(type);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchReports = type => dispatch => dispatch(fetchReportsThunk(type)).unwrap();

// Profile approval thunks
export const fetchPendingApprovalsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchPendingApprovals',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchPendingApprovalsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchPendingApprovals = params => dispatch =>
  dispatch(fetchPendingApprovalsThunk(params)).unwrap();

export const approveUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/approveUser',
  async (userId, { rejectWithValue }) => {
    try {
      return await approveUserProfileApi(userId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const approveUserAction = userId => dispatch => dispatch(approveUserThunk(userId)).unwrap();

export const rejectUserThunk = createAsyncThunk(
  'app/AdminDashboardPage/rejectUser',
  async ({ userId, reason }, { rejectWithValue }) => {
    try {
      return await rejectUserProfileApi(userId, reason);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const rejectUserAction = (userId, reason) => dispatch =>
  dispatch(rejectUserThunk({ userId, reason })).unwrap();

// Deposit management thunks
export const fetchDepositsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchDeposits',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchPendingDepositsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchDeposits = params => dispatch => dispatch(fetchDepositsThunk(params)).unwrap();

export const confirmDepositThunk = createAsyncThunk(
  'app/AdminDashboardPage/confirmDeposit',
  async ({ transactionId, amount, paymentMethod, notes }, { rejectWithValue }) => {
    try {
      return await confirmDepositApi(transactionId, { amount, paymentMethod, notes });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const confirmDepositAction = (transactionId, { amount, paymentMethod, notes }) => dispatch =>
  dispatch(confirmDepositThunk({ transactionId, amount, paymentMethod, notes })).unwrap();

export const revokeDepositThunk = createAsyncThunk(
  'app/AdminDashboardPage/revokeDeposit',
  async ({ transactionId, reason }, { rejectWithValue }) => {
    try {
      return await revokeDepositApi(transactionId, reason);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const revokeDepositAction = (transactionId, reason) => dispatch =>
  dispatch(revokeDepositThunk({ transactionId, reason })).unwrap();

// Content management thunks
export const fetchContentThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchContent',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchLandingContentApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchContent = () => dispatch => dispatch(fetchContentThunk()).unwrap();

export const updateContentThunk = createAsyncThunk(
  'app/AdminDashboardPage/updateContent',
  async ({ section, data }, { rejectWithValue }) => {
    try {
      return await updateContentSectionApi(section, data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateContentAction = (section, data) => dispatch =>
  dispatch(updateContentThunk({ section, data })).unwrap();

export const addContentItemThunk = createAsyncThunk(
  'app/AdminDashboardPage/addContentItem',
  async ({ section, item }, { rejectWithValue }) => {
    try {
      return await addContentItemApi(section, item);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const addContentItemAction = (section, item) => dispatch =>
  dispatch(addContentItemThunk({ section, item })).unwrap();

export const updateContentItemThunk = createAsyncThunk(
  'app/AdminDashboardPage/updateContentItem',
  async ({ section, itemId, data }, { rejectWithValue }) => {
    try {
      return await updateContentItemApi(section, itemId, data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateContentItemAction = (section, itemId, data) => dispatch =>
  dispatch(updateContentItemThunk({ section, itemId, data })).unwrap();

export const deleteContentItemThunk = createAsyncThunk(
  'app/AdminDashboardPage/deleteContentItem',
  async ({ section, itemId }, { rejectWithValue }) => {
    try {
      return await deleteContentItemApi(section, itemId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteContentItemAction = (section, itemId) => dispatch =>
  dispatch(deleteContentItemThunk({ section, itemId })).unwrap();

export const resetContentThunk = createAsyncThunk(
  'app/AdminDashboardPage/resetContent',
  async (_, { rejectWithValue }) => {
    try {
      return await resetLandingContentApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const resetContentAction = () => dispatch => dispatch(resetContentThunk()).unwrap();

// User stats thunk
export const fetchUserStatsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchUserStats',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetchUserStatsApi(userId);
      return { userId, ...response };
    } catch (e) {
      return rejectWithValue({ userId, error: storableError(e) });
    }
  }
);

export const fetchUserStatsAction = userId => dispatch =>
  dispatch(fetchUserStatsThunk(userId)).unwrap();

// ================ Slice ================ //

const adminDashboardPageSlice = createSlice({
  name: 'AdminDashboardPage',
  initialState: {
    // Users
    users: [],
    usersPagination: null,
    fetchUsersInProgress: false,
    fetchUsersError: null,
    selectedUser: null,
    blockInProgress: null,
    deleteInProgress: null,
    // Map of userId -> { stats, isLoading, error }
    userStats: {},

    // Create Admin
    createAdminInProgress: false,
    createAdminError: null,
    createAdminSuccess: false,

    // Pending Approvals
    pendingApprovals: [],
    fetchPendingInProgress: false,
    fetchPendingError: null,
    approveInProgress: null,
    rejectInProgress: null,

    // Deposits
    deposits: [],
    depositsPagination: null,
    fetchDepositsInProgress: false,
    fetchDepositsError: null,
    confirmDepositInProgress: null,
    revokeDepositInProgress: null,

    // Messages
    messages: [],
    messagesPagination: null,
    fetchMessagesInProgress: false,
    fetchMessagesError: null,
    sendMessageInProgress: false,
    sendMessageError: null,
    sendMessageSuccess: false,

    // Reports
    reports: null,
    currentReportType: null,
    fetchReportsInProgress: false,
    fetchReportsError: null,

    // Content Management (CMS)
    content: null,
    fetchContentInProgress: false,
    fetchContentError: null,
    updateContentInProgress: false,
    updateContentError: null,
    updateContentSuccess: false,
  },
  reducers: {
    clearSelectedUser: state => {
      state.selectedUser = null;
    },
    clearMessageState: state => {
      state.sendMessageInProgress = false;
      state.sendMessageError = null;
      state.sendMessageSuccess = false;
    },
    clearCreateAdminState: state => {
      state.createAdminInProgress = false;
      state.createAdminError = null;
      state.createAdminSuccess = false;
    },
    clearContentState: state => {
      state.updateContentInProgress = false;
      state.updateContentError = null;
      state.updateContentSuccess = false;
    },
    clearUserStats: state => {
      state.userStats = {};
    },
  },
  extraReducers: builder => {
    builder
      // Fetch users
      .addCase(fetchUsersThunk.pending, state => {
        state.fetchUsersInProgress = true;
        state.fetchUsersError = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.fetchUsersInProgress = false;
        state.users = action.payload.users || [];
        state.usersPagination = action.payload.pagination;
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.fetchUsersInProgress = false;
        state.fetchUsersError = action.payload;
      })
      // Fetch single user
      .addCase(fetchUserThunk.fulfilled, (state, action) => {
        state.selectedUser = action.payload.user;
      })
      // Block user
      .addCase(blockUserThunk.pending, (state, action) => {
        state.blockInProgress = action.meta.arg;
      })
      .addCase(blockUserThunk.fulfilled, (state, action) => {
        state.blockInProgress = null;
        // Update user in list
        const userId = action.payload.user?.id;
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].attributes.banned = true;
        }
      })
      .addCase(blockUserThunk.rejected, state => {
        state.blockInProgress = null;
      })
      // Unblock user
      .addCase(unblockUserThunk.pending, (state, action) => {
        state.blockInProgress = action.meta.arg;
      })
      .addCase(unblockUserThunk.fulfilled, (state, action) => {
        state.blockInProgress = null;
        const userId = action.payload.user?.id;
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].attributes.banned = false;
        }
      })
      .addCase(unblockUserThunk.rejected, state => {
        state.blockInProgress = null;
      })
      // Delete user
      .addCase(deleteUserThunk.pending, (state, action) => {
        state.deleteInProgress = action.meta.arg;
      })
      .addCase(deleteUserThunk.fulfilled, (state, action) => {
        state.deleteInProgress = null;
        const userId = action.payload.user?.id;
        state.users = state.users.filter(u => u.id !== userId);
      })
      .addCase(deleteUserThunk.rejected, state => {
        state.deleteInProgress = null;
      })
      // Create admin user
      .addCase(createAdminUserThunk.pending, state => {
        state.createAdminInProgress = true;
        state.createAdminError = null;
        state.createAdminSuccess = false;
      })
      .addCase(createAdminUserThunk.fulfilled, state => {
        state.createAdminInProgress = false;
        state.createAdminSuccess = true;
      })
      .addCase(createAdminUserThunk.rejected, (state, action) => {
        state.createAdminInProgress = false;
        state.createAdminError = action.payload;
      })
      // Fetch messages
      .addCase(fetchMessagesThunk.pending, state => {
        state.fetchMessagesInProgress = true;
        state.fetchMessagesError = null;
      })
      .addCase(fetchMessagesThunk.fulfilled, (state, action) => {
        state.fetchMessagesInProgress = false;
        state.messages = action.payload.messages || [];
        state.messagesPagination = action.payload.pagination;
      })
      .addCase(fetchMessagesThunk.rejected, (state, action) => {
        state.fetchMessagesInProgress = false;
        state.fetchMessagesError = action.payload;
      })
      // Send message
      .addCase(sendMessageThunk.pending, state => {
        state.sendMessageInProgress = true;
        state.sendMessageError = null;
        state.sendMessageSuccess = false;
      })
      .addCase(sendMessageThunk.fulfilled, state => {
        state.sendMessageInProgress = false;
        state.sendMessageSuccess = true;
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendMessageInProgress = false;
        state.sendMessageError = action.payload;
      })
      // Fetch reports
      .addCase(fetchReportsThunk.pending, state => {
        state.fetchReportsInProgress = true;
        state.fetchReportsError = null;
      })
      .addCase(fetchReportsThunk.fulfilled, (state, action) => {
        state.fetchReportsInProgress = false;
        state.reports = action.payload;
        state.currentReportType = action.payload.type;
      })
      .addCase(fetchReportsThunk.rejected, (state, action) => {
        state.fetchReportsInProgress = false;
        state.fetchReportsError = action.payload;
      })
      // Fetch pending approvals
      .addCase(fetchPendingApprovalsThunk.pending, state => {
        state.fetchPendingInProgress = true;
        state.fetchPendingError = null;
      })
      .addCase(fetchPendingApprovalsThunk.fulfilled, (state, action) => {
        state.fetchPendingInProgress = false;
        state.pendingApprovals = action.payload.users || [];
      })
      .addCase(fetchPendingApprovalsThunk.rejected, (state, action) => {
        state.fetchPendingInProgress = false;
        state.fetchPendingError = action.payload;
      })
      // Approve user
      .addCase(approveUserThunk.pending, (state, action) => {
        state.approveInProgress = action.meta.arg;
      })
      .addCase(approveUserThunk.fulfilled, (state, action) => {
        state.approveInProgress = null;
        const userId = action.payload.user?.id;
        state.pendingApprovals = state.pendingApprovals.filter(u => u.id !== userId);
      })
      .addCase(approveUserThunk.rejected, state => {
        state.approveInProgress = null;
      })
      // Reject user
      .addCase(rejectUserThunk.pending, (state, action) => {
        state.rejectInProgress = action.meta.arg.userId;
      })
      .addCase(rejectUserThunk.fulfilled, (state, action) => {
        state.rejectInProgress = null;
        const userId = action.payload.user?.id;
        state.pendingApprovals = state.pendingApprovals.filter(u => u.id !== userId);
      })
      .addCase(rejectUserThunk.rejected, state => {
        state.rejectInProgress = null;
      })
      // Fetch deposits
      .addCase(fetchDepositsThunk.pending, state => {
        state.fetchDepositsInProgress = true;
        state.fetchDepositsError = null;
      })
      .addCase(fetchDepositsThunk.fulfilled, (state, action) => {
        state.fetchDepositsInProgress = false;
        state.deposits = action.payload.deposits || [];
        state.depositsPagination = action.payload.pagination;
      })
      .addCase(fetchDepositsThunk.rejected, (state, action) => {
        state.fetchDepositsInProgress = false;
        state.fetchDepositsError = action.payload;
      })
      // Confirm deposit
      .addCase(confirmDepositThunk.pending, (state, action) => {
        state.confirmDepositInProgress = action.meta.arg.transactionId;
      })
      .addCase(confirmDepositThunk.fulfilled, (state, action) => {
        state.confirmDepositInProgress = null;
        // Remove confirmed deposit from pending list
        const transactionId = action.payload.transactionId;
        state.deposits = state.deposits.filter(d => d.id !== transactionId);
      })
      .addCase(confirmDepositThunk.rejected, state => {
        state.confirmDepositInProgress = null;
      })
      // Revoke deposit
      .addCase(revokeDepositThunk.pending, (state, action) => {
        state.revokeDepositInProgress = action.meta.arg.transactionId;
      })
      .addCase(revokeDepositThunk.fulfilled, state => {
        state.revokeDepositInProgress = null;
      })
      .addCase(revokeDepositThunk.rejected, state => {
        state.revokeDepositInProgress = null;
      })
      // Fetch content
      .addCase(fetchContentThunk.pending, state => {
        state.fetchContentInProgress = true;
        state.fetchContentError = null;
      })
      .addCase(fetchContentThunk.fulfilled, (state, action) => {
        state.fetchContentInProgress = false;
        state.content = action.payload.data;
      })
      .addCase(fetchContentThunk.rejected, (state, action) => {
        state.fetchContentInProgress = false;
        state.fetchContentError = action.payload;
      })
      // Update content section
      .addCase(updateContentThunk.pending, state => {
        state.updateContentInProgress = true;
        state.updateContentError = null;
        state.updateContentSuccess = false;
      })
      .addCase(updateContentThunk.fulfilled, (state, action) => {
        state.updateContentInProgress = false;
        state.updateContentSuccess = true;
        // Update the section in local state
        const section = action.payload.data?.section;
        if (section && state.content) {
          state.content[section] = action.payload.data;
        }
      })
      .addCase(updateContentThunk.rejected, (state, action) => {
        state.updateContentInProgress = false;
        state.updateContentError = action.payload;
      })
      // Add content item
      .addCase(addContentItemThunk.fulfilled, state => {
        state.updateContentSuccess = true;
      })
      // Update content item
      .addCase(updateContentItemThunk.fulfilled, state => {
        state.updateContentSuccess = true;
      })
      // Delete content item
      .addCase(deleteContentItemThunk.fulfilled, state => {
        state.updateContentSuccess = true;
      })
      // Reset content
      .addCase(resetContentThunk.fulfilled, (state, action) => {
        state.content = action.payload.data;
        state.updateContentSuccess = true;
      })
      // User stats
      .addCase(fetchUserStatsThunk.pending, (state, action) => {
        const userId = action.meta.arg;
        state.userStats[userId] = {
          stats: null,
          isLoading: true,
          error: null,
        };
      })
      .addCase(fetchUserStatsThunk.fulfilled, (state, action) => {
        const { userId, stats } = action.payload;
        state.userStats[userId] = {
          stats: stats || {},
          isLoading: false,
          error: null,
        };
      })
      .addCase(fetchUserStatsThunk.rejected, (state, action) => {
        const userId = action.meta.arg;
        state.userStats[userId] = {
          stats: null,
          isLoading: false,
          error: action.payload?.error || 'Failed to load stats',
        };
      });
  },
});

export const {
  clearSelectedUser,
  clearMessageState,
  clearCreateAdminState,
  clearContentState,
  clearUserStats,
} = adminDashboardPageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  const { tab } = params;

  const promises = [dispatch(fetchCurrentUser())];

  // Load data based on active tab
  if (tab === 'messages') {
    promises.push(dispatch(fetchMessagesThunk({})));
  } else if (tab === 'reports') {
    promises.push(dispatch(fetchReportsThunk('overview')));
  } else if (tab === 'approvals') {
    promises.push(dispatch(fetchPendingApprovalsThunk({})));
  } else if (tab === 'deposits') {
    promises.push(dispatch(fetchDepositsThunk({})));
  } else if (tab === 'content') {
    promises.push(dispatch(fetchContentThunk()));
  } else {
    // Default: users tab
    promises.push(dispatch(fetchUsersThunk({})));
  }

  return Promise.all(promises);
};

export default adminDashboardPageSlice.reducer;
