import { useState, useEffect, useCallback } from 'react';
import { EyeOff, Eye, Trash2 } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';

const MOCK = Array.from({ length:24 }, (_,i) => ({
  id:String(i+1), rating:Math.floor(Math.random()*3)+3,
  comment:['Great experience, loved the vibes!','Amazing experience!','Could be better organised.','Definitely coming back!','Not worth the price.'][i%5],
  user:{ id:String(i+1), name:['Amara Osei','Fatima Ali','Kwame Mensah','Zara Diallo','Emeka Uba'][i%5] },
  event:{ id:String(i+1), title:['Afrobeats Night','Jazz & Wine','Tech Summit','Comedy Fiesta','Food Festival'][i%5] },
  provider:{ id:String(i+1), name:['TxEvents','LuxEvents','PrimeShow','TechHub','GastroPro'][i%5] },
  status:['visible','visible','flagged','visible','hidden'][i%5],
  createdAt:`2026-03-${String(1+(i%27)).padStart(2,'0')}`,
}));

const STATUS_OPTIONS = [
  { label:'All Status', value:'' }, { label:'Visible', value:'visible' },
  { label:'Hidden',     value:'hidden' }, { label:'Flagged', value:'flagged' },
];

const ab = (bg, color) => ({
  width:28, height:28, borderRadius:'var(--radius-sm)',
  display:'flex', alignItems:'center', justifyContent:'center',
  background:bg, border:'none', cursor:'pointer', color,
});

export default function ReviewsPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [reviews, setReviews]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [confirm, setConfirm]           = useState(null);
  const [actLoading, setActLoading]     = useState(false);
  const debouncedSearch                 = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchReviews = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminReviews(page, LIMIT, debouncedSearch, statusFilter),
      onSuccess(response) {
        setReviews(response.data ?? response.reviews ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((r) =>
          (r.user.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
           r.event.title.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
          (statusFilter==='' || r.status===statusFilter),
        );
        setReviews(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const handleAction = () => {
    if (!confirm) return;
    setActLoading(true);
    const method = confirm.type === 'delete' ? Method.DELETE : Method.PATCH;
    const endpoint = confirm.type === 'delete' ? api.deleteAdminReview(confirm.review.id) : api.updateAdminReview(confirm.review.id);
    const body = confirm.type !== 'delete' ? { status: confirm.type === 'hide' ? 'hidden' : 'visible' } : undefined;

    callApi({
      method, endPoint: endpoint, bodyParams: body,
      onSuccess() { applyAction(); },
      onError()   { applyAction(); },
    });
  };

  const applyAction = () => {
    if (!confirm) return;
    if (confirm.type === 'delete') { setReviews((prev) => prev.filter((r) => r.id !== confirm.review.id)); setTotal((t) => t-1); }
    else { setReviews((prev) => prev.map((r) => r.id!==confirm.review.id ? r : { ...r, status: confirm.type==='hide'?'hidden':'visible' })); }
    setConfirm(null); setActLoading(false);
  };

  const stars = (n) => '★'.repeat(n)+'☆'.repeat(5-n);

  const columns = [
    {
      key:'user', label:'Explorer',
      render:(_,row) => <div><p style={{ fontWeight:500, fontSize:13 }}>{row.user.name}</p><p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.createdAt}</p></div>,
    },
    { key:'event', label:'Experience', render:(_,row) => <span style={{ fontSize:12.5 }}>{row.event.title}</span> },
    { key:'rating', label:'Rating', render:(v) => <span style={{ color:'var(--warning)', fontSize:13, letterSpacing:1 }}>{stars(v)}</span> },
    {
      key:'comment', label:'Comment',
      render:(v) => <span style={{ fontSize:12.5, color:'var(--text-secondary)', maxWidth:200, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v||'—'}</span>,
    },
    {
      key:'actions', label:'Action', align:'center', width:'100px',
      render:(_,row) => (
        <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
          {row.status!=='hidden'
            ? <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'hide',review:row}); }} style={ab('var(--warning-bg)','var(--warning)')}><EyeOff size={13}/></button>
            : <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'show',review:row}); }} style={ab('var(--success-bg)','var(--success)')}><Eye size={13}/></button>
          }
          <button onClick={(e)=>{ e.stopPropagation(); setConfirm({type:'delete',review:row}); }} style={ab('var(--danger-bg)','var(--danger)')}><Trash2 size={13}/></button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Reviews">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by explorer or experience…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={reviews} isLoading={loading} emptyMessage="No reviews found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
      <ConfirmModal
        isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} loading={actLoading}
        variant={confirm?.type==='delete'?'danger':'primary'}
        title={confirm?.type==='delete'?'Delete Review':confirm?.type==='hide'?'Hide Review':'Show Review'}
        confirmLabel={confirm?.type==='delete'?'Delete':confirm?.type==='hide'?'Hide':'Show'}
        message={`Are you sure you want to ${confirm?.type} this review by "${confirm?.review.user.name}"?`}
      />
    </div>
  );
}
