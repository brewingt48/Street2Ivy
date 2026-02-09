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
  fetchLandingContent as fetchLandingContentApi,
  updateContentSection as updateContentSectionApi,
  addContentItem as addContentItemApi,
  updateContentItem as updateContentItemApi,
  deleteContentItem as deleteContentItemApi,
  resetLandingContent as resetLandingContentApi,
  fetchUserStats as fetchUserStatsApi,
  fetchEducationalAdminApplications as fetchApplicationsApi,
  fetchEducationalAdminApplicationStats as fetchApplicationStatsApi,
  approveEducationalAdminApplication as approveApplicationApi,
  rejectEducationalAdminApplication as rejectApplicationApi,
  fetchEducationalAdmins as fetchEducationalAdminsApi,
  updateEducationalAdminSubscription as updateSubscriptionApi,
  // Tenant management
  fetchAdminTenants as fetchAdminTenantsApi,
  createAdminTenant as createAdminTenantApi,
  updateAdminTenant as updateAdminTenantApi,
  deleteAdminTenant as deleteAdminTenantApi,
  fetchAdminTenantRequests as fetchAdminTenantRequestsApi,
  approveAdminTenantRequest as approveAdminTenantRequestApi,
  rejectAdminTenantRequest as rejectAdminTenantRequestApi,
  // Blog management
  fetchBlogPosts as fetchBlogPostsApi,
  fetchBlogPost as fetchBlogPostApi,
  createBlogPost as createBlogPostApi,
  updateBlogPost as updateBlogPostApi,
  deleteBlogPost as deleteBlogPostApi,
  fetchBlogCategories as fetchBlogCategoriesApi,
  addBlogCategory as addBlogCategoryApi,
  deleteBlogCategory as deleteBlogCategoryApi,
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
      // Corporate spending is handled client-side, just return the type
      if (type === 'corporate-spending') {
        return { type: 'corporate-spending', data: null };
      }
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

// Educational Admin Applications thunks
export const fetchApplicationsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchApplications',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchApplicationsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchApplications = params => dispatch =>
  dispatch(fetchApplicationsThunk(params)).unwrap();

export const fetchApplicationStatsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchApplicationStats',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchApplicationStatsApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchApplicationStats = () => dispatch =>
  dispatch(fetchApplicationStatsThunk()).unwrap();

export const approveApplicationThunk = createAsyncThunk(
  'app/AdminDashboardPage/approveApplication',
  async (applicationId, { rejectWithValue }) => {
    try {
      return await approveApplicationApi(applicationId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const approveApplicationAction = applicationId => dispatch =>
  dispatch(approveApplicationThunk(applicationId)).unwrap();

export const rejectApplicationThunk = createAsyncThunk(
  'app/AdminDashboardPage/rejectApplication',
  async ({ applicationId, reason }, { rejectWithValue }) => {
    try {
      return await rejectApplicationApi(applicationId, reason);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const rejectApplicationAction = (applicationId, reason) => dispatch =>
  dispatch(rejectApplicationThunk({ applicationId, reason })).unwrap();

// Educational Admins management thunks
export const fetchEducationalAdminsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchEducationalAdmins',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchEducationalAdminsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchEducationalAdmins = params => dispatch =>
  dispatch(fetchEducationalAdminsThunk(params)).unwrap();

export const updateSubscriptionThunk = createAsyncThunk(
  'app/AdminDashboardPage/updateSubscription',
  async ({ userId, data }, { rejectWithValue }) => {
    try {
      return await updateSubscriptionApi(userId, data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateSubscriptionAction = (userId, data) => dispatch =>
  dispatch(updateSubscriptionThunk({ userId, data })).unwrap();

// ================ Blog Thunks ================ //

export const fetchBlogPostsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchBlogPosts',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchBlogPostsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchBlogPosts = params => dispatch => dispatch(fetchBlogPostsThunk(params)).unwrap();

export const fetchBlogPostThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchBlogPost',
  async (postId, { rejectWithValue }) => {
    try {
      return await fetchBlogPostApi(postId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchBlogPost = postId => dispatch => dispatch(fetchBlogPostThunk(postId)).unwrap();

export const createBlogPostThunk = createAsyncThunk(
  'app/AdminDashboardPage/createBlogPost',
  async (postData, { rejectWithValue }) => {
    try {
      return await createBlogPostApi(postData);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const createBlogPostAction = postData => dispatch =>
  dispatch(createBlogPostThunk(postData)).unwrap();

export const updateBlogPostThunk = createAsyncThunk(
  'app/AdminDashboardPage/updateBlogPost',
  async ({ postId, postData }, { rejectWithValue }) => {
    try {
      return await updateBlogPostApi(postId, postData);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateBlogPostAction = (postId, postData) => dispatch =>
  dispatch(updateBlogPostThunk({ postId, postData })).unwrap();

export const deleteBlogPostThunk = createAsyncThunk(
  'app/AdminDashboardPage/deleteBlogPost',
  async (postId, { rejectWithValue }) => {
    try {
      return await deleteBlogPostApi(postId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteBlogPostAction = postId => dispatch =>
  dispatch(deleteBlogPostThunk(postId)).unwrap();

export const fetchBlogCategoriesThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchBlogCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchBlogCategoriesApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const addBlogCategoryThunk = createAsyncThunk(
  'app/AdminDashboardPage/addBlogCategory',
  async (category, { rejectWithValue }) => {
    try {
      return await addBlogCategoryApi(category);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteBlogCategoryThunk = createAsyncThunk(
  'app/AdminDashboardPage/deleteBlogCategory',
  async (category, { rejectWithValue }) => {
    try {
      return await deleteBlogCategoryApi(category);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// ================ Tenant Management Thunks ================ //

export const fetchAdminTenantsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchAdminTenants',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchAdminTenantsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchAdminTenants = params => dispatch =>
  dispatch(fetchAdminTenantsThunk(params)).unwrap();

export const createAdminTenantThunk = createAsyncThunk(
  'app/AdminDashboardPage/createAdminTenant',
  async (data, { rejectWithValue }) => {
    try {
      return await createAdminTenantApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const createAdminTenantAction = data => dispatch =>
  dispatch(createAdminTenantThunk(data)).unwrap();

export const updateAdminTenantThunk = createAsyncThunk(
  'app/AdminDashboardPage/updateAdminTenant',
  async ({ tenantId, data }, { rejectWithValue }) => {
    try {
      return await updateAdminTenantApi(tenantId, data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateAdminTenantAction = (tenantId, data) => dispatch =>
  dispatch(updateAdminTenantThunk({ tenantId, data })).unwrap();

export const deleteAdminTenantThunk = createAsyncThunk(
  'app/AdminDashboardPage/deleteAdminTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      return await deleteAdminTenantApi(tenantId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteAdminTenantAction = tenantId => dispatch =>
  dispatch(deleteAdminTenantThunk(tenantId)).unwrap();

export const fetchTenantRequestsThunk = createAsyncThunk(
  'app/AdminDashboardPage/fetchTenantRequests',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAdminTenantRequestsApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchTenantRequests = () => dispatch =>
  dispatch(fetchTenantRequestsThunk()).unwrap();

export const approveTenantRequestThunk = createAsyncThunk(
  'app/AdminDashboardPage/approveTenantRequest',
  async (requestId, { rejectWithValue }) => {
    try {
      return await approveAdminTenantRequestApi(requestId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const approveTenantRequestAction = requestId => dispatch =>
  dispatch(approveTenantRequestThunk(requestId)).unwrap();

export const rejectTenantRequestThunk = createAsyncThunk(
  'app/AdminDashboardPage/rejectTenantRequest',
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      return await rejectAdminTenantRequestApi(requestId, reason);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const rejectTenantRequestAction = (requestId, reason) => dispatch =>
  dispatch(rejectTenantRequestThunk({ requestId, reason })).unwrap();

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

    // Educational Admin Applications
    eduApplications: [],
    eduApplicationsPagination: null,
    eduApplicationsStats: null,
    fetchApplicationsInProgress: false,
    fetchApplicationsError: null,
    approveApplicationInProgress: null,
    rejectApplicationInProgress: null,

    // Educational Admins (institutions)
    educationalAdmins: [],
    educationalAdminsPagination: null,
    fetchEducationalAdminsInProgress: false,
    fetchEducationalAdminsError: null,
    updateSubscriptionInProgress: null,
    updateSubscriptionSuccess: false,

    // Tenant Management
    adminTenants: [],
    adminTenantsPagination: null,
    fetchTenantsInProgress: false,
    fetchTenantsError: null,
    saveTenantInProgress: false,
    saveTenantError: null,
    saveTenantSuccess: false,
    deleteTenantInProgress: null,
    tenantRequests: [],
    fetchTenantRequestsInProgress: false,
    approveTenantRequestInProgress: null,
    rejectTenantRequestInProgress: null,

    // Blog Management
    blogPosts: [],
    blogPostsPagination: null,
    blogCategories: [],
    selectedBlogPost: null,
    fetchBlogPostsInProgress: false,
    fetchBlogPostsError: null,
    saveBlogPostInProgress: false,
    saveBlogPostError: null,
    saveBlogPostSuccess: false,
    deleteBlogPostInProgress: null,
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
    clearSubscriptionState: state => {
      state.updateSubscriptionInProgress = null;
      state.updateSubscriptionSuccess = false;
    },
    clearTenantState: state => {
      state.saveTenantInProgress = false;
      state.saveTenantError = null;
      state.saveTenantSuccess = false;
    },
    clearBlogPostState: state => {
      state.saveBlogPostInProgress = false;
      state.saveBlogPostError = null;
      state.saveBlogPostSuccess = false;
    },
    setSelectedBlogPost: (state, action) => {
      state.selectedBlogPost = action.payload;
    },
    clearSelectedBlogPost: state => {
      state.selectedBlogPost = null;
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
      })
      // Fetch educational admin applications
      .addCase(fetchApplicationsThunk.pending, state => {
        state.fetchApplicationsInProgress = true;
        state.fetchApplicationsError = null;
      })
      .addCase(fetchApplicationsThunk.fulfilled, (state, action) => {
        state.fetchApplicationsInProgress = false;
        state.eduApplications = action.payload.applications || [];
        state.eduApplicationsPagination = action.payload.pagination;
      })
      .addCase(fetchApplicationsThunk.rejected, (state, action) => {
        state.fetchApplicationsInProgress = false;
        state.fetchApplicationsError = action.payload;
      })
      // Fetch application stats
      .addCase(fetchApplicationStatsThunk.fulfilled, (state, action) => {
        state.eduApplicationsStats = action.payload.stats;
      })
      // Approve application
      .addCase(approveApplicationThunk.pending, (state, action) => {
        state.approveApplicationInProgress = action.meta.arg;
      })
      .addCase(approveApplicationThunk.fulfilled, (state, action) => {
        state.approveApplicationInProgress = null;
        // Remove approved application from list or update status
        const appId = action.payload.application?.id;
        state.eduApplications = state.eduApplications.filter(app => app.id !== appId);
      })
      .addCase(approveApplicationThunk.rejected, state => {
        state.approveApplicationInProgress = null;
      })
      // Reject application
      .addCase(rejectApplicationThunk.pending, (state, action) => {
        state.rejectApplicationInProgress = action.meta.arg.applicationId;
      })
      .addCase(rejectApplicationThunk.fulfilled, (state, action) => {
        state.rejectApplicationInProgress = null;
        const appId = action.payload.application?.id;
        state.eduApplications = state.eduApplications.filter(app => app.id !== appId);
      })
      .addCase(rejectApplicationThunk.rejected, state => {
        state.rejectApplicationInProgress = null;
      })
      // Fetch educational admins
      .addCase(fetchEducationalAdminsThunk.pending, state => {
        state.fetchEducationalAdminsInProgress = true;
        state.fetchEducationalAdminsError = null;
      })
      .addCase(fetchEducationalAdminsThunk.fulfilled, (state, action) => {
        state.fetchEducationalAdminsInProgress = false;
        state.educationalAdmins = action.payload.admins || [];
        state.educationalAdminsPagination = action.payload.pagination;
      })
      .addCase(fetchEducationalAdminsThunk.rejected, (state, action) => {
        state.fetchEducationalAdminsInProgress = false;
        state.fetchEducationalAdminsError = action.payload;
      })
      // Update subscription
      .addCase(updateSubscriptionThunk.pending, (state, action) => {
        state.updateSubscriptionInProgress = action.meta.arg.userId;
        state.updateSubscriptionSuccess = false;
      })
      .addCase(updateSubscriptionThunk.fulfilled, (state, action) => {
        state.updateSubscriptionInProgress = null;
        state.updateSubscriptionSuccess = true;
        // Update the admin in the list
        const updatedUser = action.payload.user;
        const index = state.educationalAdmins.findIndex(a => a.id === updatedUser.id);
        if (index !== -1) {
          const currentAdmin = state.educationalAdmins[index];
          state.educationalAdmins[index] = {
            ...currentAdmin,
            attributes: {
              ...currentAdmin.attributes,
              profile: {
                ...currentAdmin.attributes.profile,
                publicData: {
                  ...currentAdmin.attributes.profile.publicData,
                  aiCoachingApproved: updatedUser.aiCoachingApproved,
                  aiCoachingApprovedDate: updatedUser.aiCoachingApprovedDate,
                },
              },
            },
          };
        }
      })
      .addCase(updateSubscriptionThunk.rejected, state => {
        state.updateSubscriptionInProgress = null;
        state.updateSubscriptionSuccess = false;
      })
      // Blog posts
      .addCase(fetchBlogPostsThunk.pending, state => {
        state.fetchBlogPostsInProgress = true;
        state.fetchBlogPostsError = null;
      })
      .addCase(fetchBlogPostsThunk.fulfilled, (state, action) => {
        state.fetchBlogPostsInProgress = false;
        state.blogPosts = action.payload.posts || [];
        state.blogPostsPagination = action.payload.pagination;
        state.blogCategories = action.payload.categories || state.blogCategories;
      })
      .addCase(fetchBlogPostsThunk.rejected, (state, action) => {
        state.fetchBlogPostsInProgress = false;
        state.fetchBlogPostsError = action.payload;
      })
      // Fetch single blog post
      .addCase(fetchBlogPostThunk.fulfilled, (state, action) => {
        state.selectedBlogPost = action.payload.post;
      })
      // Create blog post
      .addCase(createBlogPostThunk.pending, state => {
        state.saveBlogPostInProgress = true;
        state.saveBlogPostError = null;
        state.saveBlogPostSuccess = false;
      })
      .addCase(createBlogPostThunk.fulfilled, (state, action) => {
        state.saveBlogPostInProgress = false;
        state.saveBlogPostSuccess = true;
        state.blogPosts.unshift(action.payload.post);
      })
      .addCase(createBlogPostThunk.rejected, (state, action) => {
        state.saveBlogPostInProgress = false;
        state.saveBlogPostError = action.payload;
      })
      // Update blog post
      .addCase(updateBlogPostThunk.pending, state => {
        state.saveBlogPostInProgress = true;
        state.saveBlogPostError = null;
        state.saveBlogPostSuccess = false;
      })
      .addCase(updateBlogPostThunk.fulfilled, (state, action) => {
        state.saveBlogPostInProgress = false;
        state.saveBlogPostSuccess = true;
        const updatedPost = action.payload.post;
        const index = state.blogPosts.findIndex(p => p.id === updatedPost.id);
        if (index !== -1) {
          state.blogPosts[index] = updatedPost;
        }
        state.selectedBlogPost = updatedPost;
      })
      .addCase(updateBlogPostThunk.rejected, (state, action) => {
        state.saveBlogPostInProgress = false;
        state.saveBlogPostError = action.payload;
      })
      // Delete blog post
      .addCase(deleteBlogPostThunk.pending, (state, action) => {
        state.deleteBlogPostInProgress = action.meta.arg;
      })
      .addCase(deleteBlogPostThunk.fulfilled, (state, action) => {
        state.deleteBlogPostInProgress = null;
        state.blogPosts = state.blogPosts.filter(p => p.id !== action.meta.arg);
      })
      .addCase(deleteBlogPostThunk.rejected, state => {
        state.deleteBlogPostInProgress = null;
      })
      // Fetch blog categories
      .addCase(fetchBlogCategoriesThunk.fulfilled, (state, action) => {
        state.blogCategories = action.payload.categories || [];
      })
      // Add blog category
      .addCase(addBlogCategoryThunk.fulfilled, (state, action) => {
        state.blogCategories = action.payload.categories || [];
      })
      // Delete blog category
      .addCase(deleteBlogCategoryThunk.fulfilled, (state, action) => {
        state.blogCategories = action.payload.categories || [];
      })
      // Fetch admin tenants
      .addCase(fetchAdminTenantsThunk.pending, state => {
        state.fetchTenantsInProgress = true;
        state.fetchTenantsError = null;
      })
      .addCase(fetchAdminTenantsThunk.fulfilled, (state, action) => {
        state.fetchTenantsInProgress = false;
        state.adminTenants = action.payload.data || [];
      })
      .addCase(fetchAdminTenantsThunk.rejected, (state, action) => {
        state.fetchTenantsInProgress = false;
        state.fetchTenantsError = action.payload;
      })
      // Create admin tenant
      .addCase(createAdminTenantThunk.pending, state => {
        state.saveTenantInProgress = true;
        state.saveTenantError = null;
        state.saveTenantSuccess = false;
      })
      .addCase(createAdminTenantThunk.fulfilled, (state, action) => {
        state.saveTenantInProgress = false;
        state.saveTenantSuccess = true;
        if (action.payload.data) {
          state.adminTenants.push(action.payload.data);
        }
      })
      .addCase(createAdminTenantThunk.rejected, (state, action) => {
        state.saveTenantInProgress = false;
        state.saveTenantError = action.payload;
      })
      // Update admin tenant
      .addCase(updateAdminTenantThunk.pending, state => {
        state.saveTenantInProgress = true;
        state.saveTenantError = null;
        state.saveTenantSuccess = false;
      })
      .addCase(updateAdminTenantThunk.fulfilled, (state, action) => {
        state.saveTenantInProgress = false;
        state.saveTenantSuccess = true;
        const updated = action.payload.data;
        if (updated) {
          const index = state.adminTenants.findIndex(t => t.id === updated.id);
          if (index !== -1) {
            state.adminTenants[index] = updated;
          }
        }
      })
      .addCase(updateAdminTenantThunk.rejected, (state, action) => {
        state.saveTenantInProgress = false;
        state.saveTenantError = action.payload;
      })
      // Delete admin tenant
      .addCase(deleteAdminTenantThunk.pending, (state, action) => {
        state.deleteTenantInProgress = action.meta.arg;
      })
      .addCase(deleteAdminTenantThunk.fulfilled, (state, action) => {
        state.deleteTenantInProgress = null;
        const deletedId = action.meta.arg;
        state.adminTenants = state.adminTenants.filter(t => t.id !== deletedId);
      })
      .addCase(deleteAdminTenantThunk.rejected, state => {
        state.deleteTenantInProgress = null;
      })
      // Fetch tenant requests
      .addCase(fetchTenantRequestsThunk.pending, state => {
        state.fetchTenantRequestsInProgress = true;
      })
      .addCase(fetchTenantRequestsThunk.fulfilled, (state, action) => {
        state.fetchTenantRequestsInProgress = false;
        state.tenantRequests = action.payload.data || [];
      })
      .addCase(fetchTenantRequestsThunk.rejected, state => {
        state.fetchTenantRequestsInProgress = false;
      })
      // Approve tenant request
      .addCase(approveTenantRequestThunk.pending, (state, action) => {
        state.approveTenantRequestInProgress = action.meta.arg;
      })
      .addCase(approveTenantRequestThunk.fulfilled, (state, action) => {
        state.approveTenantRequestInProgress = null;
        const approvedId = action.meta.arg;
        state.tenantRequests = state.tenantRequests.filter(r => r.id !== approvedId);
        // Add the new tenant to the list if returned
        if (action.payload.data?.tenant) {
          state.adminTenants.push(action.payload.data.tenant);
        }
      })
      .addCase(approveTenantRequestThunk.rejected, state => {
        state.approveTenantRequestInProgress = null;
      })
      // Reject tenant request
      .addCase(rejectTenantRequestThunk.pending, (state, action) => {
        state.rejectTenantRequestInProgress = action.meta.arg.requestId;
      })
      .addCase(rejectTenantRequestThunk.fulfilled, (state, action) => {
        state.rejectTenantRequestInProgress = null;
        const rejectedId = action.meta.arg.requestId;
        state.tenantRequests = state.tenantRequests.filter(r => r.id !== rejectedId);
      })
      .addCase(rejectTenantRequestThunk.rejected, state => {
        state.rejectTenantRequestInProgress = null;
      });
  },
});

export const {
  clearSelectedUser,
  clearMessageState,
  clearCreateAdminState,
  clearContentState,
  clearUserStats,
  clearSubscriptionState,
  clearTenantState,
  clearBlogPostState,
  setSelectedBlogPost,
  clearSelectedBlogPost,
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
    // Load both corporate partner deposits and regular deposits
    promises.push(dispatch(fetchCorporateDepositsThunk({})));
    promises.push(dispatch(fetchDepositsThunk({})));
  } else if (tab === 'content') {
    promises.push(dispatch(fetchContentThunk()));
  } else if (tab === 'institutions') {
    // Load both pending applications and current educational admins
    promises.push(dispatch(fetchApplicationsThunk({ status: 'pending' })));
    promises.push(dispatch(fetchApplicationStatsThunk()));
    promises.push(dispatch(fetchEducationalAdminsThunk({})));
  } else if (tab === 'blog') {
    promises.push(dispatch(fetchBlogPostsThunk({})));
  } else if (tab === 'tenants') {
    promises.push(dispatch(fetchAdminTenantsThunk({})));
    promises.push(dispatch(fetchTenantRequestsThunk()));
  } else {
    // Default: users tab
    promises.push(dispatch(fetchUsersThunk({})));
  }

  return Promise.all(promises);
};

export default adminDashboardPageSlice.reducer;
