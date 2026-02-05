import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  fetchProjectWorkspace as fetchProjectWorkspaceApi,
  sendProjectMessage as sendProjectMessageApi,
  acceptProjectNda as acceptProjectNdaApi,
  markProjectMessagesRead as markProjectMessagesReadApi,
  getNdaSignatureStatus as getNdaSignatureStatusApi,
  signNda as signNdaApi,
  requestNdaSignature as requestNdaSignatureApi,
} from '../../util/api';

// ================ Thunks ================ //

export const fetchWorkspaceThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/fetchWorkspace',
  async (transactionId, { rejectWithValue }) => {
    try {
      return await fetchProjectWorkspaceApi(transactionId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchWorkspace = transactionId => dispatch =>
  dispatch(fetchWorkspaceThunk(transactionId)).unwrap();

export const sendMessageThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/sendMessage',
  async ({ transactionId, content, attachments }, { rejectWithValue }) => {
    try {
      return await sendProjectMessageApi(transactionId, { content, attachments });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const sendMessage = (transactionId, content, attachments) => dispatch =>
  dispatch(sendMessageThunk({ transactionId, content, attachments })).unwrap();

export const acceptNdaThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/acceptNda',
  async (transactionId, { rejectWithValue }) => {
    try {
      return await acceptProjectNdaApi(transactionId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const acceptNda = transactionId => dispatch =>
  dispatch(acceptNdaThunk(transactionId)).unwrap();

export const markMessagesReadThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/markMessagesRead',
  async ({ transactionId, messageIds }, { rejectWithValue }) => {
    try {
      return await markProjectMessagesReadApi(transactionId, messageIds);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const markMessagesRead = (transactionId, messageIds) => dispatch =>
  dispatch(markMessagesReadThunk({ transactionId, messageIds })).unwrap();

// NDA E-Signature Thunks
export const fetchNdaStatusThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/fetchNdaStatus',
  async (transactionId, { rejectWithValue }) => {
    try {
      return await getNdaSignatureStatusApi(transactionId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchNdaStatus = transactionId => dispatch =>
  dispatch(fetchNdaStatusThunk(transactionId)).unwrap();

export const signNdaThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/signNda',
  async ({ transactionId, signatureData }, { rejectWithValue }) => {
    try {
      return await signNdaApi(transactionId, { signatureData, agreedToTerms: true });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const signNdaDocument = (transactionId, signatureData) => dispatch =>
  dispatch(signNdaThunk({ transactionId, signatureData })).unwrap();

export const requestNdaSignaturesThunk = createAsyncThunk(
  'app/ProjectWorkspacePage/requestNdaSignatures',
  async (transactionId, { rejectWithValue }) => {
    try {
      return await requestNdaSignatureApi(transactionId);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const requestNdaSignatures = transactionId => dispatch =>
  dispatch(requestNdaSignaturesThunk(transactionId)).unwrap();

// ================ Slice ================ //

const projectWorkspacePageSlice = createSlice({
  name: 'ProjectWorkspacePage',
  initialState: {
    // Workspace data
    workspace: null,
    accessGranted: false,
    accessDeniedReason: null,

    // Loading states
    fetchInProgress: false,
    fetchError: null,

    // Message sending
    sendMessageInProgress: false,
    sendMessageError: null,

    // NDA acceptance
    acceptNdaInProgress: false,
    acceptNdaError: null,

    // NDA E-Signature
    ndaSignatureStatus: null,
    fetchNdaStatusInProgress: false,
    signNdaInProgress: false,
    signNdaError: null,
    requestNdaInProgress: false,
    requestNdaError: null,
  },
  reducers: {
    clearWorkspace: state => {
      state.workspace = null;
      state.accessGranted = false;
      state.accessDeniedReason = null;
      state.fetchError = null;
    },
    addLocalMessage: (state, action) => {
      if (state.workspace && state.workspace.messages) {
        state.workspace.messages.push(action.payload);
      }
    },
  },
  extraReducers: builder => {
    builder
      // Fetch workspace
      .addCase(fetchWorkspaceThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchWorkspaceThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.workspace = action.payload;
        state.accessGranted = action.payload.accessGranted;
        state.accessDeniedReason = action.payload.accessDeniedReason || null;
      })
      .addCase(fetchWorkspaceThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
        // Check if it's an access denied response
        if (action.payload?.status === 403) {
          state.accessGranted = false;
          state.accessDeniedReason = action.payload?.accessDeniedReason || 'unauthorized';
        }
      })
      // Send message
      .addCase(sendMessageThunk.pending, state => {
        state.sendMessageInProgress = true;
        state.sendMessageError = null;
      })
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        state.sendMessageInProgress = false;
        // Add the new message to the workspace
        if (state.workspace && action.payload.message) {
          state.workspace.messages = [
            ...(state.workspace.messages || []),
            action.payload.message,
          ];
        }
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendMessageInProgress = false;
        state.sendMessageError = action.payload;
      })
      // Accept NDA
      .addCase(acceptNdaThunk.pending, state => {
        state.acceptNdaInProgress = true;
        state.acceptNdaError = null;
      })
      .addCase(acceptNdaThunk.fulfilled, (state, action) => {
        state.acceptNdaInProgress = false;
        if (state.workspace) {
          state.workspace.ndaAccepted = true;
        }
      })
      .addCase(acceptNdaThunk.rejected, (state, action) => {
        state.acceptNdaInProgress = false;
        state.acceptNdaError = action.payload;
      })
      // Mark messages read
      .addCase(markMessagesReadThunk.fulfilled, (state, action) => {
        // Update read status locally
        const { messageIds } = action.meta.arg;
        if (state.workspace?.messages) {
          state.workspace.messages = state.workspace.messages.map(msg => {
            if (messageIds.includes(msg.id) && !msg.readAt) {
              return { ...msg, readAt: new Date().toISOString() };
            }
            return msg;
          });
        }
      })
      // Fetch NDA status
      .addCase(fetchNdaStatusThunk.pending, state => {
        state.fetchNdaStatusInProgress = true;
      })
      .addCase(fetchNdaStatusThunk.fulfilled, (state, action) => {
        state.fetchNdaStatusInProgress = false;
        state.ndaSignatureStatus = action.payload;
      })
      .addCase(fetchNdaStatusThunk.rejected, (state, action) => {
        state.fetchNdaStatusInProgress = false;
      })
      // Sign NDA
      .addCase(signNdaThunk.pending, state => {
        state.signNdaInProgress = true;
        state.signNdaError = null;
      })
      .addCase(signNdaThunk.fulfilled, (state, action) => {
        state.signNdaInProgress = false;
        // Update signature status with response
        if (action.payload.signatureRequest) {
          state.ndaSignatureStatus = {
            ...state.ndaSignatureStatus,
            hasSignatureRequest: true,
            signatureRequest: action.payload.signatureRequest,
          };
        }
      })
      .addCase(signNdaThunk.rejected, (state, action) => {
        state.signNdaInProgress = false;
        state.signNdaError = action.payload;
      })
      // Request NDA signatures
      .addCase(requestNdaSignaturesThunk.pending, state => {
        state.requestNdaInProgress = true;
        state.requestNdaError = null;
      })
      .addCase(requestNdaSignaturesThunk.fulfilled, (state, action) => {
        state.requestNdaInProgress = false;
        if (action.payload.signatureRequest) {
          state.ndaSignatureStatus = {
            hasSignatureRequest: true,
            signatureRequest: action.payload.signatureRequest,
          };
        }
      })
      .addCase(requestNdaSignaturesThunk.rejected, (state, action) => {
        state.requestNdaInProgress = false;
        state.requestNdaError = action.payload;
      });
  },
});

export const { clearWorkspace, addLocalMessage } = projectWorkspacePageSlice.actions;

// ================ loadData ================ //

export const loadData = (params, search) => dispatch => {
  const { id: transactionId } = params;
  return dispatch(fetchWorkspaceThunk(transactionId));
};

export default projectWorkspacePageSlice.reducer;
