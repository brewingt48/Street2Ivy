import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import {
  fetchProjectWorkspace as fetchProjectWorkspaceApi,
  sendProjectMessage as sendProjectMessageApi,
  markProjectMessagesRead as markProjectMessagesReadApi,
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
          state.workspace.messages = [...(state.workspace.messages || []), action.payload.message];
        }
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendMessageInProgress = false;
        state.sendMessageError = action.payload;
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
