import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  fetchEducationDashboard as fetchEducationDashboardApi,
  fetchStudentTransactions as fetchStudentTransactionsApi,
  sendEducationalAdminMessage as sendMessageApi,
  fetchEducationalAdminMessages as fetchMessagesApi,
  fetchEducationPartners as fetchPartnersApi,
  approveEducationPartner as approvePartnerApi,
  rejectEducationPartner as rejectPartnerApi,
  removeEducationPartner as removePartnerApi,
} from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

const fetchDashboardPayloadCreator = async (params, { rejectWithValue }) => {
  try {
    const response = await fetchEducationDashboardApi(params);
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

// Fetch partners thunk
const fetchPartnersPayloadCreator = async (_, { rejectWithValue }) => {
  try {
    const response = await fetchPartnersApi();
    return response;
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchPartnersThunk = createAsyncThunk(
  'app/EducationDashboardPage/fetchPartners',
  fetchPartnersPayloadCreator
);

export const fetchPartners = () => dispatch => {
  return dispatch(fetchPartnersThunk()).unwrap();
};

// Partner action thunk (approve, reject, remove)
const partnerActionPayloadCreator = async ({ action, userId, reason }, { rejectWithValue }) => {
  try {
    let response;
    if (action === 'approve') {
      response = await approvePartnerApi(userId);
    } else if (action === 'reject') {
      response = await rejectPartnerApi(userId, reason);
    } else if (action === 'remove') {
      response = await removePartnerApi(userId);
    }
    return { action, userId, response };
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const partnerActionThunk = createAsyncThunk(
  'app/EducationDashboardPage/partnerAction',
  partnerActionPayloadCreator
);

export const partnerAction = (action, userId, reason) => dispatch => {
  return dispatch(partnerActionThunk({ action, userId, reason })).unwrap();
};

// ================ Slice ================ //

const educationDashboardPageSlice = createSlice({
  name: 'EducationDashboardPage',
  initialState: {
    // Dashboard data
    stats: null,
    students: [],
    institutionName: null,
    institutionDomain: null,
    subscriptionStatus: null, // { depositPaid, depositPaidDate, aiCoachingApproved, aiCoachingApprovedDate }
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

    // Partners
    partners: [],
    partnersInProgress: false,
    partnersError: null,
    partnerActionInProgress: false,
    partnerActionError: null,
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
      // Fetch partners
      .addCase(fetchPartnersThunk.pending, state => {
        state.partnersInProgress = true;
        state.partnersError = null;
      })
      .addCase(fetchPartnersThunk.fulfilled, (state, action) => {
        state.partnersInProgress = false;
        state.partners = action.payload.partners || [];
      })
      .addCase(fetchPartnersThunk.rejected, (state, action) => {
        state.partnersInProgress = false;
        state.partnersError = action.payload;
      })
      // Partner action (approve/reject/remove)
      .addCase(partnerActionThunk.pending, state => {
        state.partnerActionInProgress = true;
        state.partnerActionError = null;
      })
      .addCase(partnerActionThunk.fulfilled, (state, action) => {
        state.partnerActionInProgress = false;
        const { action: act, userId } = action.payload;
        // Update partner in list
        state.partners = state.partners.map(p => {
          if (p.id !== userId) return p;
          if (act === 'approve') return { ...p, approvalStatus: 'approved', isAssociated: true };
          if (act === 'reject') return { ...p, approvalStatus: 'rejected', isAssociated: false };
          if (act === 'remove') return { ...p, approvalStatus: 'pending', isAssociated: false };
          return p;
        });
      })
      .addCase(partnerActionThunk.rejected, (state, action) => {
        state.partnerActionInProgress = false;
        state.partnerActionError = action.payload;
      });
  },
});

export const { clearStudentTransactions, clearMessageState } =
  educationDashboardPageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  const urlParams = new URLSearchParams(search);
  const searchParams = {};
  for (const [key, value] of urlParams.entries()) {
    searchParams[key] = value;
  }

  return Promise.all([dispatch(fetchCurrentUser()), dispatch(fetchDashboardThunk(searchParams))]);
};

export default educationDashboardPageSlice.reducer;
