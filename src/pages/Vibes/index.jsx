import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { PresignedImage } from '../../components/ui/PresignedImage';

const MOCK = Array.from({ length:20 }, (_,i) => ({
  id:String(i+1), mediaUrl:`https://picsum.photos/seed/${i+1}/200/200`,
  mediaType: i%3===0 ? 'video' : 'image',
  caption:['Night fire vibes 🔥','Stage is set 🎶','Pre-show prep!','We going live!','VIP lounge ready'][i%5],
  provider:{ id:String(i+1), name:`Provider ${i+1}`, businessName:`BizName ${i+1}` },
  event: i%2===0 ? { id:String(i+1), title:['Afrobeats Night','Jazz & Wine','Tech Summit'][i%3] } : undefined,
  isAdminVerified:i%3!==0, isDeleted:i%10===0,
  reactionsCount:Math.floor(Math.random()*500),
  viewsCount:Math.floor(Math.random()*2000+100),
  createdAt:`2026-03-${String(1+(i%27)).padStart(2,'0')}`,
}));

const STATUS_OPTIONS = [
  { label:'All Vibes', value:'' }, { label:'Approved', value:'approved' },
  { label:'Pending',   value:'pending' }, { label:'Deleted', value:'deleted' },
];

const ab = (bg, color) => ({
  width:28, height:28, borderRadius:'var(--radius-sm)',
  display:'flex', alignItems:'center', justifyContent:'center',
  background:bg, border:'none', cursor:'pointer', color,
});

export default function VibesPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [vibes, setVibes]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [confirm, setConfirm]           = useState(null);
  const [actLoading, setActLoading]     = useState(false);
  const debouncedSearch                 = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchVibes = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminVibes(page, LIMIT, debouncedSearch, statusFilter),
      onSuccess(response) {
        setVibes(response.data ?? response.vibes ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((v) =>
          ((v.caption??'').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
           v.provider.businessName.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
          (statusFilter==='' ||
            (statusFilter==='approved' && v.isAdminVerified && !v.isDeleted) ||
            (statusFilter==='pending'  && !v.isAdminVerified && !v.isDeleted) ||
            (statusFilter==='deleted'  && v.isDeleted)),
        );
        setVibes(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchVibes(); }, [fetchVibes]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const handleAction = () => {
    if (!confirm) return;
    setActLoading(true);
    const method = confirm.type === 'delete' ? Method.DELETE : Method.PATCH;
    const endpoint = confirm.type === 'delete' ? api.deleteAdminVibe(confirm.vibe.id) : api.updateAdminVibe(confirm.vibe.id);
    const body = confirm.type !== 'delete' ? { isAdminVerified: confirm.type === 'approve' } : undefined;

    callApi({
      method, endPoint: endpoint, bodyParams: body,
      onSuccess() { applyAction(); },
      onError()   { applyAction(); },
    });
  };

  const applyAction = () => {
    if (!confirm) return;
    setVibes((prev) => prev.map((v) => v.id !== confirm.vibe.id ? v : {
      ...v,
      isAdminVerified: confirm.type === 'approve',
      isDeleted: confirm.type === 'delete' ? true : v.isDeleted,
    }));
    setConfirm(null); setActLoading(false);
  };

  const columns = [
    {
      key:'media', label:'Media',
      render:(_,row) => (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', background:'var(--border)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {row.mediaType==='image'
              ? <PresignedImage src={row.mediaUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <Eye size={16} color="var(--text-muted)" />}
          </div>
          <div>
            <p style={{ fontSize:12.5, fontWeight:500 }}>{row.caption||'—'}</p>
            <p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.mediaType}</p>
          </div>
        </div>
      ),
    },
    { key:'provider', label:'Provider', render:(_,row) => <span style={{ fontSize:12.5 }}>{row.provider.businessName}</span> },
    { key:'event', label:'Experience', render:(_,row) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{row.event?.title||'—'}</span> },
    { key:'viewsCount', label:'Views', align:'center', render:(v) => <span style={{ fontSize:12.5, fontWeight:500 }}>{v.toLocaleString()}</span> },
    { key:'reactionsCount', label:'Reactions', align:'center', render:(v) => <span style={{ fontSize:12.5, fontWeight:500 }}>{v.toLocaleString()}</span> },
    {
      key:'status', label:'Status',
      render:(_,row) => row.isDeleted ? <Badge color="danger" dot style={{ fontWeight:500 }}>Deleted</Badge>
        : row.isAdminVerified ? <Badge color="success" dot style={{ fontWeight:500 }}>Approved</Badge>
        : <Badge color="warning" dot style={{ fontWeight:500 }}>Pending</Badge>,
    },
    { key:'createdAt', label:'Posted', render:(v) => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{v}</span> },
    {
      key:'actions', label:'Action', align:'center', width:'100px',
      render:(_,row) => !row.isDeleted ? (
        <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
          {!row.isAdminVerified && <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'approve',vibe:row}); }} style={ab('var(--success-bg)','var(--success)')}><CheckCircle size={13}/></button>}
          {row.isAdminVerified  && <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'reject',vibe:row}); }}  style={ab('var(--warning-bg)','var(--warning)')}><XCircle size={13}/></button>}
          <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'delete',vibe:row}); }} style={ab('var(--danger-bg)','var(--danger)')}><Trash2 size={13}/></button>
        </div>
      ) : null,
    },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Vibes">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by caption or provider…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={vibes} isLoading={loading} emptyMessage="No vibes found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} loading={actLoading}
        variant={confirm?.type==='delete'||confirm?.type==='reject'?'danger':'primary'}
        title={confirm?.type==='approve'?'Approve Vibe':confirm?.type==='reject'?'Revoke Approval':'Delete Vibe'}
        confirmLabel={confirm?.type==='approve'?'Approve':confirm?.type==='reject'?'Revoke':'Delete'}
        message={`Are you sure you want to ${confirm?.type} this vibe?`}
      />
    </div>
  );
}
