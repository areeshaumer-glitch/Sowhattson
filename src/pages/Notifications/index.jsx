import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CreditCard,
  CalendarDays,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';
import { ListPageToolbar, useMobileHeaderTitle } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const FILTER_OPTIONS = [
  { label: 'All notifications', value: '' },
  { label: 'Unread only', value: 'unread' },
];

const typeMeta = {
  booking: { Icon: CalendarDays, color: 'var(--primary)', bg: 'var(--primary-light)' },
  payout: { Icon: CreditCard, color: 'var(--success)', bg: 'var(--success-bg)' },
  alert: { Icon: ShieldAlert, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  system: { Icon: Info, color: 'var(--text-secondary)', bg: 'rgba(108,108,112,0.12)' },
};

function metaForNotifyType(notifyType) {
  const t = String(notifyType || '').toLowerCase();
  if (t.includes('event') || t === 'new_event') return typeMeta.booking;
  if (t.includes('payout') || t.includes('payment') || t.includes('refund') || t.includes('ticket')) {
    return typeMeta.payout;
  }
  if (t.includes('pause') || t.includes('suspend') || t.includes('alert') || t.includes('warning')) {
    return typeMeta.alert;
  }
  return typeMeta.system;
}

function normalizeNotification(row, userId) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row._id ?? row.id ?? '');
  if (!id) return null;
  const uid = userId != null ? String(userId) : '';
  const seenArr = Array.isArray(row.isSeen) ? row.isSeen.map(String) : [];
  const read = uid ? seenArr.includes(uid) : false;

  return {
    id,
    title: row.title ?? 'Notification',
    body: row.body ?? '',
    notifyType: row.notifyType ?? '',
    read,
    createdAt: row.createdAt ?? row.updatedAt ?? new Date().toISOString(),
    hasProcessedTickets: row.hasProcessedTickets,
    hasRefundedTickets: row.hasRefundedTickets,
    data: row.data,
  };
}

function formatListTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function NotificationsPage() {
  useMobileHeaderTitle('Notifications');
  const { isMobile } = useOutletContext() ?? {};
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const debouncedSearch = useDebounce(search, 350);
  const LIMIT = 20;

  /** PATCH /notifications/{id}/read — runs when user taps an unread row. */
  const markOneRead = (id) => {
    if (markingId === id) return;
    setMarkingId(id);
    callApi({
      method: Method.PATCH,
      endPoint: api.markUserNotificationRead(id),
      bodyParams: {},
      onSuccess() {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        setMarkingId((cur) => (cur === id ? null : cur));
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setMarkingId((cur) => (cur === id ? null : cur));
      },
    });
  };

  /** PATCH /notifications/read-all — runs when user clicks “Mark all read”. */
  const handleMarkAllRead = () => {
    setMarkAllLoading(true);
    callApi({
      method: Method.PATCH,
      endPoint: api.markAllUserNotificationsRead,
      bodyParams: {},
      onSuccess(response) {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(Number(response.unreadCount) || 0);
        setMarkAllLoading(false);
        notifySuccess('All notifications marked as read.');
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setMarkAllLoading(false);
      },
    });
  };

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getUserNotifications(page, LIMIT),
      onSuccess(response) {
        const raw = response.notifications ?? [];
        const rows = (Array.isArray(raw) ? raw : [])
          .map((r) => normalizeNotification(r, userId))
          .filter(Boolean);
        setItems(rows);
        setTotalCount(Number(response.count) || 0);
        setTotalPages(Math.max(1, Number(response.totalPages) || 1));
        setUnreadCount(Number(response.unreadCount) || 0);
        setLoading(false);
      },
      onError(err) {
        setItems([]);
        setTotalCount(0);
        setTotalPages(1);
        setUnreadCount(0);
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  }, [page, userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const displayedItems = useMemo(() => {
    let list = items;
    if (filter === 'unread') list = list.filter((n) => !n.read);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          String(n.notifyType).toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, debouncedSearch]);

  const unreadOnPage = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <div
      style={{
        animation: 'fadeIn 0.4s ease',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <ListPageToolbar
        title="Notifications"
        actions={
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<CheckCheck size={15} />}
            onClick={handleMarkAllRead}
            loading={markAllLoading}
            disabled={
              markAllLoading || (unreadCount === 0 && !items.some((n) => !n.read))
            }
          >
            Mark all read
          </Button>
        }
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search notifications…"
          style={{ flex: '1 1 240px', maxWidth: 420, minWidth: 160 }}
        />
        <Select
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS}
          style={{ width: 200, flexShrink: 0 }}
        />
      </ListPageToolbar>

      {!loading && filter !== 'unread' && unreadCount > 0 && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: '0 0 14px',
            maxWidth: '100%',
            overflowWrap: 'break-word',
          }}
        >
          {unreadCount} unread
          {unreadOnPage > 0 && unreadOnPage !== unreadCount ? ` · ${unreadOnPage} unread on this page` : ''}
        </p>
      )}

      {!loading && filter === 'unread' && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            margin: '0 0 14px',
          }}
        >
          Showing unread items on the current page only (filter is applied after load).
        </p>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : displayedItems.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.35, display: 'block' }} />
          {items.length > 0
            ? 'No notifications match your search or filter on this page.'
            : 'No notifications yet.'}
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {displayedItems.map((n) => {
            const meta = metaForNotifyType(n.notifyType);
            const Icon = meta.Icon;
            const RowSurface = n.read ? 'div' : 'button';
            const rowSurfaceProps = n.read
              ? {}
              : {
                  type: 'button',
                  'aria-label': `Mark notification as read: ${n.title}`,
                  onClick: () => markOneRead(n.id),
                  disabled: markingId === n.id,
                };
            return (
              <li key={n.id} style={{ minWidth: 0, maxWidth: '100%' }}>
                <RowSurface
                  {...rowSurfaceProps}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    textAlign: 'left',
                    display: 'flex',
                    gap: isMobile ? 10 : 14,
                    padding: isMobile ? '12px 14px' : '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${n.read ? 'var(--border)' : 'var(--primary)'}`,
                    background: n.read ? 'var(--bg-card)' : 'var(--primary-light)',
                    fontFamily: 'inherit',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: n.read ? 'default' : markingId === n.id ? 'wait' : 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div
                    style={{
                      width: isMobile ? 40 : 44,
                      height: isMobile ? 40 : 44,
                      borderRadius: 'var(--radius-md)',
                      background: meta.bg,
                      color: meta.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={isMobile ? 18 : 20} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile
                          ? 'minmax(0, 1fr)'
                          : 'minmax(0, 1fr) max-content',
                        columnGap: 12,
                        rowGap: 6,
                        alignItems: 'start',
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: isMobile ? 14 : 14.5,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          minWidth: 0,
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                      >
                        {n.title}
                      </p>
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          justifySelf: isMobile ? 'start' : 'end',
                          gridColumn: isMobile ? '1' : '2',
                          gridRow: isMobile ? '2' : '1',
                        }}
                      >
                        {formatListTime(n.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '8px 0 0',
                        fontSize: 13.5,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {n.body}
                    </p>
                    {!n.read && (
                      <span
                        style={{
                          display: 'block',
                          marginTop: 10,
                          fontSize: isMobile ? 10 : 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--primary)',
                          overflowWrap: 'break-word',
                          lineHeight: 1.4,
                        }}
                      >
                        Unread · tap to mark read
                      </span>
                    )}
                  </div>
                </RowSurface>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={totalCount}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
