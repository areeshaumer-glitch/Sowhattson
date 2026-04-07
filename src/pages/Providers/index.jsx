import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ShieldCheck, Eye } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';

const LIMIT = 20;

const TABLE_TEXT_MAX = 15;

const DEFAULT_BLOCK_REASON = 'Violation of platform terms';

/** Truncate for table cells; use `title` on the element when truncated so full value shows on hover. */
function truncateTableText(value, maxLen = TABLE_TEXT_MAX) {
  const s = String(value ?? '').trim();
  if (!s) return { display: '—', full: '' };
  if (s.length <= maxLen) return { display: s, full: '' };
  return { display: `${s.slice(0, maxLen)}…`, full: s };
}

const VERIFY_OPTIONS = [
  { label: 'All Providers', value: '' },
  { label: 'Verified', value: 'verified' },
  { label: 'Pending', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

const ab = (bg, color) => ({
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: bg,
  border: 'none',
  cursor: 'pointer',
  color,
});

function emailLocalPart(email) {
  const e = String(email ?? '').trim();
  if (!e || !e.includes('@')) return '';
  return e.split('@')[0].trim() || '';
}

function displayNameFromUser(user) {
  if (!user || typeof user !== 'object') return '—';
  const p = user.profile && typeof user.profile === 'object' ? user.profile : null;
  if (p) {
    const parts = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    if (parts) return parts;
    if (String(p.username ?? '').trim()) return String(p.username).trim();
    if (String(p.businessName ?? '').trim()) return String(p.businessName).trim();
  }
  const top = String(user.name ?? user.fullName ?? user.displayName ?? '').trim();
  if (top) return top;
  const local = emailLocalPart(user.email);
  if (local) return local;
  return '—';
}

/** Maps UI filter → GET /users `status` (all | verified | pending | rejected | …). */
function statusQueryFromVerifyFilter(filter) {
  const f = String(filter ?? '').trim();
  if (!f) return 'all';
  return f;
}

/** GET /users with role=provider → existing providers table row shape. */
function normalizeProviderListRow(user) {
  if (!user || typeof user !== 'object') return null;
  const id = String(user._id ?? user.id ?? '');
  if (!id) return null;
  const p = user.profile && typeof user.profile === 'object' ? user.profile : null;
  const person = p ? [p.firstName, p.lastName].filter(Boolean).join(' ').trim() : '';
  const businessName =
    String(p?.businessName ?? '').trim()
    || String(p?.username ?? '').trim()
    || displayNameFromUser(user);
  const loc = p?.location && typeof p.location === 'object' ? p.location : null;
  const region = String(loc?.country ?? user.country ?? '').trim() || '—';

  const eventCountRaw =
    user.event ??
    user.eventCount ??
    user.eventsCount ??
    user.totalEvents ??
    (Array.isArray(user.events) ? user.events.length : null) ??
    user.experiencesCount ??
    null;
  const eventsCount =
    eventCountRaw != null && Number.isFinite(Number(eventCountRaw))
      ? Number(eventCountRaw)
      : null;
  const revenue = user.revenue ?? user.totalRevenue ?? null;
  const rating = user.rating ?? user.avgRating ?? null;
  const suspended = user.isBlocked === true || user.isSuspended === true || user.status === 'suspended';

  return {
    id,
    businessName: businessName || '—',
    name: person || emailLocalPart(user.email) || '—',
    email: String(user.email ?? '').trim() || '—',
    region,
    eventsCount,
    revenue: revenue != null && Number.isFinite(Number(revenue)) ? Number(revenue) : null,
    rating: rating != null && Number.isFinite(Number(rating)) ? Number(rating) : null,
    suspended,
    /** Full GET /users row — passed to provider detail (no separate user-by-id API). */
    rawUser: user,
  };
}

function isSuspended(row) {
  return row.suspended === true;
}

export default function ProvidersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actLoading, setActLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const fetchProviders = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getUsers({
        page,
        limit: LIMIT,
        role: 'provider',
        status: statusQueryFromVerifyFilter(verifyFilter),
        search: debouncedSearch.trim(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      onSuccess(response) {
        const raw = response.users ?? response.data ?? response.results ?? [];
        const list = (Array.isArray(raw) ? raw : []).map(normalizeProviderListRow).filter(Boolean);
        setProviders(list);

        const pg = response.pagination;
        if (pg && typeof pg.total === 'number') {
          setTotal(pg.total);
          const tp = Number(pg.pages ?? pg.totalPages);
          if (Number.isFinite(tp) && tp >= 1) setTotalPages(tp);
          else setTotalPages(Math.max(1, Math.ceil(pg.total / (pg.limit || LIMIT))));
        } else {
          const t = Number(response.total ?? response.count ?? response.totalCount);
          setTotal(Number.isFinite(t) && t >= 0 ? t : list.length);
          const tp = Number(response.totalPages);
          if (Number.isFinite(tp) && tp >= 1) setTotalPages(tp);
          else {
            const tot = Number.isFinite(t) && t >= 0 ? t : list.length;
            const lim = Number(response.limit) || LIMIT;
            setTotalPages(Math.max(1, Math.ceil(tot / lim)));
          }
        }
        setLoading(false);
      },
      onError(err) {
        setProviders([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, [page, debouncedSearch, verifyFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, verifyFilter]);

  const handleConfirmAction = () => {
    if (!confirm) return;
    setActLoading(true);
    const { type, prov } = confirm;
    const blocking = type === 'block';
    callApi({
      method: Method.PATCH,
      endPoint: blocking ? api.blockAdminProvider(prov.id) : api.unblockAdminProvider(prov.id),
      bodyParams: blocking ? { reason: DEFAULT_BLOCK_REASON } : undefined,
      onSuccess(res) {
        applyStatusChange(blocking);
        const msg = res && typeof res === 'object' && String(res.message ?? '').trim();
        if (msg) notifySuccess(msg);
      },
      onError(err) {
        setActLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  };

  const applyStatusChange = (nowBlocked) => {
    if (!confirm) return;
    const id = confirm.prov.id;
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, suspended: nowBlocked } : p)));
    setConfirm(null);
    setActLoading(false);
  };

  const columns = [
    {
      key: 'businessName',
      label: 'Provider',
      render: (_, row) => {
        const biz = truncateTableText(row.businessName);
        const person = truncateTableText(row.name);
        return (
          <div>
            <p
              style={{ fontWeight: 500, fontSize: 13.5 }}
              title={biz.full || undefined}
            >
              {biz.display}
            </p>
            <p
              style={{ fontSize: 11.5, color: 'var(--text-muted)' }}
              title={person.full || undefined}
            >
              {person.display}
            </p>
          </div>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (v) => {
        const em = truncateTableText(v);
        return (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }} title={em.full || undefined}>
            {em.display}
          </span>
        );
      },
    },
    {
      key: 'region',
      label: 'Region',
      render: (_, row) => {
        const r = row.region ?? row.country;
        return (
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {r || '—'}
          </span>
        );
      },
    },
    {
      key: 'eventsCount',
      label: 'Experiences',
      align: 'center',
      render: (v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v != null ? v : '—'}</span>,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
            {Number.isFinite(n) ? `₦${n.toLocaleString()}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (v) => {
        const n = Number(v);
        return (
          <span style={{ color: 'var(--warning)', fontWeight: 500 }}>
            {Number.isFinite(n) ? `★ ${n.toFixed(1)}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      width: '100px',
      render: (_, row) => {
        const suspended = isSuspended(row);
        return (
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
            <button
              type="button"
              title="View organizer verification"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/providers/${row.id}`, { state: { rawUser: row.rawUser } });
              }}
              style={ab('var(--primary-light)', 'var(--primary)')}
            >
              <Eye size={13} />
            </button>
            {suspended ? (
              <button
                type="button"
                title="Unblock provider"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ type: 'unblock', prov: row });
                }}
                style={ab('var(--success-bg)', 'var(--success)')}
              >
                <ShieldCheck size={13} />
              </button>
            ) : (
              <button
                type="button"
                title="Block provider"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ type: 'block', prov: row });
                }}
                style={ab('var(--warning-bg)', 'var(--warning)')}
              >
                <ShieldOff size={13} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Providers">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search providers…"
          style={{ flex: '1 1 240px', maxWidth: 380, minWidth: 160 }}
        />
        <Select
          value={verifyFilter}
          onChange={setVerifyFilter}
          options={VERIFY_OPTIONS}
          style={{ width: 180, flexShrink: 0 }}
        />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={providers}
        isLoading={loading}
        emptyMessage="No providers found."
        rowKey="id"
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !actLoading && setConfirm(null)}
        onConfirm={handleConfirmAction}
        loading={actLoading}
        variant={confirm?.type === 'unblock' ? 'primary' : 'danger'}
        title={confirm?.type === 'unblock' ? 'Unblock provider' : 'Block provider'}
        confirmLabel={confirm?.type === 'unblock' ? 'Unblock' : 'Block'}
        message={
          confirm?.type === 'unblock'
            ? `Unblock "${confirm?.prov.businessName}"? They will need to sign in again.`
            : `Block "${confirm?.prov.businessName}"? Their sessions will end immediately.`
        }
      />
    </div>
  );
}
