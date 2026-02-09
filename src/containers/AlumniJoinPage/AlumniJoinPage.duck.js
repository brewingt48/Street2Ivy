import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  verifyAlumniInvitation as verifyInvitationApi,
  acceptAlumniInvitation as acceptInvitationApi,
} from '../../util/api';

// ================ Thunks ================ //

export const verifyInvitationThunk = createAsyncThunk(
  'app/AlumniJoinPage/verifyInvitation',
  async (invitationCode, { rejectWithValue }) => {
    try {
      return await verifyInvitationApi(invitationCode);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const acceptInvitationThunk = createAsyncThunk(
  'app/AlumniJoinPage/acceptInvitation',
  async (data, { rejectWithValue }) => {
    try {
      return await acceptInvitationApi(data);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const verifyInvitation = invitationCode => dispatch =>
  dispatch(verifyInvitationThunk(invitationCode)).unwrap();

export const acceptInvitation = data => dispatch =>
  dispatch(acceptInvitationThunk(data)).unwrap();

// ================ Slice ================ //

const alumniJoinPageSlice = createSlice({
  name: 'AlumniJoinPage',
  initialState: {
    invitation: null,
    verifyInProgress: false,
    verifyError: null,
    acceptInProgress: false,
    acceptSuccess: false,
    acceptError: null,
  },
  reducers: {
    clearAcceptState: state => {
      state.acceptSuccess = false;
      state.acceptError = null;
    },
  },
  extraReducers: builder => {
    builder
      // Verify invitation
      .addCase(verifyInvitationThunk.pending, state => {
        state.verifyInProgress = true;
        state.verifyError = null;
      })
      .addCase(verifyInvitationThunk.fulfilled, (state, action) => {
        state.verifyInProgress = false;
        state.invitation = action.payload.valid ? action.payload.alumni : null;
      })
      .addCase(verifyInvitationThunk.rejected, (state, action) => {
        state.verifyInProgress = false;
        state.verifyError = action.payload;
        state.invitation = null;
      })
      // Accept invitation
      .addCase(acceptInvitationThunk.pending, state => {
        state.acceptInProgress = true;
        state.acceptError = null;
      })
      .addCase(acceptInvitationThunk.fulfilled, state => {
        state.acceptInProgress = false;
        state.acceptSuccess = true;
      })
      .addCase(acceptInvitationThunk.rejected, (state, action) => {
        state.acceptInProgress = false;
        state.acceptError = action.payload;
      });
  },
});

export const { clearAcceptState } = alumniJoinPageSlice.actions;

// ================ loadData ================ //

export const loadData = params => dispatch => {
  const { invitationCode } = params;
  if (invitationCode) {
    return dispatch(verifyInvitationThunk(invitationCode));
  }
  return Promise.resolve();
};

export default alumniJoinPageSlice.reducer;
