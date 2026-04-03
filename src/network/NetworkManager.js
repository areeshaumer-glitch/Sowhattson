import axios from 'axios';
import { BASE_URL, api } from './Environment';
import { useAuthStore } from '../store/authStore';

/* ─── Constants (mirrors mobile app) ────────────────────── */
export const Method = {
  GET:    'GET',
  POST:   'POST',
  PUT:    'PUT',
  DELETE: 'DELETE',
  PATCH:  'PATCH',
};

export const Status = {
  SUCCESS:               200,
  CREATED:               201,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  INTERNAL_SERVER_ERROR: 500,
};

/* ─── Axios instance ─────────────────────────────────────── */
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/* Attach auth token on every request */
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.authorization = `Bearer ${token}`;
  return config;
});

/** POST /auth/logout with refreshToken, then clear local session (always clears even if the request fails). */
export async function performLogout() {
  const refreshToken = useAuthStore.getState().refreshToken;
  try {
    if (refreshToken) {
      await axiosInstance.post(api.logout, { refreshToken });
    }
  } catch {
    /* 404 token not found, network, etc. — still sign out locally */
  } finally {
    useAuthStore.getState().logout();
  }
}

/* ─── Token refresh helper ───────────────────────────────── */
const refreshAccessToken = async () => {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) return null;
    const response = await axiosInstance.post(api.refreshAccessToken, { refreshToken });
    const accessToken = response.data?.accessToken ?? null;
    return accessToken;
  } catch {
    return null;
  }
};

/* ─── Auth error handler (redirect to /login) ────────────── */
const handleAuthError = (message) => {
  void performLogout().finally(() => {
    window.location.href = '/login';
    console.warn('Auth error:', message);
  });
};

/** Sign-in / password-recovery calls may return 401; show onError, don't force logout. */
const isPublicAuthFlowEndpoint = (ep) =>
  ep === 'auth/signin' ||
  ep.startsWith('auth/forgot-password') ||
  ep === 'auth/verify-forgot-password' ||
  ep === 'auth/reset-password' ||
  ep === api.refreshAccessToken;

/* ─── callApi (mirrors mobile NetworkManager) ────────────── */
export const callApi = async ({
  method,
  endPoint,
  bodyParams,
  onSuccess,
  onError,
  multipart = false,
  count = 0,
}) => {
  try {
    const token = useAuthStore.getState().token;
    const requestConfig = {
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'Content-Type': multipart ? 'multipart/form-data' : 'application/json',
      },
    };

    let response;

    switch (method) {
      case 'GET':
        response = await axiosInstance.get(endPoint, {
          ...requestConfig,
          ...(bodyParams && { params: bodyParams }),
        });
        break;
      case 'POST':
        response = await axiosInstance.post(endPoint, bodyParams, requestConfig);
        break;
      case 'PUT':
        response = await axiosInstance.put(endPoint, bodyParams, requestConfig);
        break;
      case 'PATCH':
        response = await axiosInstance.patch(endPoint, bodyParams, requestConfig);
        break;
      case 'DELETE':
        response = await axiosInstance.delete(endPoint, requestConfig);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    const responseData = response.data;

    if (
      responseData?.message === 'User recently changed password please login again!'
    ) {
      handleAuthError(responseData.message);
      return;
    }

    if (response.status >= 200 && response.status < 300) {
      onSuccess && onSuccess(responseData);
    } else {
      onError && onError(responseData);
    }
  } catch (error) {
    console.error('API Call Failed:', {
      endpoint: endPoint,
      method,
      error: error instanceof Error ? error.message : String(error),
    });

    if (axios.isAxiosError(error)) {
      const axiosError = error;

      if (axiosError.response?.status === 401 && count < 2) {
        if (isPublicAuthFlowEndpoint(endPoint)) {
          const data = axiosError.response?.data;
          onError && onError(data !== undefined && data !== '' ? data : axiosError);
          return;
        }

        const serverMsg = axiosError.response.data?.message ?? '';

        if (
          serverMsg.includes('jwt expired') ||
          serverMsg.includes('token') ||
          serverMsg.includes('expired') ||
          serverMsg.includes('unauthorized')
        ) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            useAuthStore.getState().setToken?.(newToken);
            return callApi({ method, endPoint, bodyParams, onSuccess, onError, multipart, count: count + 1 });
          }
        }
        handleAuthError(serverMsg || 'Session expired. Please login again.');
        return;
      }

      const serverError = axiosError.response?.data;
      onError && onError(serverError ?? error);
    } else {
      onError && onError(error);
    }
  }
};
