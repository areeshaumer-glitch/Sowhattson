export const BASE_URL = import.meta.env.VITE_API_URL || 'https://sowhat.txdynamics.io/api/v1/';

export const api = {
  // ── AUTH (same backend as mobile app) ────────────────────
  signin:               'auth/signin',
  logout:               'auth/logout',
  refreshAccessToken:   'auth/refresh-token',
  updatePassword:       'auth/update-password',
  /** Authenticated user profile (name, bio, etc.) */
  updateProfile:        'profile',
  /** Password reset (public): request OTP → verify OTP → set new password */
  forgotPasswordRequest:   'auth/forgot-password',
  verifyForgotPassword: 'auth/verify-forgot-password',
  forgotPasswordReset:  'auth/reset-password',

  // ── USER NOTIFICATIONS (authenticated) ────────────────────
  getUserNotifications: (page = 1, limit = 20) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    return `notifications?${p.toString()}`;
  },
  markUserNotificationRead: (id) => `notifications/${id}/read`,
  markAllUserNotificationsRead: 'notifications/read-all',

  /** GET /s3/file/{key} — presigned URL for stored object (`key` may contain `/`, passed as one encoded segment). */
  getS3PresignedFile: (key) => `s3/file/${encodeURIComponent(String(key ?? '').trim())}`,

  // ── ADMIN DASHBOARD ───────────────────────────────────────
  /** period: week | month | year only — optional startDate/endDate (YYYY-MM-DD) for a fixed window */
  getDashboardStats: (period, { startDate = '', endDate = '' } = {}) => {
    const p = new URLSearchParams();
    p.set('period', period);
    const from = String(startDate ?? '').trim();
    const to = String(endDate ?? '').trim();
    if (from) p.set('startDate', from);
    if (to) p.set('endDate', to);
    return `admin/dashboard/stats?${p.toString()}`;
  },

  // ── ADMIN NOTIFICATIONS ───────────────────────────────────
  getAdminNotifications: (page = 1, limit = 20, search = '', unreadOnly = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (unreadOnly === 'unread') p.append('read', 'false');
    return `admin/notifications?${p.toString()}`;
  },
  markAdminNotificationRead:     (id) => `admin/notifications/${id}/read`,
  markAllAdminNotificationsRead: 'admin/notifications/read-all',

  // ── ADMIN EVENTS ──────────────────────────────────────────
  /** GET /admin/events — status: all | active | cancelled | completed; search: name, provider names */
  getAdminEvents: (page = 1, limit = 20, search = '', status = 'all') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    const st = String(status ?? '').trim() || 'all';
    p.append('status', st);
    if (String(search ?? '').trim()) p.append('search', String(search).trim());
    return `admin/events?${p.toString()}`;
  },
  getAdminEventById:    (id) => `admin/events/${id}`,
  updateAdminEvent:     (id) => `admin/events/${id}`,
  pauseAdminEvent:      (id) => `admin/events/${id}/pause`,
  resumeAdminEvent:     (id) => `admin/events/${id}/resume`,
  deleteAdminEvent:     (id) => `admin/events/${id}`,

  /** GET /events/{eventId} — event by ID; includeVibes true|false (default true). */
  getEventById: (eventId, includeVibes = true) => {
    const p = new URLSearchParams();
    p.set('includeVibes', includeVibes === false ? 'false' : 'true');
    return `events/${eventId}?${p.toString()}`;
  },

  // ── ADMIN TICKETS ─────────────────────────────────────────
  /** GET /tickets/admin/all — page, limit, status, search; startDate/endDate YYYY-MM-DD (optional) */
  getAdminTickets: (page = 1, limit = 10, status = '', search = '', startDate = '', endDate = '') => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    const s = String(status ?? '').trim();
    if (s) p.set('status', s);
    const q = String(search ?? '').trim();
    if (q) p.set('search', q);
    const from = String(startDate ?? '').trim();
    const to = String(endDate ?? '').trim();
    if (from) p.set('startDate', from);
    if (to) p.set('endDate', to);
    return `tickets/admin/all?${p.toString()}`;
  },
  /** GET /tickets/event/{eventId} — all ticket purchases for an event. */
  getEventTickets: (eventId) => `tickets/event/${eventId}`,
  cancelAdminTicket:    (id) => `admin/tickets/${id}/cancel`,
  refundAdminTicket:    (id) => `admin/tickets/${id}/refund`,

  // ── ADMIN PROVIDERS ───────────────────────────────────────
  getAdminProviders: (page = 1, limit = 20, search = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    return `admin/providers?${p.toString()}`;
  },
  getAdminProviderById: (id) => `admin/providers/${id}`,
  verifyAdminProvider:  (id) => `admin/providers/${id}/verify`,
  suspendAdminProvider:   (id) => `admin/providers/${id}/suspend`,
  activateAdminProvider:  (id) => `admin/providers/${id}/activate`,
  /** PATCH — block provider (body: { reason }); invalidates tokens. */
  blockAdminProvider:   (userId) => `admin/providers/${userId}/block`,
  /** PATCH — unblock provider; user must sign in again. */
  unblockAdminProvider: (userId) => `admin/providers/${userId}/unblock`,

  // ── ADMIN USERS (legacy list path — prefer getUsers) ───────
  getAdminUsers: (page = 1, limit = 20, search = '', role = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (role) p.append('role', role);
    return `admin/users?${p.toString()}`;
  },

  /**
   * GET /users — Admin user management (pagination, role/status filters, search).
   * role: all | explorer | provider | admin | guest
   * status: all | active | deleted | verified | unverified | …
   * sortBy: createdAt | updatedAt | email | role — sortOrder: asc | desc
   */
  getUsers: ({
    page = 1,
    limit = 20,
    role = 'all',
    status = 'all',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = {}) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    const r = String(role ?? 'all').trim() || 'all';
    p.set('role', r);
    const st = String(status ?? 'all').trim() || 'all';
    p.set('status', st);
    const q = String(search ?? '').trim();
    if (q) p.set('search', q);
    const sb = String(sortBy || 'createdAt').trim();
    if (['createdAt', 'updatedAt', 'email', 'role'].includes(sb)) p.set('sortBy', sb);
    const so = String(sortOrder || 'desc').toLowerCase();
    if (so === 'asc' || so === 'desc') p.set('sortOrder', so);
    return `users?${p.toString()}`;
  },
  /** GET /users/:userId — single user (admin). */
  getUserById: (userId) => `users/${userId}`,
  suspendAdminUser:     (id) => `admin/users/${id}/suspend`,
  activateAdminUser:    (id) => `admin/users/${id}/activate`,
  deleteAdminUser:      (id) => `admin/users/${id}`,

  // ── CATEGORIES (event categories) ──────────────────────────
  /** GET /categories — includeInactive true|false (default false) */
  getCategories: (includeInactive = false) => {
    const p = new URLSearchParams();
    p.set('includeInactive', includeInactive ? 'true' : 'false');
    return `categories?${p.toString()}`;
  },
  createCategory:   'categories',
  updateCategory:   (categoryId) => `categories/${categoryId}`,
  deleteCategory:   (categoryId) => `categories/${categoryId}`,

  // ── ADMIN COUPONS ─────────────────────────────────────────
  getAdminCoupons: (opts = {}) => {
    const p = new URLSearchParams();
    if (opts.eventId) p.set('eventId', opts.eventId);
    if (opts.isActive === true || opts.isActive === false) p.set('isActive', String(opts.isActive));
    const qs = p.toString();
    return qs ? `admin/coupons?${qs}` : 'admin/coupons';
  },
  getAdminCouponById:   (id) => `admin/coupons/${id}`,
  createAdminCoupon:    'admin/coupons',
  updateAdminCoupon:    (id) => `admin/coupons/${id}`,
  deleteAdminCoupon:    (id) => `admin/coupons/${id}`,

  // ── ADMIN VIBES ───────────────────────────────────────────
  getAdminVibes: (page = 1, limit = 20, search = '', status = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (status) p.append('status', status);
    return `admin/vibes?${p.toString()}`;
  },
  updateAdminVibe:      (id) => `admin/vibes/${id}`,
  deleteAdminVibe:      (id) => `admin/vibes/${id}`,

  // ── ADMIN PAYMENT REVIEWS ─────────────────────────────────
  /** GET /payment-reviews (admin only) — page, limit, sortBy, sortOrder (1 | -1), optional rating, optional search */
  getAdminPaymentReviews: ({
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
    rating,
    search = '',
  } = {}) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('sortBy', sortBy);
    p.set('sortOrder', String(sortOrder));
    const r = rating != null && String(rating).trim() !== '';
    if (r && !Number.isNaN(Number(rating))) p.set('rating', String(Number(rating)));
    const q = String(search ?? '').trim();
    if (q) p.set('search', q);
    return `payment-reviews?${p.toString()}`;
  },

  // ── ADMIN REVIEWS (mutations if still used) ────────────────
  updateAdminReview:    (id) => `admin/reviews/${id}`,
  deleteAdminReview:    (id) => `admin/reviews/${id}`,

  // ── PAYOUTS ────────────────────────────────────────────────
  /**
   * GET /payouts — page, limit, status, providerName
   * Explorer/experience text search is handled client-side (payouts list API does not match Paystack customer names).
   */
  getPayouts: ({
    page = 1,
    limit = 20,
    status = 'all',
    providerName = '',
    startDate = '',
    endDate = '',
  } = {}) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('status', status && String(status).trim() ? String(status).trim() : 'all');
    const prov = String(providerName ?? '').trim();
    if (prov) p.set('providerName', prov);
    const from = String(startDate ?? '').trim();
    const to = String(endDate ?? '').trim();
    if (from) p.set('startDate', from);
    if (to) p.set('endDate', to);
    return `payouts?${p.toString()}`;
  },
  /** POST /admin/payouts/{payoutId}/retry — retry failed payout (admin; Paystack transfer) */
  retryPayout: (payoutId) => `admin/payouts/${payoutId}/retry`,

  // ── ADMIN PAYMENTS (legacy / other actions) ─────────────
  refundAdminPayment:   (id) => `admin/payments/${id}/refund`,
  updateAdminPayment:   (id) => `admin/payments/${id}`,
};
