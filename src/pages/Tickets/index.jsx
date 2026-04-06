import { useState, useEffect, useCallback, useMemo } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';
import { formatNameForCell } from '../../utils/formatNameForCell';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';

const LIMIT = 10;
/** Client-side filter over a larger fetch when search is active (explorer / experience may not be server-filtered). */
const CLIENT_TICKET_SEARCH_LIMIT = 300;

function ticketRowMatchesQuery(row, qLower) {
  if (!qLower) return true;
  const hay = [row.userName, row.userEmail, row.eventTitle, row.ticketType, row.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(qLower);
}
/** Explorer column: name + email share this display cap; full value in `title` when truncated. */
const TICKETS_EXPLORER_DISPLAY_MAX = 15;
const TICKETS_EXPERIENCE_DISPLAY_MAX = 10;

function formatExplorerEmailForCell(email, maxLen = TICKETS_EXPLORER_DISPLAY_MAX) {
  const e = String(email ?? '').trim();
  if (!e) return { text: '', title: undefined };
  const n = Number(maxLen);
  const limit = Number.isFinite(n) && n > 0 ? Math.floor(n) : TICKETS_EXPLORER_DISPLAY_MAX;
  if (e.length <= limit) return { text: e, title: undefined };
  return { text: `${e.slice(0, limit)}...`, title: e };
}

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Expired', value: 'expired' },
  { label: 'Used', value: 'used' },
  { label: 'Completed', value: 'completed' },
];

function personName(obj) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj.name) return String(obj.name).trim();
  const parts = [obj.firstName, obj.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ').trim();
  return '';
}

function formatTicketDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(amount, currency) {
  const n = Number(amount);
  const amt = Number.isFinite(n) ? n : 0;
  const c = String(currency || 'NGN').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: c,
      maximumFractionDigits: 2,
    }).format(amt);
  } catch {
    return `${c} ${amt.toLocaleString()}`;
  }
}

function normalizeTicket(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row._id ?? row.id ?? '');
  if (!id) return null;

  const ev = row.event && typeof row.event === 'object' ? row.event : null;
  const user = row.user ?? row.explorer ?? row.buyer ?? row.customer;
  const prof = user && typeof user === 'object' && user.profile && typeof user.profile === 'object'
    ? user.profile
    : null;
  const tix = row.ticket && typeof row.ticket === 'object' ? row.ticket : null;
  const pay = row.payment && typeof row.payment === 'object' ? row.payment : null;
  const coupon = row.coupon && typeof row.coupon === 'object' ? row.coupon : null;

  const eventTitle = ev
    ? String(ev.title ?? ev.name ?? '').trim()
    : String(row.eventTitle ?? row.eventName ?? '').trim();

  let userName =
    String(row.customerName ?? '').trim()
    || String(pay?.customerName ?? '').trim()
    || (prof ? personName(prof) : '')
    || (user && typeof user === 'object' ? personName(user) : '')
    || String(row.userName ?? row.explorerName ?? '').trim();
  if (!userName) userName = '—';

  const userEmail =
    String(row.customerEmail ?? '').trim()
    || String(pay?.customerEmail ?? '').trim()
    || (user && typeof user === 'object' ? String(user.email ?? '').trim() : '');

  const ticketType = String(
    tix?.ticketName
    ?? row.ticketType
    ?? row.type
    ?? row.tier
    ?? row.category
    ?? '—',
  ).trim() || '—';

  const unit = Number(tix?.pricePerTicket ?? row.amount ?? row.price ?? row.totalAmount ?? row.total);
  const discount = Number(coupon?.discountAmount);
  const amount = Number.isFinite(unit)
    ? Math.max(0, unit - (Number.isFinite(discount) ? discount : 0))
    : 0;

  const currency = String(
    row.currency ?? tix?.currency ?? 'NGN',
  ).trim() || 'NGN';

  const status = String(row.ticketStatus ?? row.status ?? '').toLowerCase();

  const purchasedAt = formatTicketDate(
    row.purchasedAt ?? row.createdAt ?? row.bookedAt ?? row.paidAt,
  );
  const eventDate = formatTicketDate(
    row.eventDate ?? row.experienceDate ?? ev?.resolvedEventDate ?? ev?.startDateTime ?? ev?.startDate ?? ev?.date ?? ev?.eventDate,
  );

  return {
    id,
    userName,
    userEmail,
    eventTitle: eventTitle || '—',
    ticketType,
    amount,
    currency,
    amountLabel: formatMoney(amount, currency),
    status,
    purchasedAt,
    eventDate,
  };
}

export default function TicketsPage() {
  const [ticketSearch, setTicketSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const debouncedTicketSearch = useDebounce(ticketSearch, 350);
  const hasSearchQuery = debouncedTicketSearch.trim().length > 0;
  const requestPage = hasSearchQuery ? 1 : page;
  const requestLimit = hasSearchQuery ? CLIENT_TICKET_SEARCH_LIMIT : LIMIT;

  const loadTickets = useCallback(() => {
    setLoading(true);
    const q = debouncedTicketSearch.trim();
    callApi({
      method: Method.GET,
      endPoint: api.getAdminTickets(requestPage, requestLimit, status, q),
      onSuccess(response) {
        const raw = response.tickets ?? response.data ?? response.results ?? [];
        const rows = (Array.isArray(raw) ? raw : []).map(normalizeTicket).filter(Boolean);
        setTickets(rows);
        const t = Number(response.total ?? response.count ?? response.totalCount);
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
        setTickets([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, [requestPage, requestLimit, status, debouncedTicketSearch]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    setPage(1);
  }, [debouncedTicketSearch, status]);

  const queryLower = debouncedTicketSearch.trim().toLowerCase();

  const filteredTickets = useMemo(() => {
    if (!queryLower) return tickets;
    return tickets.filter((row) => ticketRowMatchesQuery(row, queryLower));
  }, [tickets, queryLower]);

  const displayTickets = useMemo(() => {
    if (!queryLower) return tickets;
    const start = (page - 1) * LIMIT;
    return filteredTickets.slice(start, start + LIMIT);
  }, [tickets, filteredTickets, queryLower, page]);

  const displayTotal = queryLower ? filteredTickets.length : total;
  const displayTotalPages = queryLower
    ? Math.max(1, Math.ceil(filteredTickets.length / LIMIT))
    : totalPages;

  const columns = [
    {
      key: 'userName',
      label: 'Explorer',
      render: (_, row) => {
        const nameFmt = formatNameForCell(row.userName, TICKETS_EXPLORER_DISPLAY_MAX);
        const emailFmt = row.userEmail ? formatExplorerEmailForCell(row.userEmail) : { text: '', title: undefined };
        return (
          <div style={{ minWidth: 0, maxWidth: 220 }}>
            <p
              title={nameFmt.title}
              style={{
                fontSize: 13,
                fontWeight: 500,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nameFmt.text}
            </p>
            {emailFmt.text ? (
              <p
                title={emailFmt.title}
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {emailFmt.text}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'eventTitle',
      label: 'Experience',
      render: (v) => {
        const f = formatNameForCell(v, TICKETS_EXPERIENCE_DISPLAY_MAX);
        return (
          <span style={{ fontSize: 13, fontWeight: 500 }} title={f.title}>
            {f.text}
          </span>
        );
      },
    },
    {
      key: 'ticketType',
      label: 'Type',
      render: (v) => (
        <Badge
          color={String(v).toUpperCase().includes('VIP') ? 'primary' : 'neutral'}
          style={{ fontWeight: 500 }}
        >
          {v}
        </Badge>
      ),
    },
    {
      key: 'amountLabel',
      label: 'Amount',
      render: (v) => (
        <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500 }}>{v}</span>
      ),
    },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'purchasedAt',
      label: 'Purchased',
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v}</span>,
    },
    {
      key: 'eventDate',
      label: 'Experience Date',
      render: (v) => <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{v}</span>,
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Tickets">
        <SearchBar
          value={ticketSearch}
          onChange={setTicketSearch}
          placeholder="Search by explorer or experience…"
          style={{ flex: '1 1 200px', maxWidth: 380, minWidth: 160 }}
        />
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 180, flexShrink: 0 }} />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={displayTickets}
        isLoading={loading}
        emptyMessage="No tickets found."
        rowKey="id"
      />
      <Pagination
        page={page}
        totalPages={displayTotalPages}
        total={displayTotal}
        limit={LIMIT}
        onPageChange={setPage}
      />
    </div>
  );
}
