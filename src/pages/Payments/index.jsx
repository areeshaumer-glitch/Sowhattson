import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CheckCircle, Clock, XCircle, Undo2 } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge, statusColor } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { formatStatusLabel } from '../../utils/formatStatusLabel';

const MOCK = Array.from({ length:30 }, (_,i) => ({
  id:String(i+1), reference:`PSK-2026-${String(i+1).padStart(4,'0')}`,
  amount:(1+(i%8))*5000, currency:'NGN',
  status:['success','success','pending','success','failed','success','refunded','success','success','success'][i%10],
  user:{ id:String(i+1), name:['Amara Osei','Fatima Ali','Kwame Mensah','Zara Diallo','Emeka Uba'][i%5], email:`user${i}@example.com` },
  event:{ id:String(i+1), title:['Afrobeats Night','Jazz & Wine','Tech Summit','Comedy Fiesta','Food Festival'][i%5] },
  provider:{ id:String(i+1), name:['TxEvents','LuxEvents','PrimeShow','TechHub','GastroPro'][i%5] },
  paidAt:`2026-03-${String(1+(i%27)).padStart(2,'0')}`,
  createdAt:`2026-03-${String(1+(i%27)).padStart(2,'0')}`,
}));

const STATUS_OPTIONS = [
  { label:'All Status', value:'' }, { label:'Success', value:'success' },
  { label:'Pending',    value:'pending' }, { label:'Failed',  value:'failed' },
  { label:'Refunded',   value:'refunded' },
];

const PAYMENT_STATUS_VALUES = ['success', 'pending', 'failed', 'refunded'];

const paymentStatusIconProps = { size: 12, strokeWidth: 2.5 };
const menuIconProps = { size: 14, strokeWidth: 2.25 };

function paymentStatusIcon(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'success') return <CheckCircle {...paymentStatusIconProps} aria-hidden />;
  if (s === 'pending') return <Clock {...paymentStatusIconProps} aria-hidden />;
  if (s === 'failed') return <XCircle {...paymentStatusIconProps} aria-hidden />;
  if (s === 'refunded') return <Undo2 {...paymentStatusIconProps} aria-hidden />;
  return undefined;
}

function menuStatusIcon(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'success') return <CheckCircle {...menuIconProps} aria-hidden />;
  if (s === 'pending') return <Clock {...menuIconProps} aria-hidden />;
  if (s === 'failed') return <XCircle {...menuIconProps} aria-hidden />;
  if (s === 'refunded') return <Undo2 {...menuIconProps} aria-hidden />;
  return null;
}

const colorMapStyles = {
  success: { bg: 'var(--success-bg)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
  danger:  { bg: 'var(--danger-bg)',  fg: 'var(--danger)' },
  info:    { bg: 'var(--info-bg)',    fg: 'var(--info)' },
  neutral: { bg: 'rgba(108,108,112,0.12)', fg: 'var(--text-secondary)' },
  primary: { bg: 'var(--primary-light)', fg: 'var(--primary)' },
  cancelled: { bg: 'rgba(117, 79, 128, 0.16)', fg: '#6E4578' },
};

function PaymentStatusMenu({ row, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const menuW = 208;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - menuW - 8));
      setCoords({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const toggle = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };

  const pick = (e, value) => {
    e.stopPropagation();
    close();
    if (value !== row.status) onStatusChange(row, value);
  };

  const current = String(row.status ?? '').toLowerCase();

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={btnRef}
        type="button"
        title="Change payment status"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
        style={{
          width: 32,
          height: 28,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background: 'var(--primary-light)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--primary)',
        }}
      >
        <ChevronDown size={14} strokeWidth={2.25} style={{ opacity: 0.9 }} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Payment status"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 10000,
            minWidth: 200,
            maxWidth: 280,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: 6,
          }}
        >
          {PAYMENT_STATUS_VALUES.map((value) => {
            const active = current === value;
            const c = statusColor(value);
            const { bg, fg } = colorMapStyles[c] || colorMapStyles.neutral;
            return (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={(e) => pick(e, value)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  marginBottom: 2,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  textAlign: 'left',
                  background: active ? bg : 'transparent',
                  color: active ? fg : 'var(--text-primary)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', color: active ? fg : 'var(--text-secondary)' }}>{menuStatusIcon(value)}</span>
                <span style={{ flex: 1 }}>{formatStatusLabel(value)}</span>
                {active && <span style={{ fontSize: 11, color: fg, fontWeight: 600 }}>Current</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]                 = useState(1);
  const [payments, setPayments]         = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const debouncedSearch                 = useDebounce(search, 350);
  const LIMIT = 10;

  const fetchPayments = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminPayments(page, LIMIT, debouncedSearch, statusFilter),
      onSuccess(response) {
        setPayments(response.data ?? response.payments ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK.filter((p) =>
          (p.user.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
           p.reference.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
           p.event.title.toLowerCase().includes(debouncedSearch.toLowerCase())) &&
          (statusFilter==='' || p.status===statusFilter),
        );
        setPayments(filtered.slice((page-1)*LIMIT, page*LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const handleStatusChange = useCallback((row, status) => {
    callApi({
      method: Method.PATCH,
      endPoint: api.updateAdminPayment(row.id),
      bodyParams: { status },
      onSuccess() {
        setPayments((prev) => prev.map((p) => (p.id === row.id ? { ...p, status } : p)));
      },
      onError() {
        setPayments((prev) => prev.map((p) => (p.id === row.id ? { ...p, status } : p)));
      },
    });
  }, []);

  const columns = [
    {
      key:'user', label:'Explorer',
      render:(_,row) => <div><p style={{ fontSize:13, fontWeight:500 }}>{row.user.name}</p><p style={{ fontSize:11, color:'var(--text-muted)' }}>{row.user.email}</p></div>,
    },
    { key:'event',    label:'Experience',    render:(_,row) => <span style={{ fontSize:12.5, fontWeight:500 }}>{row.event.title}</span> },
    { key:'provider', label:'Provider', render:(_,row) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{row.provider.name}</span> },
    {
      key:'amount', label:'Amount',
      render:(v,row) => (
        <span style={{ color:'var(--primary)', fontSize:13, fontWeight:500 }}>
          ₦{v.toLocaleString()}{' '}
          <span style={{ fontSize:10.5, fontWeight:400, color:'var(--text-muted)' }}>{row.currency}</span>
        </span>
      ),
    },
    {
      key:'status',
      label:'Status',
      render:(v) => <StatusBadge status={v} icon={paymentStatusIcon(v)} />,
    },
    { key:'paidAt', label:'Date', render:(v) => <span style={{ fontSize:12, color:'var(--text-muted)' }}>{v||'—'}</span> },
    // {
    //   key:'actions', label:'Action', align:'center', width:'88px',
    //   render:(_,row) => (
    //     <PaymentStatusMenu row={row} onStatusChange={handleStatusChange} />
    //   ),
    // },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Payments">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by explorer or experience…" style={{ flex:'1 1 240px', maxWidth:420, minWidth:160 }} />
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} style={{ width:160, flexShrink:0 }} />
      </ListPageToolbar>
      <DataTable columns={columns} data={payments} isLoading={loading} emptyMessage="No payments found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total/LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />
    </div>
  );
}
