import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { withRetry } from '../../util/apiRetry';
import {
  fetchEducationDashboard as fetchEducationDashboardApi,
  fetchStudentTransactions as fetchStudentTransactionsApi,
  sendEducationalAdminMessage as sendMessageApi,
  fetchEducationalAdminMessages as fetchMessagesApi,
  fetchEducationTenant as fetchEducationTenantApi,
  updateEducationTenantBranding as updateBrandingApi,
  updateEducationTenantSettings as updateSettingsApi,
  activateEducationTenant as activateTenantApi,
  submitTenantRequest as submitTenantRequestApi,
  inviteAlumni as inviteAlumniApi,
  fetchAlumniList as fetchAlumniListApi,
  deleteAlumni as deleteAlumniApi,
  resendAlumniInvitation as resendAlumniInvitationApi,
  uploadTenantLogo as uploadTenantLogoApi,
  fetchEducationStudents as fetchStudentsApi,
  fetchEducationStudentStats as fetchStudentStatsApi,
  fetchEducationReportsOverview as fetchReportsOverviewApi,
} from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

const fetchDashboardPayloadCreator = async (params, { rejectWithValue }) => {
  try {
    const response = await withRetry(() => fetchEducationDashboardApi(params), { maxRetries: 2 });
    return response;
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchDashboardThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchDashboard',
  fetchDashboardPayloadCreator
);

export const fetchDashboard = params => dispatch => {
  return dispatch(fetchDashboardThunk(params)).unwrap();
};

const fetchStudentTransactionsPayloadCreator = async (
  { studentId, params },
  { rejectWithValue }
) => {
  try {
    const response = await fetchStudentTransactionsApi(studentId, params);
    return response;
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchStudentTransactionsThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchStudentTransactions',
  fetchStudentTransactionsPayloadCreator
);

export const fetchStudentTransactions = (studentId, params) => dispatch => {
  return dispatch(fetchStudentTransactionsThunk({ studentId, params })).unwrap();
};

// Send message thunk
const sendMessagePayloadCreator = async (data, { rejectWithValue }) => {
  try {
    const response = await sendMessageApi(data);
    return response;
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const sendMessageThunk = createAsyncThunk(
  'app/EducationDashboardPage/sendMessage',
  sendMessagePayloadCreator
);

export const sendEducationalAdminMessage = data => dispatch => {
  return dispatch(sendMessageThunk(data)).unwrap();
};

// Fetch messages thunk
const fetchMessagesPayloadCreator = async (_, { rejectWithValue }) => {
  try {
    const response = await fetchMessagesApi();
    return response;
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchMessagesThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchMessages',
  fetchMessagesPayloadCreator
);

export const fetchEducationalAdminMessages = () => dispatch => {
  return dispatch(fetchMessagesThunk()).unwrap();
};

// Tenant thunks
export const fetchTenantThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchTenant',
  async (_, { rejectWithValue }) => {
    try {
      return await withRetry(() => fetchEducationTenantApi(), { maxRetries: 2 });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchTenant = () => dispatch => dispatch(fetchTenantThunk()).unwrap();

export const saveTenantBrandingThunk = createAsyncThunk(
  'app/EducationDashboardPage/saveTenantBranding',
  async (data, { rejectWithValue }) => {
    try {
      return await updateBrandingApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const saveTenantBranding = data => dispatch =>
  dispatch(saveTenantBrandingThunk(data)).unwrap();

export const saveTenantSettingsThunk = createAsyncThunk(
  'app/EducationDashboardPage/saveTenantSettings',
  async (data, { rejectWithValue }) => {
    try {
      return await updateSettingsApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const saveTenantSettings = data => dispatch =>
  dispatch(saveTenantSettingsThunk(data)).unwrap();

export const activateTenantThunk = createAsyncThunk(
  'app/EducationDashboardPage/activateTenant',
  async (_, { rejectWithValue }) => {
    try {
      return await activateTenantApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const activateTenantAction = () => dispatch =>
  dispatch(activateTenantThunk()).unwrap();

export const submitTenantRequestThunk = createAsyncThunk(
  'app/EducationDashboardPage/submitTenantRequest',
  async (data, { rejectWithValue }) => {
    try {
      return await submitTenantRequestApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const submitTenantRequestAction = data => dispatch =>
  dispatch(submitTenantRequestThunk(data)).unwrap();

// Alumni thunks
export const inviteAlumniThunk = createAsyncThunk(
  'app/EducationDashboardPage/inviteAlumni',
  async (data, { rejectWithValue }) => {
    try {
      return await inviteAlumniApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const inviteAlumniAction = data => dispatch =>
  dispatch(inviteAlumniThunk(data)).unwrap();

export const fetchAlumniThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchAlumni',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchAlumniListApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchAlumni = params => dispatch =>
  dispatch(fetchAlumniThunk(params)).unwrap();

// Delete alumni thunk
export const deleteAlumniThunk = createAsyncThunk(
  'app/EducationDashboardPage/deleteAlumni',
  async (alumniId, { rejectWithValue }) => {
    try {
      return await deleteAlumniApi(alumniId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const deleteAlumniAction = alumniId => dispatch =>
  dispatch(deleteAlumniThunk(alumniId)).unwrap();

// Resend alumni invitation thunk
export const resendAlumniInvitationThunk = createAsyncThunk(
  'app/EducationDashboardPage/resendAlumniInvitation',
  async (alumniId, { rejectWithValue }) => {
    try {
      return await resendAlumniInvitationApi(alumniId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const resendAlumniInvitationAction = alumniId => dispatch =>
  dispatch(resendAlumniInvitationThunk(alumniId)).unwrap();

// Upload tenant logo thunk
export const uploadTenantLogoThunk = createAsyncThunk(
  'app/EducationDashboardPage/uploadTenantLogo',
  async ({ logoData, mimeType }, { rejectWithValue }) => {
    try {
      return await uploadTenantLogoApi(logoData, mimeType);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const uploadTenantLogoAction = (logoData, mimeType) => dispatch =>
  dispatch(uploadTenantLogoThunk({ logoData, mimeType })).unwrap();

// Fetch students (dedicated endpoint) thunk
export const fetchStudentsThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchStudents',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchStudentsApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchStudentsAction = params => dispatch =>
  dispatch(fetchStudentsThunk(params)).unwrap();

// Fetch student stats thunk
export const fetchStudentStatsThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchStudentStats',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchStudentStatsApi();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchStudentStatsAction = () => dispatch =>
  dispatch(fetchStudentStatsThunk()).unwrap();

// Fetch reports overview thunk
export const fetchReportsOverviewThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchReportsOverview',
  async (params, { rejectWithValue }) => {
    try {
      return await fetchReportsOverviewApi(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchReportsOverviewAction = params => dispatch =>
  dispatch(fetchReportsOverviewThunk(params)).unwrap();

// ================ Slice ================ //

const educationDashboardPageSlice = createSlice({
  name: 'EducationDashboardPage',
  initialState: {
    // Dashboard data
    stats: null,
    students: [],
    institutionName: null,
    institutionDomain: null,
    subscriptionStatus: null, // { aiCoachingApproved, aiCoachingApprovedDate }
    pagination: null,
    fetchInProgress: false,
    fetchError: null,

    // Student transactions modal
    selectedStudent: null,
    studentTransactions: [],
    studentTransactionsPagination: null,
    studentTransactionsInProgress: false,
    studentTransactionsError: null,

    // Messages
    sentMessages: [],
    receivedMessages: [],
    messagesInProgress: false,
    messagesError: null,
    sendInProgress: false,
    sendSuccess: false,
    sendError: null,

    // Tenant
    tenant: undefined, // undefined = not yet fetched, null = no tenant exists
    tenantFetchInProgress: false,
    tenantFetchError: null,
    tenantSaveInProgress: false,
    tenantSaveSuccess: false,
    tenantSaveError: null,

    // Tenant request
    tenantRequestSubmitted: false,
    tenantRequestInProgress: false,
    tenantRequestError: null,

    // Alumni
    alumni: [],
    alumniPagination: null,
    alumniFetchInProgress: false,
    alumniFetchError: null,
    alumniInviteInProgress: false,
    alumniInviteSuccess: false,
    alumniInviteError: null,
    alumniDeleteInProgress: false,
    alumniDeleteError: null,
    alumniResendInProgress: false,
    alumniResendError: null,

    // Students (detailed endpoint)
    studentsDetail: [],
    studentsPagination: null,
    studentsFetchInProgress: false,
    studentsFetchError: null,
    studentStats: null,
    studentStatsFetchInProgress: false,
    studentStatsFetchError: null,

    // Reports
    reportsOverview: null,
    reportsFetchInProgress: false,
    reportsFetchError: null,

    // Logo upload
    logoUploadInProgress: false,
    logoUploadError: null,
  },
  reducers: {
    clearStudentTransactions: state => {
      state.selectedStudent = null;
      state.studentTransactions = [];
      state.studentTransactionsPagination = null;
      state.studentTransactionsError = null;
    },
    clearMessageState: state => {
      state.sendSuccess = false;
      state.sendError = null;
    },
    clearTenantSaveState: state => {
      state.tenantSaveSuccess = false;
      state.tenantSaveError = null;
    },
    clearTenantRequestState: state => {
      state.tenantRequestSubmitted = false;
      state.tenantRequestError = null;
    },
    clearAlumniInviteState: state => {
      state.alumniInviteSuccess = false;
      state.alumniInviteError = null;
    },
    clearAlumniDeleteState: state => {
      state.alumniDeleteError = null;
    },
    clearAlumniResendState: state => {
      state.alumniResendError = null;
    },
    clearLogoUploadState: state => {
      state.logoUploadError = null;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch dashboard
      .addCase(fetchDashboardThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchDashboardThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.stats = action.payload.stats;
        state.students = action.payload.students || [];
        state.institutionName = action.payload.institutionName;
        state.institutionDomain = action.payload.institutionDomain;
        state.subscriptionStatus = action.payload.subscriptionStatus || null;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDashboardThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
      })
      // Fetch student transactions
      .addCase(fetchStudentTransactionsThunk.pending, state => {
        state.studentTransactionsInProgress = true;
        state.studentTransactionsError = null;
      })
      .addCase(fetchStudentTransactionsThunk.fulfilled, (state, action) => {
        state.studentTransactionsInProgress = false;
        state.selectedStudent = action.payload.student;
        state.studentTransactions = action.payload.transactions || [];
        state.studentTransactionsPagination = action.payload.pagination;
      })
      .addCase(fetchStudentTransactionsThunk.rejected, (state, action) => {
        state.studentTransactionsInProgress = false;
        state.studentTransactionsError = action.payload;
      })
      // Send message
      .addCase(sendMessageThunk.pending, state => {
        state.sendInProgress = true;
        state.sendSuccess = false;
        state.sendError = null;
      })
      .addCase(sendMessageThunk.fulfilled, state => {
        state.sendInProgress = false;
        state.sendSuccess = true;
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendInProgress = false;
        state.sendError = action.payload;
      })
      // Fetch messages
      .addCase(fetchMessagesThunk.pending, state => {
        state.messagesInProgress = true;
        state.messagesError = null;
      })
      .addCase(fetchMessagesThunk.fulfilled, (state, action) => {
        state.messagesInProgress = false;
        state.sentMessages = action.payload.sentMessages || [];
        state.receivedMessages = action.payload.receivedMessages || [];
      })
      .addCase(fetchMessagesThunk.rejected, (state, action) => {
        state.messagesInProgress = false;
        state.messagesError = action.payload;
      })
      // Fetch tenant
      .addCase(fetchTenantThunk.pending, state => {
        state.tenantFetchInProgress = true;
        state.tenantFetchError = null;
      })
      .addCase(fetchTenantThunk.fulfilled, (state, action) => {
        state.tenantFetchInProgress = false;
        state.tenant = action.payload.data || null;
      })
      .addCase(fetchTenantThunk.rejected, (state, action) => {
        state.tenantFetchInProgress = false;
        state.tenantFetchError = action.payload;
        state.tenant = null;
      })
      // Save tenant branding
      .addCase(saveTenantBrandingThunk.pending, state => {
        state.tenantSaveInProgress = true;
        state.tenantSaveSuccess = false;
        state.tenantSaveError = null;
      })
      .addCase(saveTenantBrandingThunk.fulfilled, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenantSaveSuccess = true;
        state.tenant = action.payload.data || state.tenant;
      })
      .addCase(saveTenantBrandingThunk.rejected, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenantSaveError = action.payload;
      })
      // Save tenant settings
      .addCase(saveTenantSettingsThunk.pending, state => {
        state.tenantSaveInProgress = true;
        state.tenantSaveSuccess = false;
        state.tenantSaveError = null;
      })
      .addCase(saveTenantSettingsThunk.fulfilled, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenantSaveSuccess = true;
        state.tenant = action.payload.data || state.tenant;
      })
      .addCase(saveTenantSettingsThunk.rejected, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenantSaveError = action.payload;
      })
      // Activate tenant
      .addCase(activateTenantThunk.pending, state => {
        state.tenantSaveInProgress = true;
        state.tenantSaveError = null;
      })
      .addCase(activateTenantThunk.fulfilled, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenant = action.payload.data || state.tenant;
      })
      .addCase(activateTenantThunk.rejected, (state, action) => {
        state.tenantSaveInProgress = false;
        state.tenantSaveError = action.payload;
      })
      // Submit tenant request
      .addCase(submitTenantRequestThunk.pending, state => {
        state.tenantRequestInProgress = true;
        state.tenantRequestError = null;
        state.tenantRequestSubmitted = false;
      })
      .addCase(submitTenantRequestThunk.fulfilled, state => {
        state.tenantRequestInProgress = false;
        state.tenantRequestSubmitted = true;
      })
      .addCase(submitTenantRequestThunk.rejected, (state, action) => {
        state.tenantRequestInProgress = false;
        state.tenantRequestError = action.payload;
      })
      // Invite alumni
      .addCase(inviteAlumniThunk.pending, state => {
        state.alumniInviteInProgress = true;
        state.alumniInviteSuccess = false;
        state.alumniInviteError = null;
      })
      .addCase(inviteAlumniThunk.fulfilled, (state, action) => {
        state.alumniInviteInProgress = false;
        state.alumniInviteSuccess = true;
        // Add new alumni to the beginning of the list
        if (action.payload.data) {
          state.alumni = [action.payload.data, ...state.alumni];
        }
      })
      .addCase(inviteAlumniThunk.rejected, (state, action) => {
        state.alumniInviteInProgress = false;
        state.alumniInviteError = action.payload;
      })
      // Fetch alumni
      .addCase(fetchAlumniThunk.pending, state => {
        state.alumniFetchInProgress = true;
        state.alumniFetchError = null;
      })
      .addCase(fetchAlumniThunk.fulfilled, (state, action) => {
        state.alumniFetchInProgress = false;
        state.alumni = action.payload.data || [];
        state.alumniPagination = action.payload.pagination || null;
      })
      .addCase(fetchAlumniThunk.rejected, (state, action) => {
        state.alumniFetchInProgress = false;
        state.alumniFetchError = action.payload;
      })
      // Delete alumni
      .addCase(deleteAlumniThunk.pending, state => {
        state.alumniDeleteInProgress = true;
        state.alumniDeleteError = null;
      })
      .addCase(deleteAlumniThunk.fulfilled, (state, action) => {
        state.alumniDeleteInProgress = false;
        // Remove deleted alumni from list
        const deletedId = action.meta.arg;
        state.alumni = state.alumni.filter(a => a.id !== deletedId);
      })
      .addCase(deleteAlumniThunk.rejected, (state, action) => {
        state.alumniDeleteInProgress = false;
        state.alumniDeleteError = action.payload;
      })
      // Resend alumni invitation
      .addCase(resendAlumniInvitationThunk.pending, state => {
        state.alumniResendInProgress = true;
        state.alumniResendError = null;
      })
      .addCase(resendAlumniInvitationThunk.fulfilled, (state, action) => {
        state.alumniResendInProgress = false;
        // Update the alumni record in list with refreshed data
        if (action.payload.data) {
          const updated = action.payload.data;
          state.alumni = state.alumni.map(a => (a.id === updated.id ? updated : a));
        }
      })
      .addCase(resendAlumniInvitationThunk.rejected, (state, action) => {
        state.alumniResendInProgress = false;
        state.alumniResendError = action.payload;
      })
      // Upload tenant logo
      .addCase(uploadTenantLogoThunk.pending, state => {
        state.logoUploadInProgress = true;
        state.logoUploadError = null;
      })
      .addCase(uploadTenantLogoThunk.fulfilled, (state, action) => {
        state.logoUploadInProgress = false;
        // Update tenant branding with new logo URL
        if (state.tenant && action.payload.logoUrl) {
          state.tenant = {
            ...state.tenant,
            branding: { ...(state.tenant.branding || {}), logoUrl: action.payload.logoUrl },
          };
        }
      })
      .addCase(uploadTenantLogoThunk.rejected, (state, action) => {
        state.logoUploadInProgress = false;
        state.logoUploadError = action.payload;
      })
      // Fetch students (detailed)
      .addCase(fetchStudentsThunk.pending, state => {
        state.studentsFetchInProgress = true;
        state.studentsFetchError = null;
      })
      .addCase(fetchStudentsThunk.fulfilled, (state, action) => {
        state.studentsFetchInProgress = false;
        state.studentsDetail = action.payload.data || [];
        state.studentsPagination = action.payload.pagination || null;
      })
      .addCase(fetchStudentsThunk.rejected, (state, action) => {
        state.studentsFetchInProgress = false;
        state.studentsFetchError = action.payload;
      })
      // Fetch student stats
      .addCase(fetchStudentStatsThunk.pending, state => {
        state.studentStatsFetchInProgress = true;
        state.studentStatsFetchError = null;
      })
      .addCase(fetchStudentStatsThunk.fulfilled, (state, action) => {
        state.studentStatsFetchInProgress = false;
        state.studentStats = action.payload;
      })
      .addCase(fetchStudentStatsThunk.rejected, (state, action) => {
        state.studentStatsFetchInProgress = false;
        state.studentStatsFetchError = action.payload;
      })
      // Fetch reports overview
      .addCase(fetchReportsOverviewThunk.pending, state => {
        state.reportsFetchInProgress = true;
        state.reportsFetchError = null;
      })
      .addCase(fetchReportsOverviewThunk.fulfilled, (state, action) => {
        state.reportsFetchInProgress = false;
        state.reportsOverview = action.payload;
      })
      .addCase(fetchReportsOverviewThunk.rejected, (state, action) => {
        state.reportsFetchInProgress = false;
        state.reportsFetchError = action.payload;
      });
  },
});

export const {
  clearStudentTransactions,
  clearMessageState,
  clearTenantSaveState,
  clearTenantRequestState,
  clearAlumniInviteState,
  clearAlumniDeleteState,
  clearAlumniResendState,
  clearLogoUploadState,
} = educationDashboardPageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  const { tab } = params || {};
  const urlParams = new URLSearchParams(search);
  const searchParams = {};
  for (const [key, value] of urlParams.entries()) {
    searchParams[key] = value;
  }

  const promises = [
    dispatch(fetchCurrentUser()),
    dispatch(fetchDashboardThunk(searchParams)),
    dispatch(fetchTenantThunk()),
  ];

  // Load tab-specific data
  if (tab === 'alumni') {
    promises.push(dispatch(fetchAlumniThunk(searchParams)));
  } else if (tab === 'students') {
    promises.push(dispatch(fetchStudentsThunk(searchParams)));
    promises.push(dispatch(fetchStudentStatsThunk()));
  } else if (tab === 'reports') {
    promises.push(dispatch(fetchReportsOverviewThunk(searchParams)));
  }

  return Promise.all(promises);
};

export default educationDashboardPageSlice.reducer;
