import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  fetchEducationDashboard as fetchEducationDashboardApi,
  fetchStudentTransactions as fetchStudentTransactionsApi,
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

// ================ Slice ================ //

const educationDashboardPageSlice = createSlice({
  name: 'EducationDashboardPage',
  initialState: {
    // Dashboard data
    stats: null,
    students: [],
    institutionName: null,
    institutionDomain: null,
    pagination: null,
    fetchInProgress: false,
    fetchError: null,

    // Student transactions modal
    selectedStudent: null,
    studentTransactions: [],
    studentTransactionsPagination: null,
    studentTransactionsInProgress: false,
    studentTransactionsError: null,
  },
  reducers: {
    clearStudentTransactions: state => {
      state.selectedStudent = null;
      state.studentTransactions = [];
      state.studentTransactionsPagination = null;
      state.studentTransactionsError = null;
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
      });
  },
});

export const { clearStudentTransactions } = educationDashboardPageSlice.actions;

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
