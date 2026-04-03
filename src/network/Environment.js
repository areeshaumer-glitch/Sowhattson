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

  // ── ADMIN DASHBOARD ───────────────────────────────────────
  getDashboardStats: (period) => {
    const p = new URLSearchParams();
    p.set('period', period);
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
  getAdminEvents: (page = 1, limit = 20, search = '', status = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (status) p.append('status', status);
    return `admin/events?${p.toString()}`;
  },
  getAdminEventById:    (id) => `admin/events/${id}`,
  updateAdminEvent:     (id) => `admin/events/${id}`,
  pauseAdminEvent:      (id) => `admin/events/${id}/pause`,
  resumeAdminEvent:     (id) => `admin/events/${id}/resume`,
  deleteAdminEvent:     (id) => `admin/events/${id}`,

  // ── ADMIN TICKETS ─────────────────────────────────────────
  getAdminTickets: (page = 1, limit = 20, search = '', status = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (status) p.append('status', status);
    return `admin/tickets?${p.toString()}`;
  },
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

  // ── ADMIN USERS ───────────────────────────────────────────
  getAdminUsers: (page = 1, limit = 20, search = '', role = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (role)   p.append('role', role);
    return `admin/users?${p.toString()}`;
  },
  suspendAdminUser:     (id) => `admin/users/${id}/suspend`,
  activateAdminUser:    (id) => `admin/users/${id}/activate`,
  deleteAdminUser:      (id) => `admin/users/${id}`,

  // ── ADMIN TAGS ────────────────────────────────────────────
  getAdminTags: (page = 1, limit = 20, search = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    return `admin/tags?${p.toString()}`;
  },
  createAdminTag:       'admin/tags',
  updateAdminTag:       (id) => `admin/tags/${id}`,
  deleteAdminTag:       (id) => `admin/tags/${id}`,

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

  // ── ADMIN REVIEWS ─────────────────────────────────────────
  getAdminReviews: (page = 1, limit = 20, search = '', status = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (status) p.append('status', status);
    return `admin/reviews?${p.toString()}`;
  },
  updateAdminReview:    (id) => `admin/reviews/${id}`,
  deleteAdminReview:    (id) => `admin/reviews/${id}`,

  // ── ADMIN PAYMENTS ────────────────────────────────────────
  getAdminPayments: (page = 1, limit = 20, search = '', status = '') => {
    const p = new URLSearchParams();
    p.append('page', String(page));
    p.append('limit', String(limit));
    if (search) p.append('search', search);
    if (status) p.append('status', status);
    return `admin/payments?${p.toString()}`;
  },
  refundAdminPayment:   (id) => `admin/payments/${id}/refund`,
  updateAdminPayment:   (id) => `admin/payments/${id}`,
};
