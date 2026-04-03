import { useState, useEffect, useCallback } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';

const MOCK = Array.from({ length:28 }, (_,i) => ({
  id:String(i+1),
  name:['Amara Osei','Fatima Ali','Kwame Mensah','Zara Diallo','Emeka Uba','Nkechi Obi','Bolu Adeyemi','Tunde James','Sola Adebayo','Kemi Ojo'][i%10],
  email:`explorer${i+1}@example.com`,
  role:'explorer',
  isVerified:i%4!==0,
  ticketsCount:Math.floor(Math.random()*20),
  createdAt:`2025-${String((i%12)+1).padStart(2,'0')}-10`,
}));

export default function ExplorersPage() {
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [explorers, setExplorers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const debouncedSearch           = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchExplorers = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminUsers(page, LIMIT, debouncedSearch, 'explorer'),
      onSuccess(response) {
        setExplorers(response.data ?? response.users ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((u) =>
          u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.email.toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
        setExplorers(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch]);

  useEffect(() => { fetchExplorers(); }, [fetchExplorers]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const columns = [
    {
      key: 'name',
      label: 'Explorer',
      render: (v) => <span style={{ fontWeight: 500, fontSize: 13.5 }}>{v}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v || '—'}</span>,
    },
    { key:'ticketsCount', label:'Tickets', align:'center', render:(v) => <span style={{ fontSize:13, fontWeight:500 }}>{v}</span> },
    { key:'isVerified', label:'Verified', align:'center', render:(v) => <Badge color={v?'success':'warning'} dot style={{ fontWeight:500 }}>{v?'Yes':'No'}</Badge> },
    { key:'createdAt', label:'Joined', render:(v) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{v}</span> },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Explorers">
        <SearchBar value={search} onChange={setSearch} placeholder="Search explorers…" style={{ flex:'1 1 240px', maxWidth:380, minWidth:160 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={explorers} isLoading={loading} emptyMessage="No explorers found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
    </div>
  );
}
