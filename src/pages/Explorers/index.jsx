import { useState, useEffect, useCallback } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';

const LIMIT = 20;

function formatJoined(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).split('T')[0] || '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function emailLocalPart(email) {
  const e = String(email ?? '').trim();
  if (!e || !e.includes('@')) return '';
  return e.split('@')[0].trim() || '';
}

/** Valid explorer email → mailto URL for the system mail client; otherwise null. */
function explorerMailtoHref(email) {
  const e = String(email ?? '').trim();
  if (!e || e === '—' || !e.includes('@')) return null;
  return `mailto:${encodeURIComponent(e)}`;
}

/** GET /users explorer row — profile may omit firstName/lastName; fall back to username then email prefix. */
function explorerDisplayName(user) {
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

/** API: `isVerified` = email/OTP verified on the user document. */
function explorerEmailVerified(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.isVerified === true) return true;
  if (user.verified === true) return true;
  const s = String(user.verificationStatus ?? '').toLowerCase();
  return ['verified', 'admin_verified'].includes(s);
}

/** GET /users row → table shape (matches root `users[]` + `total`, `totalPages`, …). */
function normalizeExplorerRow(user) {
  if (!user || typeof user !== 'object') return null;
  const id = String(user._id ?? user.id ?? '');
  if (!id) return null;
  const ticketsCount = user.ticketsCount ?? user.ticketCount ?? user.tickets ?? null;
  return {
    id,
    name: explorerDisplayName(user),
    email: String(user.email ?? '').trim() || '—',
    ticketsCount: ticketsCount != null && Number.isFinite(Number(ticketsCount)) ? Number(ticketsCount) : null,
    isVerified: explorerEmailVerified(user),
    createdAt: formatJoined(user.createdAt),
  };
}

export default function ExplorersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [explorers, setExplorers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 350);

  const fetchExplorers = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getUsers({
        page,
        limit: LIMIT,
        role: 'explorer',
        status: 'all',
        search: debouncedSearch.trim(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      onSuccess(response) {
        const raw = response.users ?? response.data ?? response.results ?? [];
        const list = (Array.isArray(raw) ? raw : []).map(normalizeExplorerRow).filter(Boolean);
        setExplorers(list);

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
        setExplorers([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchExplorers();
  }, [fetchExplorers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const columns = [
    {
      key: 'name',
      label: 'Explorer',
      render: (v) => <span style={{ fontWeight: 500, fontSize: 13.5 }}>{v}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      render: (v) => {
        const href = explorerMailtoHref(v);
        if (!href) {
          return <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v || '—'}</span>;
        }
        return (
          <a
            href={href}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Send email to ${v}`}
            title="Open in your email app"
            style={{
              fontSize: 12.5,
              color: 'var(--primary)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {v}
          </a>
        );
      },
    },
    {
      key: 'ticketsCount',
      label: 'Tickets',
      align: 'center',
      render: (v) => (
        <span style={{ fontSize: 13, fontWeight: 500 }}>{v != null ? v : '—'}</span>
      ),
    },
    {
      key: 'isVerified',
      label: 'Verified',
      align: 'center',
      render: (v) => (
        <Badge color={v ? 'success' : 'warning'} dot style={{ fontWeight: 500 }}>
          {v ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v}</span>,
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Explorers">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search explorers…"
          style={{ flex: '1 1 240px', maxWidth: 380, minWidth: 160 }}
        />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={explorers}
        isLoading={loading}
        emptyMessage="No explorers found."
        rowKey="id"
      />
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />
    </div>
  );
}
