import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { withRetry } from '../../util/apiRetry';
import {
  fetchCorporateDashboardStats as fetchCorporateStatsApi,
  fetchAlumniDashboardData as fetchAlumniDataApi,
  fetchEducationDashboard as fetchEduDashboardApi,
  fetchAdminTenants as fetchAdminTenantsApi,
  fetchAdminTenantRequests as fetchAdminTenantRequestsApi,
  fetchAdminUsers as fetchAdminUsersApi,
} from '../../util/api';

export const ASSET_NAME = 'landing-page';

// ================ Helper: Compute student profile completion ================ //

const computeStudentHomeData = currentUser => {
  if (!currentUser) return { profileCompletion: 0 };

  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const profile = currentUser?.attributes?.profile || {};

  // Calculate profile completion based on key fields
  const fields = [
    !!profile.firstName,
    !!profile.lastName,
    !!profile.displayName,
    !!publicData.university,
    !!publicData.major,
    !!publicData.graduationYear,
    !!publicData.skills?.length,
    !!publicData.bio,
    !!currentUser?.profileImage?.id,
  ];

  const completed = fields.filter(Boolean).length;
  const total = fields.length;
  const profileCompletion = Math.round((completed / total) * 100);

  return {
    profileCompletion,
    university: publicData.university || '',
    major: publicData.major || '',
    graduationYear: publicData.graduationYear || '',
    skills: publicData.skills || [],
    onboardingComplete: publicData.onboardingComplete || false,
  };
};

// ================ Async Thunks ================ //

// Map transaction lastTransition to a pipeline state for the status tracker
const getApplicationState = lastTransition => {
  if (!lastTransition) return 'applied';
  const t = lastTransition;
  if (t.includes('decline')) return 'declined';
  if (t.includes('withdraw')) return 'withdrawn';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('review')) return 'reviewed';
  if (t.includes('expire-review') || t.includes('expire-customer-review') || t.includes('expire-provider-review')) return 'reviewed';
  if (t.includes('complete') || t.includes('mark-completed')) return 'completed';
  if (t.includes('hand-off')) return 'handed-off';
  if (t.includes('accept')) return 'accepted';
  if (t.includes('apply')) return 'applied';
  return 'applied';
};

const fetchHomeDataPayloadCreator = async ({ userType, currentUser }, { rejectWithValue, extra: sdk }) => {
  try {
    switch (userType) {
      case 'corporate-partner': {
        const data = await withRetry(() => fetchCorporateStatsApi(), { maxRetries: 2 });
        return { role: userType, data };
      }
      case 'alumni': {
        const data = await withRetry(() => fetchAlumniDataApi(), { maxRetries: 2 });
        return { role: userType, data };
      }
      case 'educational-admin': {
        const data = await withRetry(() => fetchEduDashboardApi(), { maxRetries: 2 });
        return { role: userType, data };
      }
      case 'system-admin': {
        // Fetch multiple admin endpoints in parallel
        const [tenantsRes, requestsRes, usersRes] = await Promise.allSettled([
          withRetry(() => fetchAdminTenantsApi(), { maxRetries: 2 }),
          withRetry(() => fetchAdminTenantRequestsApi(), { maxRetries: 2 }),
          withRetry(() => fetchAdminUsersApi({ perPage: 1 }), { maxRetries: 2 }),
        ]);

        const tenants = tenantsRes.status === 'fulfilled' ? tenantsRes.value : { data: [] };
        const requests = requestsRes.status === 'fulfilled' ? requestsRes.value : { data: [] };
        const users = usersRes.status === 'fulfilled' ? usersRes.value : { data: [], meta: {} };

        return {
          role: userType,
          data: {
            tenants: tenants.data || [],
            pendingRequests: (requests.data || []).filter(r => r.status === 'pending'),
            totalTenants: (tenants.data || []).length,
            activeTenants: (tenants.data || []).filter(t => t.status === 'active').length,
            totalUsers: users.meta?.totalItems || (users.data || []).length,
          },
        };
      }
      case 'student':
      default: {
        // Student data is computed client-side from currentUser profile
        const studentData = computeStudentHomeData(currentUser);

        // Fetch transactions and available listings in parallel
        const [txResult, listingsResult] = await Promise.allSettled([
          sdk.transactions.query({
            only: 'order',
            include: ['listing', 'provider', 'provider.profileImage'],
            'fields.image': ['variants.square-small', 'variants.square-small2x'],
            perPage: 10,
          }),
          sdk.listings.query({
            perPage: 20,
            include: ['author', 'images'],
            'fields.image': ['variants.square-small', 'variants.square-small2x'],
          }),
        ]);

        // Process transactions into applications
        let applications = [];
        if (txResult.status === 'fulfilled') {
          const txResponse = txResult.value;
          const txData = txResponse?.data?.data || [];
          const included = txResponse?.data?.included || [];

          // Build a lookup for included entities
          const includedMap = {};
          included.forEach(item => {
            const key = `${item.type}_${item.id.uuid || item.id}`;
            includedMap[key] = item;
          });

          applications = txData.map(tx => {
            const listingRef = tx.relationships?.listing?.data;
            const providerRef = tx.relationships?.provider?.data;

            const listing = listingRef
              ? includedMap[`listing_${listingRef.id.uuid || listingRef.id}`]
              : null;
            const provider = providerRef
              ? includedMap[`user_${providerRef.id.uuid || providerRef.id}`]
              : null;

            const lastTransition = tx.attributes?.lastTransition || '';
            const state = getApplicationState(lastTransition);

            return {
              id: tx.id.uuid || tx.id,
              state,
              lastTransition,
              createdAt: tx.attributes?.createdAt,
              lastTransitionedAt: tx.attributes?.lastTransitionedAt,
              projectTitle: listing?.attributes?.title || 'Project',
              companyName: provider?.attributes?.profile?.publicData?.companyName
                || provider?.attributes?.profile?.displayName
                || 'Company',
            };
          });
        } else {
          console.warn('Failed to fetch student applications for dashboard:', txResult.reason);
        }

        // Process listings for recommendations
        let recommendedListings = [];
        if (listingsResult.status === 'fulfilled') {
          recommendedListings = listingsResult.value?.data?.data || [];
        } else {
          console.warn('Failed to fetch listings for recommendations:', listingsResult.reason);
        }

        // Compute stats from applications
        const applicationsCount = applications.length;
        const activeProjectsCount = applications.filter(a =>
          ['accepted', 'handed-off', 'completed'].includes(a.state)
        ).length;

        return {
          role: 'student',
          data: {
            ...studentData,
            applicationsCount,
            activeProjectsCount,
            applications,
            recommendedListings,
          },
        };
      }
    }
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchHomeDataThunk = createAsyncThunk(
  'app/LandingPage/fetchHomeData',
  fetchHomeDataPayloadCreator
);

export const fetchHomeData = ({ userType, currentUser }) => dispatch => {
  return dispatch(fetchHomeDataThunk({ userType, currentUser })).unwrap();
};

// ================ Slice ================ //

const landingPageSlice = createSlice({
  name: 'LandingPage',
  initialState: {
    homeData: null,
    homeDataLoading: false,
    homeDataError: null,
  },
  reducers: {
    clearHomeData: state => {
      state.homeData = null;
      state.homeDataLoading = false;
      state.homeDataError = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchHomeDataThunk.pending, state => {
        state.homeDataLoading = true;
        state.homeDataError = null;
      })
      .addCase(fetchHomeDataThunk.fulfilled, (state, action) => {
        state.homeDataLoading = false;
        state.homeData = action.payload;
      })
      .addCase(fetchHomeDataThunk.rejected, (state, action) => {
        state.homeDataLoading = false;
        state.homeDataError = action.payload;
      });
  },
});

export const { clearHomeData } = landingPageSlice.actions;

// SSR loadData: keep lightweight since auth isn't available during SSR
export const loadData = (params, search) => dispatch => {
  return Promise.resolve();
};

export default landingPageSlice.reducer;
