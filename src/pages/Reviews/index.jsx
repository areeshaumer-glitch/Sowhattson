import { useState, useEffect, useCallback } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
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

export default function ReviewsPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [reviews, setReviews]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
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
        const q = debouncedSearch.toLowerCase();
        const filtered = MOCK.filter((r) =>
          (r.user.name.toLowerCase().includes(q) ||
            (r.comment && r.comment.toLowerCase().includes(q))) &&
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

  const stars = (n) => {
    const r = Math.min(5, Math.max(0, Number(n) || 0));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  const colQ = { width: '25%' };

  const columns = [
    {
      key: 'user',
      label: 'Explorer',
      ...colQ,
      render: (_, row) => (
        <span style={{ fontWeight: 500, fontSize: 13 }}>{row.user?.name ?? row.userName ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      ...colQ,
      render: (_, row) => {
        const d = row.createdAt ?? row.created_at ?? row.date;
        return <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{d ?? '—'}</span>;
      },
    },
    {
      key: 'rating', label: 'Rating', ...colQ, align: 'center',
      render: (v) => <span style={{ color: 'var(--warning)', fontSize: 13, letterSpacing: 1 }}>{stars(v)}</span>,
    },
    {
      key: 'comment', label: 'Comment', ...colQ, wrap: true,
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{v || '—'}</span>,
    },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Reviews">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by explorer or comment…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={reviews}
        isLoading={loading}
        emptyMessage="No reviews found."
        rowKey="id"
        fixedLayout
        minWidth={640}
      />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
    </div>
  );
}
