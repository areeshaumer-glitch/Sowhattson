import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, ShieldOff, ShieldCheck } from 'lucide-react';
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
import { formatExperienceTypeLabel, getExperienceStatus, MOCK_EXPERIENCE_STATUSES } from '../../utils/experienceType';

const MOCK = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  title: ['Afrobeats Night','Jazz & Wine','Tech Summit','Comedy Fiesta','Food Festival','Art Gallery Night','Yoga Retreat','Business Mixer','Film Festival','Dance Battle','Wine Tasting','Street Carnival','Book Fair','Fashion Show','Sports Day'][i],
  category: ['nightlife','concert','conference','theatre','food','arts','wellness','networking','film','dance','food','nightlife','education','fashion','sports'][i],
  tags: ['Afrobeats','Classy'],
  status: MOCK_EXPERIENCE_STATUSES[i],
  location: ['Lagos','Abuja','Lagos','Port Harcourt','Lagos'][i%5],
  ticketsSold: 50 + i * 30,
  experienceType: i % 3 === 0 ? 'recurring' : 'one_time',
  provider: { id: String(i+1), name:`Provider ${i+1}`, businessName:`BizName ${i+1}` },
  createdAt: '2026-01-10', updatedAt: '2026-03-01',
}));

const STATUS_OPTIONS = [
  { label:'All Status', value:'' }, { label:'Active', value:'active' },
  { label:'Paused', value:'paused' }, { label:'Completed', value:'completed' },
];

const ab = (bg, color, cursor = 'pointer') => ({
  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: bg, border: 'none', cursor, color,
});

function isPaused(row) {
  return getExperienceStatus(row) === 'paused';
}

function ExperiencesPage() {
  const navigate = useNavigate();
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);
  const [experiences, setExperiences] = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [confirm, setConfirm]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const debouncedSearch             = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchExperiences = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminEvents(page, LIMIT, debouncedSearch, status),
      onSuccess(response) {
        setExperiences(response.data ?? response.events ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((e) =>
          e.title.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
          (status === '' || getExperienceStatus(e) === status),
        );
        setExperiences(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, status]);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);
  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  const handleConfirm = () => {
    if (!confirm) return;
    setActionLoading(true);
    const pause = confirm.type === 'pause';
    callApi({
      method: Method.POST,
      endPoint: pause ? api.pauseAdminEvent(confirm.experience.id) : api.resumeAdminEvent(confirm.experience.id),
      onSuccess() { applyPauseResume(pause); },
      onError() { applyPauseResume(pause); },
    });
  };

  const applyPauseResume = (nowPaused) => {
    if (!confirm) return;
    const id = confirm.experience.id;
    setExperiences((prev) => prev.map((e) => (e.id === id ? { ...e, status: nowPaused ? 'paused' : 'active' } : e)));
    setConfirm(null);
    setActionLoading(false);
  };

  const columns = [
    {
      key:'title', label:'Experience',
      render:(_, row) => (
        <div>
          <p style={{ fontWeight: 500, fontSize: 13.5 }}>{row.title}</p>
          <p style={{ fontSize:11.5, color:'var(--text-muted)' }}>{row.category} · {row.location}</p>
        </div>
      ),
    },
    { key:'provider', label:'Provider', render:(_, row) => <span style={{ fontSize:12.5 }}>{row.provider?.businessName}</span> },
    {
      key: 'experienceType',
      label: 'Experience type',
      render: (_, row) => (
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>{formatExperienceTypeLabel(row)}</span>
      ),
    },
    { key:'ticketsSold', label:'Tickets sold', align:'center', render:(v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v ?? 0}</span> },
    { key:'status', label:'Status', render:(_, row) => <StatusBadge status={getExperienceStatus(row)} /> },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      width: '104px',
      render: (_, row) => {
        const viewBtn = (
          <button
            type="button"
            title="View details"
            aria-label="View experience details"
            onClick={(e) => { e.stopPropagation(); navigate(`/experiences/${row.id}`); }}
            style={ab('var(--primary-light)', 'var(--primary)')}
          >
            <Eye size={13} aria-hidden />
          </button>
        );
        if (getExperienceStatus(row) === 'completed') {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              {viewBtn}
              <span title="Completed" aria-label="Completed" style={ab('rgba(108,108,112,0.12)', 'var(--text-secondary)', 'default')}>
                <CheckCircle size={13} aria-hidden />
              </span>
            </div>
          );
        }
        const paused = isPaused(row);
        return (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            {viewBtn}
            {paused ? (
              <button
                type="button"
                title="Reactivate experience"
                aria-label="Reactivate experience"
                onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'resume', experience: row }); }}
                style={ab('var(--success-bg)', 'var(--success)')}
              >
                <ShieldCheck size={13} />
              </button>
            ) : (
              <button
                type="button"
                title="Suspend experience"
                aria-label="Suspend experience"
                onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'pause', experience: row }); }}
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
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Experiences">
        <SearchBar value={search} onChange={setSearch} placeholder="Search experiences…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={experiences}
        isLoading={loading}
        emptyMessage="No experiences found."
        rowKey="id"
        onRowClick={(row) => navigate(`/experiences/${row.id}`)}
      />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={actionLoading}
        variant={confirm?.type === 'resume' ? 'primary' : 'danger'}
        title={confirm?.type === 'resume' ? 'Reactivate experience' : 'Suspend experience'}
        confirmLabel={confirm?.type === 'resume' ? 'Reactivate' : 'Suspend'}
        message={
          confirm?.type === 'resume'
            ? `Restore "${confirm?.experience.title}" so it can run again?`
            : `Are you sure you want to suspend "${confirm?.experience.title}"?`
        }
      />
    </div>
  );
}

export default ExperiencesPage;
