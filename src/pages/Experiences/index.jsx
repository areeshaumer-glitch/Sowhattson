import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, ShieldOff, PlayCircle } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';
import { formatExperienceTypeLabel, getExperienceStatus } from '../../utils/experienceType';
import { formatNameForCell } from '../../utils/formatNameForCell';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';

const LIMIT = 20;

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Completed', value: 'completed' },
];

const ab = (bg, color, cursor = 'pointer') => ({
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: bg,
  border: 'none',
  cursor,
  color,
});

/** API list row → table shape (GET /admin/events `events[]`). */
function normalizeAdminListEvent(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const id = String(ev._id ?? ev.id ?? '');
  if (!id) return null;
  const prof = ev.provider?.profile && typeof ev.provider.profile === 'object' ? ev.provider.profile : {};
  const firstLast = [prof.firstName, prof.lastName].filter(Boolean).join(' ').trim();
  const businessName = String(prof.businessName ?? '').trim();
  const providerLabel = businessName || firstLast || String(ev.provider?.email ?? '').trim() || '—';

  return {
    ...ev,
    id,
    title: String(ev.name ?? ev.title ?? '').trim() || '—',
    category: String(ev.category ?? '').trim() || '—',
    location: String(ev.locationText ?? ev.location ?? '').trim() || '—',
    ticketsSold: Number(ev.bookedSeats ?? 0) || 0,
    provider: {
      id: ev.provider ? String(ev.provider._id ?? ev.provider.id ?? '') : '',
      businessName: providerLabel,
      email: ev.provider?.email,
      profile: prof,
    },
    pauseInfo: ev.pauseInfo,
  };
}

function coercePausedFlag(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') return ['true', '1', 'yes'].includes(v.trim().toLowerCase());
  return false;
}

/** True when the event is in a paused state (list API may use pauseInfo and/or status). */
function isEventPaused(row) {
  if (!row || typeof row !== 'object') return false;
  const p = row.pauseInfo;
  if (p && typeof p === 'object') {
    if (coercePausedFlag(p.isPaused)) return true;
    if (getExperienceStatus(row) === 'cancelled' && p.pausedAt && !p.resumedAt) return true;
  }
  return getExperienceStatus(row) === 'paused';
}

function canPauseEvent(row) {
  const s = getExperienceStatus(row);
  if (s === 'completed') return false;
  if (isEventPaused(row)) return false;
  if (s === 'cancelled') return false;
  return s === 'active';
}

/**
 * Show unpause when the event can be resumed.
 * Admin pause uses PATCH /pause and sets status to "cancelled"; the list often does not send pauseInfo.isPaused,
 * so we also offer resume for cancelled rows (API returns 400 if the event was not paused).
 */
function canResumeEvent(row) {
  const s = getExperienceStatus(row);
  if (s === 'completed') return false;
  if (isEventPaused(row)) return true;
  if (s === 'cancelled') return true;
  return false;
}

function defaultPauseBody() {
  const pauseStartDate = new Date().toISOString();
  const pauseEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    pauseStartDate,
    pauseEndDate,
    pauseReason: 'Suspended by admin',
  };
}

function ExperiencesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [experiences, setExperiences] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const fetchExperiences = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminEvents(page, LIMIT, debouncedSearch, status),
      onSuccess(response) {
        const raw = response.events ?? response.data ?? [];
        const rows = (Array.isArray(raw) ? raw : []).map(normalizeAdminListEvent).filter(Boolean);
        setExperiences(rows);
        const t = Number(response.total ?? 0);
        setTotal(Number.isFinite(t) && t >= 0 ? t : rows.length);
        const tp = Number(response.totalPages);
        if (Number.isFinite(tp) && tp >= 1) setTotalPages(tp);
        else {
          const tot = Number.isFinite(t) && t >= 0 ? t : rows.length;
          setTotalPages(Math.max(1, Math.ceil(tot / LIMIT)));
        }
        setLoading(false);
      },
      onError(err) {
        setExperiences([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const handleConfirm = () => {
    if (!confirm) return;
    setActionLoading(true);
    const pause = confirm.type === 'pause';
    const eventId = confirm.experience.id;
    callApi({
      method: Method.PATCH,
      endPoint: pause ? api.pauseAdminEvent(eventId) : api.resumeAdminEvent(eventId),
      bodyParams: pause ? defaultPauseBody() : { notifyTicketHolders: false },
      onSuccess(response) {
        setActionLoading(false);
        setConfirm(null);
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : pause
              ? 'Event paused successfully.'
              : 'Event resumed successfully.';
        notifySuccess(msg);
        fetchExperiences();
      },
      onError(err) {
        setActionLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  };

  const columns = [
    {
      key: 'title',
      label: 'Experience',
      wrap: true,
      render: (_, row) => {
        const name = formatNameForCell(row.title);
        const place = formatNameForCell(row.location);
        const cat = String(row.category ?? '').trim() || '—';
        return (
          <div>
            <p
              style={{ fontWeight: 500, fontSize: 13.5, margin: 0 }}
              title={name.title}
            >
              {name.text}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {cat}
              {' · '}
              <span title={place.title}>{place.text}</span>
            </p>
          </div>
        );
      },
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (_, row) => {
        const p = formatNameForCell(row.provider?.businessName ?? '—');
        return (
          <span style={{ fontSize: 12.5 }} title={p.title}>
            {p.text}
          </span>
        );
      },
    },
    {
      key: 'experienceType',
      label: 'Experience type',
      render: (_, row) => (
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {formatExperienceTypeLabel(row)}
        </span>
      ),
    },
    {
      key: 'ticketsSold',
      label: 'Tickets sold',
      align: 'center',
      render: (v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v ?? 0}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <StatusBadge status={getExperienceStatus(row)} />,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      width: '112px',
      render: (_, row) => {
        const viewBtn = (
          <button
            type="button"
            title="View details"
            aria-label="View experience details"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/experiences/${row.id}`);
            }}
            style={ab('var(--primary-light)', 'var(--primary)')}
          >
            <Eye size={13} aria-hidden />
          </button>
        );
        const s = getExperienceStatus(row);
        if (s === 'completed' && !isEventPaused(row)) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              {viewBtn}
              <span
                title="Completed"
                aria-label="Completed"
                style={ab('rgba(108,108,112,0.12)', 'var(--text-secondary)', 'default')}
              >
                <CheckCircle size={13} aria-hidden />
              </span>
            </div>
          );
        }
        const showUnpause = canResumeEvent(row);
        const showPause = canPauseEvent(row);
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            {viewBtn}
            {showUnpause ? (
              <button
                type="button"
                title="Unpause experience"
                aria-label="Unpause experience"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ type: 'resume', experience: row });
                }}
                style={ab('var(--success-bg)', 'var(--success)')}
              >
                <PlayCircle size={14} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
            {showPause ? (
              <button
                type="button"
                title="Pause experience"
                aria-label="Pause experience"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ type: 'pause', experience: row });
                }}
                style={ab('var(--warning-bg)', 'var(--warning)')}
              >
                <ShieldOff size={13} />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Experiences">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search experiences or provider…"
          style={{ flex: '1 1 240px', maxWidth: 380, minWidth: 160 }}
        />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 180, flexShrink: 0 }} />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={experiences}
        isLoading={loading}
        emptyMessage="No experiences found."
        rowKey="id"
        onRowClick={(row) => navigate(`/experiences/${row.id}`)}
      />
      <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !actionLoading && setConfirm(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        variant={confirm?.type === 'resume' ? 'primary' : 'danger'}
        title={confirm?.type === 'resume' ? 'Unpause experience?' : 'Pause experience?'}
        confirmLabel={confirm?.type === 'resume' ? 'Unpause' : 'Pause'}
        message={
          confirm?.type === 'resume'
            ? `Resume "${confirm?.experience?.title ?? ''}"?`
            : `Pause "${confirm?.experience?.title ?? ''}"? This cancels active tickets and notifies holders (per server rules).`
        }
      />
    </div>
  );
}

export default ExperiencesPage;
