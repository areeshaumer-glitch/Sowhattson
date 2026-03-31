import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, FilePenLine, Pause, Play, Trash2, XCircle } from 'lucide-react';
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

const MOCK = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  title: ['Afrobeats Night','Jazz & Wine','Tech Summit','Comedy Fiesta','Food Festival','Art Gallery Night','Yoga Retreat','Business Mixer','Film Festival','Dance Battle','Wine Tasting','Street Carnival','Book Fair','Fashion Show','Sports Day'][i],
  category: ['nightlife','concert','conference','theatre','food','arts','wellness','networking','film','dance','food','nightlife','education','fashion','sports'][i],
  tags: ['Afrobeats','Classy'],
  status: ['active','active','completed','active','active','draft','active','active','completed','active','active','paused','active','active','completed'][i],
  startDate: `2026-0${Math.floor(i/5)+1}-${10+(i%10)}`,
  location: ['Lagos','Abuja','Lagos','Port Harcourt','Lagos'][i%5],
  price: 3000 + i * 1000,
  ticketsSold: 50 + i * 30,
  provider: { id: String(i+1), name:`Provider ${i+1}`, businessName:`BizName ${i+1}` },
  createdAt: '2026-01-10', updatedAt: '2026-03-01',
}));

const STATUS_OPTIONS = [
  { label:'All Status', value:'' }, { label:'Active', value:'active' },
  { label:'Paused', value:'paused' }, { label:'Completed', value:'completed' },
  { label:'Cancelled', value:'cancelled' }, { label:'Draft', value:'draft' },
];

const ab = (bg, color, cursor = 'pointer') => ({
  width:28, height:28, borderRadius:'var(--radius-sm)',
  display:'flex', alignItems:'center', justifyContent:'center',
  background:bg, border:'none', cursor, color,
});

function ExperiencesPage() {
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
          (status === '' || e.status === status),
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
    const endpoint = confirm.type === 'delete' ? api.deleteAdminEvent(confirm.experience.id)
      : confirm.type === 'pause' ? api.pauseAdminEvent(confirm.experience.id)
      : api.resumeAdminEvent(confirm.experience.id);
    const method = confirm.type === 'delete' ? Method.DELETE : Method.POST;

    callApi({
      method, endPoint: endpoint,
      onSuccess() { applyAction(); },
      onError()   { applyAction(); },
    });
  };

  const applyAction = () => {
    if (!confirm) return;
    if (confirm.type === 'delete') {
      setExperiences((prev) => prev.filter((e) => e.id !== confirm.experience.id));
      setTotal((t) => t - 1);
    } else {
      setExperiences((prev) => prev.map((e) => e.id !== confirm.experience.id ? e : {
        ...e, status: confirm.type === 'pause' ? 'paused' : 'active',
      }));
    }
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
    { key:'startDate', label:'Date', render:(v) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{v}</span> },
    { key:'ticketsSold', label:'Tickets', align:'center', render:(v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v ?? 0}</span> },
    { key:'price', label:'Price', render:(v) => <span style={{ fontWeight:600, color:'var(--primary)', fontSize:13 }}>₦{(v||0).toLocaleString()}</span> },
    { key:'status', label:'Status', render:(v) => <StatusBadge status={v} /> },
    {
      key:'actions', label:'Action', align:'center', width:'120px',
      render:(_, row) => (
        <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
          {row.status === 'active' && (
            <button type="button" aria-label="Pause experience" onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'pause', experience: row }); }} style={ab('var(--warning-bg)', 'var(--warning)')}>
              <Pause size={12} />
            </button>
          )}
          {row.status === 'paused' && (
            <button type="button" aria-label="Resume experience" onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'resume', experience: row }); }} style={ab('var(--success-bg)', 'var(--success)')}>
              <Play size={12} />
            </button>
          )}
          {row.status === 'completed' && (
            <span title="Completed" aria-label="Completed" style={ab('rgba(108,108,112,0.12)', 'var(--text-secondary)', 'default')}>
              <CheckCircle size={12} aria-hidden />
            </span>
          )}
          {row.status === 'draft' && (
            <span title="Draft" aria-label="Draft" style={ab('var(--primary-light)', 'var(--primary)', 'default')}>
              <FilePenLine size={12} aria-hidden />
            </span>
          )}
          {['cancelled', 'canceled'].includes(String(row.status).toLowerCase()) && (
            <span title="Cancelled" aria-label="Cancelled" style={ab('rgba(117, 79, 128, 0.16)', '#6E4578', 'default')}>
              <XCircle size={12} aria-hidden />
            </span>
          )}
          <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setConfirm({ type: 'delete', experience: row }); }} style={ab('var(--danger-bg)', 'var(--danger)')}>
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Experiences">
        <SearchBar value={search} onChange={setSearch} placeholder="Search experiences…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={experiences} isLoading={loading} emptyMessage="No experiences found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleConfirm} loading={actionLoading}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        title={confirm?.type === 'delete' ? 'Delete Experience' : confirm?.type === 'pause' ? 'Pause Experience' : 'Resume Experience'}
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : confirm?.type === 'pause' ? 'Pause' : 'Resume'}
        message={`Are you sure you want to ${confirm?.type} "${confirm?.experience.title}"?`}
      />
    </div>
  );
}

export default ExperiencesPage;
