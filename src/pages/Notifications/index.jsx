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
import { ListPageToolbar, useMobileHeaderTitle } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const MOCK = [
  { id: '1', title: 'New ticket sale', body: '3 tickets sold for Afrobeats Night.', type: 'booking', read: false, createdAt: '2026-03-31T09:12:00Z' },
  { id: '2', title: 'Provider verification', body: 'LuxEvents submitted documents for review.', type: 'system', read: false, createdAt: '2026-03-31T08:40:00Z' },
  { id: '3', title: 'Payout completed', body: '₦125,000 payout to TxEvents was processed.', type: 'payout', read: true, createdAt: '2026-03-30T16:22:00Z' },
  { id: '4', title: 'Experience paused', body: 'Comedy Fiesta was suspended by an admin.', type: 'alert', read: true, createdAt: '2026-03-30T11:05:00Z' },
  { id: '5', title: 'New review', body: '5★ review on Jazz & Wine from Amara Osei.', type: 'booking', read: false, createdAt: '2026-03-29T19:30:00Z' },
  { id: '6', title: 'Weekly summary', body: 'Your dashboard summary for Mar 24–30 is ready.', type: 'system', read: true, createdAt: '2026-03-29T07:00:00Z' },
  { id: '7', title: 'Low ticket inventory', body: 'VIP tier for Tech Summit is below 10 seats.', type: 'alert', read: false, createdAt: '2026-03-28T14:18:00Z' },
  { id: '8', title: 'Refund issued', body: 'Refund of ₦15,000 completed for ticket #4821.', type: 'payout', read: true, createdAt: '2026-03-27T10:44:00Z' },
];

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

function normalizeNotification(row) {
  if (!row || typeof row !== 'object') return null;
  const type = ['booking', 'payout', 'alert', 'system'].includes(row.type) ? row.type : 'system';
  return {
    id: String(row.id ?? ''),
    title: row.title ?? row.subject ?? 'Notification',
    body: row.body ?? row.message ?? row.description ?? '',
    type,
    read: row.read === true || row.isRead === true || row.readAt != null,
    createdAt: row.createdAt ?? row.created_at ?? row.timestamp ?? new Date().toISOString(),
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

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const LIMIT = 12;

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminNotifications(page, LIMIT, debouncedSearch, filter),
      onSuccess(response) {
        const raw = response.data ?? response.notifications ?? [];
        const rows = (Array.isArray(raw) ? raw : []).map(normalizeNotification).filter(Boolean);
        setItems(rows);
        setTotal(response.total ?? rows.length);
        setLoading(false);
      },
      onError() {
        const q = debouncedSearch.toLowerCase();
        let list = MOCK.map(normalizeNotification).filter(Boolean);
        if (q) {
          list = list.filter(
            (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
          );
        }
        if (filter === 'unread') list = list.filter((n) => !n.read);
        setTotal(list.length);
        setItems(list.slice((page - 1) * LIMIT, page * LIMIT));
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filter]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markOneRead = (id) => {
    callApi({
      method: Method.PATCH,
      endPoint: api.markAdminNotificationRead(id),
      bodyParams: {},
      onSuccess() {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      },
      onError() {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      },
    });
  };

  const handleMarkAllRead = () => {
    setMarkAllLoading(true);
    callApi({
      method: Method.POST,
      endPoint: api.markAllAdminNotificationsRead,
      bodyParams: {},
      onSuccess() {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setMarkAllLoading(false);
      },
      onError() {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setMarkAllLoading(false);
      },
    });
  };

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
            variant="outline"
            size="md"
            icon={<CheckCheck size={15} />}
            onClick={handleMarkAllRead}
            loading={markAllLoading}
            disabled={!items.some((n) => !n.read)}
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
          {unreadCount} unread on this page
        </p>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : items.length === 0 ? (
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
          No notifications yet.
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
          {items.map((n) => {
            const meta = typeMeta[n.type] ?? typeMeta.system;
            const Icon = meta.Icon;
            return (
              <li key={n.id} style={{ minWidth: 0, maxWidth: '100%' }}>
                <button
                  type="button"
                  onClick={() => { if (!n.read) markOneRead(n.id); }}
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
                    cursor: n.read ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: 'var(--shadow-sm)',
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
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
