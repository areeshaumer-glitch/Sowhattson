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
import { MOCK_PROVIDERS } from './mockProviders';

const VERIFY_OPTIONS = [
  { label: 'All Providers', value: '' }, { label: 'Verified', value: 'verified' },
  { label: 'Pending', value: 'pending' }, { label: 'Rejected', value: 'rejected' },
];

const ab = (bg, color) => ({
  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: bg, border: 'none', cursor: 'pointer', color,
});

function isSuspended(row) {
  return row.suspended === true || row.status === 'suspended';
}

export default function ProvidersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actLoading, setActLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchProviders = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminProviders(page, LIMIT, debouncedSearch),
      onSuccess(response) {
        const raw = response.data ?? response.providers ?? [];
        setProviders(
          raw.map((p) => ({
            ...p,
            suspended: p.suspended === true || p.status === 'suspended',
          })),
        );
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK_PROVIDERS.filter((p) =>
          (p.businessName.toLowerCase().includes(debouncedSearch.toLowerCase())
            || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
          && (verifyFilter === '' || p.verificationStatus === verifyFilter),
        );
        setProviders(filtered.slice((page - 1) * LIMIT, page * LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, verifyFilter]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);
  useEffect(() => { setPage(1); }, [debouncedSearch, verifyFilter]);

  const handleConfirmAction = () => {
    if (!confirm) return;
    setActLoading(true);
    const { type, prov } = confirm;
    const suspend = type === 'suspend';
    callApi({
      method: Method.PATCH,
      endPoint: suspend ? api.suspendAdminProvider(prov.id) : api.activateAdminProvider(prov.id),
      onSuccess() { applyStatusChange(suspend); },
      onError() { applyStatusChange(suspend); },
    });
  };

  const applyStatusChange = (nowSuspended) => {
    if (!confirm) return;
    const id = confirm.prov.id;
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, suspended: nowSuspended } : p)));
    setConfirm(null);
    setActLoading(false);
  };

  const columns = [
    {
      key: 'businessName',
      label: 'Provider',
      render: (_, row) => (
        <div>
          <p style={{ fontWeight: 500, fontSize: 13.5 }}>{row.businessName}</p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{row.name}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v || '—'}</span>,
    },
    {
      key: 'region',
      label: 'Region',
      render: (_, row) => {
        const r = row.region ?? row.country;
        return <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{r || '—'}</span>;
      },
    },
    { key: 'eventsCount', label: 'Experiences', align: 'center', render: (v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span> },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (v) => <span style={{ color: 'var(--primary)', fontWeight: 500 }}>₦{v.toLocaleString()}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (v) => <span style={{ color: 'var(--warning)', fontWeight: 500 }}>★ {v.toFixed(1)}</span>,
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
              onClick={(e) => { e.stopPropagation(); navigate(`/providers/${row.id}`); }}
              style={ab('var(--primary-light)', 'var(--primary)')}
            >
              <Eye size={13} />
            </button>
            {suspended ? (
              <button
                type="button"
                title="Reactivate provider"
                onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'unsuspend', prov: row }); }}
                style={ab('var(--success-bg)', 'var(--success)')}
              >
                <ShieldCheck size={13} />
              </button>
            ) : (
              <button
                type="button"
                title="Suspend provider"
                onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'suspend', prov: row }); }}
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
        <Select value={verifyFilter} onChange={setVerifyFilter} options={VERIFY_OPTIONS} style={{ width: 180, flexShrink: 0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={providers} isLoading={loading} emptyMessage="No providers found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirmAction}
        loading={actLoading}
        variant={confirm?.type === 'unsuspend' ? 'primary' : 'danger'}
        title={confirm?.type === 'unsuspend' ? 'Reactivate provider' : 'Suspend provider'}
        confirmLabel={confirm?.type === 'unsuspend' ? 'Reactivate' : 'Suspend'}
        message={
          confirm?.type === 'unsuspend'
            ? `Restore "${confirm?.prov.businessName}" so they can operate again?`
            : `Are you sure you want to suspend "${confirm?.prov.businessName}"?`
        }
      />
    </div>
  );
}
