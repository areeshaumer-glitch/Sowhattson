import { useState, useEffect, useCallback } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';

const MOCK = Array.from({ length: 22 }, (_, i) => ({
  id: String(i+1), eventId: String(Math.floor(i/3)+1),
  eventTitle: ['Afrobeats Night','Jazz & Wine','Tech Summit','Comedy Fiesta','Food Festival','Art Gallery','Yoga Retreat','Business Mixer'][i%8],
  userId: String(i+100),
  userName: ['Amara Osei','Fatima Ali','Kwame Mensah','Zara Diallo','Emeka Uba','Nkechi Obi','Bolu Adeyemi','Tunde James'][i%8],
  ticketType: ['VIP','Standard','Early Bird'][i%3],
  status: ['confirmed','completed','confirmed','refunded','confirmed','pending','completed','confirmed','confirmed','confirmed','confirmed','confirmed','refunded','confirmed','completed','pending','confirmed','confirmed','confirmed','confirmed','confirmed','confirmed'][i],
  amount: 3000 + (i%5)*2000,
  purchasedAt: `2026-03-${String(1+(i%27)).padStart(2,'0')}`,
  eventDate:   `2026-04-${String(1+(i%28)).padStart(2,'0')}`,
}));

const STATUS_OPTIONS = [
  { label:'All Status',  value:'' }, { label:'Confirmed', value:'confirmed' },
  { label:'Completed',   value:'completed' },
  { label:'Pending',     value:'pending' },
  { label:'Refunded',    value:'refunded' },
];

export default function TicketsPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const debouncedSearch       = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchTickets = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminTickets(page, LIMIT, debouncedSearch, status),
      onSuccess(response) {
        setTickets(response.data ?? response.tickets ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((t) =>
          (t.userName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
           t.eventTitle.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
          (status === '' || t.status === status),
        );
        setTickets(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, status]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  const columns = [
    {
      key:'userName', label:'Explorer',
      render: (_, row) => <span style={{ fontWeight: 500, fontSize: 13.5 }}>{row.userName}</span>,
    },
    { key:'eventTitle', label:'Experience', render:(v) => <span style={{ fontSize:13, fontWeight:500 }}>{v}</span> },
    { key:'ticketType', label:'Type', render:(v) => <Badge color={v==='VIP'?'primary':'neutral'} style={{ fontWeight:500 }}>{v}</Badge> },
    { key:'amount', label:'Amount', render:(v) => <span style={{ color:'var(--primary)', fontSize:13, fontWeight:500 }}>₦{v.toLocaleString()}</span> },
    { key:'status', label:'Status', render:(v) => <StatusBadge status={v} /> },
    { key:'purchasedAt', label:'Purchased', render:(v) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{v}</span> },
    { key:'eventDate',   label:'Experience Date', render:(v) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{v}</span> },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Tickets">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by explorer or experience…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={tickets} isLoading={loading} emptyMessage="No tickets found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
    </div>
  );
}
