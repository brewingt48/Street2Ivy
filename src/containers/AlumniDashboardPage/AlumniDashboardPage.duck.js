import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { withRetry } from '../../util/apiRetry';
import { fetchAlumniDashboardData as fetchAlumniDashboardApi } from '../../util/api';
import { fetchCurrentUser } from '../../ducks/user.duck';

// ================ Thunks ================ //

export const fetchAlumniDashboardThunk = createAsyncThunk(
  'app/AlumniDashboardPage/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      return await withRetry(() => fetchAlumniDashboardApi(), { maxRetries: 2 });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchAlumniDashboard = () => dispatch =>
  dispatch(fetchAlumniDashboardThunk()).unwrap();

// ================ Slice ================ //

const alumniDashboardPageSlice = createSlice({
  name: 'AlumniDashboardPage',
  initialState: {
    // Dashboard data
    stats: null,
    recentActivity: [],
    institutionDomain: null,
    profile: null,
    fetchInProgress: false,
    fetchError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchAlumniDashboardThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchAlumniDashboardThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.stats = action.payload.stats || null;
        state.recentActivity = action.payload.recentActivity || [];
        state.institutionDomain = action.payload.institutionDomain || null;
        state.profile = action.payload.profile || null;
      })
      .addCase(fetchAlumniDashboardThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
      });
  },
});

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  return Promise.all([
    dispatch(fetchCurrentUser()),
    dispatch(fetchAlumniDashboardThunk()),
  ]);
};

export default alumniDashboardPageSlice.reducer;