import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, Clock, XCircle, Undo2, RefreshCw } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { DateRangeInputs, isTimestampInDateRange } from '../../components/ui/DateRangeInputs';
import { ConfirmModal } from '../../components/ui/Modal';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { formatNameForCell } from '../../utils/formatNameForCell';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';

const LIMIT = 20;
/** When searching explorer/experience client-side, fetch enough rows to filter (API may not filter by Paystack customer). */
const CLIENT_SEARCH_FETCH_LIMIT = 500;

function payoutRowMatchesQuery(row, qLower) {
  if (!qLower) return true;
  const hay = [
    row.user?.name,
    row.user?.email,
    row.explorerDetail,
    row.event?.title,
    row.provider?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(qLower);
}

/** Filter values sent to GET /payouts?status= — keep aligned with what the API supports. */
const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Released', value: 'released' },
  { label: 'Failed', value: 'failed' },
];

const iconProps = { size: 12, strokeWidth: 2.5 };

function payoutStatusIcon(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'released') return <CheckCircle {...iconProps} aria-hidden />;
  if (['pending', 'scheduled', 'transfer_pending'].includes(s)) {
    return <Clock {...iconProps} aria-hidden />;
  }
  if (s === 'failed') return <XCircle {...iconProps} aria-hidden />;
  if (['refunded', 'partial_refund'].includes(s)) return <Undo2 {...iconProps} aria-hidden />;
  if (s === 'cancelled' || s === 'canceled') return <XCircle {...iconProps} aria-hidden />;
  return undefined;
}

function formatPayoutDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function personName(obj) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj.name) return String(obj.name).trim();
  const parts = [obj.firstName, obj.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ').trim();
  return '';
}

/** Prefer charge/verify payloads for amount + customer; else first webhook with positive amount. */
function pickBestTransactionPayload(webhookEvents) {
  if (!Array.isArray(webhookEvents) || webhookEvents.length === 0) return null;
  const prefer = ['charge.success', 'transaction.verify'];
  for (const ev of prefer) {
    const hit = webhookEvents.find(
      (w) =>
        w?.event === ev &&
        w?.payload &&
        typeof w.payload === 'object' &&
        typeof w.payload.amount === 'number' &&
        w.payload.amount > 0,
    );
    if (hit?.payload) return hit.payload;
  }
  for (const w of webhookEvents) {
    const p = w?.payload;
    if (p && typeof p === 'object' && typeof p.amount === 'number' && p.amount > 0) return p;
  }
  return null;
}

function firstBookingReference(webhookEvents) {
  if (!Array.isArray(webhookEvents)) return '';
  for (const w of webhookEvents) {
    const br = w?.payload?.metadata?.bookingReference;
    if (typeof br === 'string' && br.trim()) return br.trim();
  }
  return '';
}

function customerFromPayload(payload) {
  const c = payload?.customer;
  if (!c || typeof c !== 'object') return { name: '—', email: '' };
  const email = String(c.email ?? '').trim();
  const name =
    [c.first_name ?? c.firstName, c.last_name ?? c.lastName].filter(Boolean).join(' ').trim() ||
    email ||
    '—';
  return { name, email };
}

function payoutFailureHint(row) {
  const tr = row?.transferResponse;
  if (!tr || typeof tr !== 'object') return '';
  const msg = String(tr.message ?? '').trim();
  const meta = tr.meta && typeof tr.meta === 'object' ? tr.meta : null;
  const next = meta ? String(meta.nextStep ?? '').trim() : '';
  return [msg, next].filter(Boolean).join(' ');
}

/** Estimate charge in minor units from event ticket list when webhooks are empty (price is major). */
function amountMinorFromEventTickets(ev) {
  if (!ev || !Array.isArray(ev.tickets)) return NaN;
  const prices = ev.tickets
    .map((t) => (t && typeof t.price === 'number' ? t.price : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!prices.length) return NaN;
  return Math.round(Math.min(...prices) * 100);
}

function resolvePayoutAmountMinor(row, txPayload) {
  const tryNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return NaN;
  };

  let minor = tryNum(
    row.amount,
    row.payoutAmount,
    row.totalAmount,
    row.netAmount,
    row.chargedAmount,
    row.transactionAmount,
  );

  if (!Number.isFinite(minor) || minor <= 0) {
    const m = tryNum(row.amountMajor, row.payoutAmountMajor, row.payoutMajor);
    if (Number.isFinite(m) && m > 0) minor = Math.round(m * 100);
  }

  if ((!Number.isFinite(minor) || minor <= 0) && txPayload && typeof txPayload.amount === 'number') {
    minor = txPayload.amount;
  }

  if (!Number.isFinite(minor) || minor <= 0) {
    minor = tryNum(
      ...(Array.isArray(row.webhookEvents)
        ? row.webhookEvents.map((w) => w?.payload?.amount)
        : []),
    );
  }

  if (!Number.isFinite(minor) || minor <= 0) {
    const fromTickets = amountMinorFromEventTickets(row.event);
    if (Number.isFinite(fromTickets) && fromTickets > 0) minor = fromTickets;
  }

  return minor;
}

function formatMinorAmount(minorUnits, currency) {
  const major = (Number(minorUnits) || 0) / 100;
  const c = String(currency || 'GHS').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(major);
  } catch {
    return `${major.toLocaleString()} ${c}`;
  }
}

function organiserDisplayName(organiser) {
  if (!organiser || typeof organiser !== 'object') return '—';
  const p = organiser.profile;
  if (p && typeof p === 'object') {
    const fromProfile =
      String(p.businessName ?? '').trim() ||
      personName(p) ||
      String(p.username ?? '').trim();
    if (fromProfile) return fromProfile;
  }
  return String(organiser.email ?? '').trim() || '—';
}

/** Map GET /payouts row: payouts[], event, organiser, webhookEvents, transferResponse, … */
function normalizePayout(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row._id ?? row.id ?? '');
  if (!id) return null;

  const ev = row.event;
  const prov = row.organiser ?? row.organizer ?? row.provider;
  const user = row.user ?? row.explorer ?? row.buyer ?? row.customer;

  let eventTitle = '';
  if (ev && typeof ev === 'object') eventTitle = String(ev.name ?? ev.title ?? '').trim();
  else if (typeof row.eventName === 'string') eventTitle = row.eventName.trim();

  const providerName = organiserDisplayName(prov);

  const tx = pickBestTransactionPayload(row.webhookEvents);
  const fromWebhook = tx ? customerFromPayload(tx) : { name: '—', email: '' };
  let userName =
    user && typeof user === 'object' ? personName(user) || fromWebhook.name : fromWebhook.name;
  let userEmail =
    user && typeof user === 'object'
      ? String(user.email ?? '').trim() || fromWebhook.email
      : fromWebhook.email;

  if ((!userName || userName === '—') && fromWebhook.name && fromWebhook.name !== '—') {
    userName = fromWebhook.name;
  }

  const bookingRef = firstBookingReference(row.webhookEvents);
  const paystackRef = String(row.paystackReference ?? '').trim();
  const firstPayRef =
    Array.isArray(row.paymentReferences) && row.paymentReferences.length
      ? String(row.paymentReferences[0]).trim()
      : '';

  const explorerDetail =
    userEmail ||
    (bookingRef ? `Booking: ${bookingRef}` : '') ||
    (paystackRef ? `Ref: ${paystackRef}` : '') ||
    (firstPayRef ? `Ref: ${firstPayRef}` : '');

  const amountMinor = resolvePayoutAmountMinor(row, tx);
  let currency = String(row.currency ?? row.paystackRecipientCurrency ?? '').trim();
  if (tx && !currency) currency = String(tx.currency ?? '').trim();
  if (!currency && ev?.tickets?.length) {
    const t0 = ev.tickets.find((t) => t && String(t.currency ?? '').trim());
    if (t0) currency = String(t0.currency).trim();
  }
  if (!currency) currency = 'GHS';

  const amountLabel =
    Number.isFinite(amountMinor) && amountMinor > 0
      ? formatMinorAmount(amountMinor, currency)
      : '—';

  const status = String(row.status ?? '').toLowerCase() || 'pending';
  const paidAtRaw =
    row.paidAt ??
    row.payoutDate ??
    row.releasedAt ??
    row.transferDate ??
    row.lastPayoutAttemptAt ??
    row.createdAt ??
    row.updatedAt;
  const paidAtMs = paidAtRaw != null ? Date.parse(String(paidAtRaw)) : NaN;

  const failureHint = payoutFailureHint(row);

  return {
    id,
    amountLabel,
    currency,
    status,
    user: { name: userName || '—', email: userEmail },
    explorerDetail,
    event: { title: eventTitle || '—' },
    provider: { name: providerName || '—' },
    paidAt: formatPayoutDate(paidAtRaw),
    paidAtMs: Number.isFinite(paidAtMs) ? paidAtMs : null,
    failureHint,
  };
}

export default function PaymentsPage() {
  const [payoutSearch, setPayoutSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [repayLoadingId, setRepayLoadingId] = useState(null);
  const [repayConfirmRow, setRepayConfirmRow] = useState(null);

  const debouncedPayoutSearch = useDebounce(payoutSearch, 350);
  const hasSearchQuery = debouncedPayoutSearch.trim().length > 0;
  const hasDateFilter = Boolean(String(dateFrom).trim() || String(dateTo).trim());
  const needsClientSlice = hasSearchQuery || hasDateFilter;
  const requestPage = needsClientSlice ? 1 : page;
  const requestLimit = needsClientSlice ? CLIENT_SEARCH_FETCH_LIMIT : LIMIT;

  const loadPayouts = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getPayouts({
        page: requestPage,
        limit: requestLimit,
        status: statusFilter,
        startDate: String(dateFrom).trim(),
        endDate: String(dateTo).trim(),
      }),
      onSuccess(response) {
        const raw = response.payouts ?? response.data ?? response.results ?? [];
        const rows = (Array.isArray(raw) ? raw : []).map(normalizePayout).filter(Boolean);
        setPayments(rows);
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
        setPayments([]);
        setTotal(0);
        setTotalPages(1);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, [requestPage, requestLimit, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const queryLower = debouncedPayoutSearch.trim().toLowerCase();

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (queryLower) list = list.filter((row) => payoutRowMatchesQuery(row, queryLower));
    if (hasDateFilter) {
      const from = String(dateFrom).trim();
      const to = String(dateTo).trim();
      list = list.filter((row) => {
        if (row.paidAtMs == null) return false;
        return isTimestampInDateRange(row.paidAtMs, from, to);
      });
    }
    return list;
  }, [payments, queryLower, hasDateFilter, dateFrom, dateTo]);

  const displayPayments = useMemo(() => {
    if (!needsClientSlice) return payments;
    const start = (page - 1) * LIMIT;
    return filteredPayments.slice(start, start + LIMIT);
  }, [payments, filteredPayments, needsClientSlice, page]);

  const displayTotal = needsClientSlice ? filteredPayments.length : total;
  const displayTotalPages = needsClientSlice
    ? Math.max(1, Math.ceil(filteredPayments.length / LIMIT))
    : totalPages;

  useEffect(() => {
    setPage(1);
  }, [debouncedPayoutSearch, statusFilter, dateFrom, dateTo]);

  const openRepaymentConfirm = (row) => {
    if (row.status !== 'failed' || repayLoadingId) return;
    setRepayConfirmRow(row);
  };

  const closeRepaymentModal = () => {
    if (repayLoadingId) return;
    setRepayConfirmRow(null);
  };

  const executeRepayment = () => {
    const row = repayConfirmRow;
    if (!row || row.status !== 'failed' || repayLoadingId) return;
    setRepayLoadingId(row.id);
    callApi({
      method: Method.POST,
      endPoint: api.retryPayout(row.id),
      bodyParams: {},
      onSuccess(response) {
        setRepayLoadingId(null);
        setRepayConfirmRow(null);
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : 'Repayment request sent.';
        notifySuccess(msg);
        loadPayouts();
      },
      onError(err) {
        setRepayLoadingId(null);
        setRepayConfirmRow(null);
        notifyError(getApiErrorMessage(err));
      },
    });
  };

  const columns = [
    {
      key: 'user',
      label: 'Explorer',
      wrap: true,
      render: (_, row) => {
        const nameFmt = formatNameForCell(row.user.name);
        const detail = String(row.explorerDetail ?? '').trim();
        const detailFmt = detail ? formatNameForCell(detail) : null;
        return (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500 }} title={nameFmt.title}>
              {nameFmt.text}
            </p>
            {detailFmt ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }} title={detailFmt.title}>
                {detailFmt.text}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'event',
      label: 'Experience',
      render: (_, row) => {
        const f = formatNameForCell(row.event.title);
        return (
          <span style={{ fontSize: 12.5, fontWeight: 500 }} title={f.title}>
            {f.text}
          </span>
        );
      },
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (_, row) => {
        const f = formatNameForCell(row.provider.name);
        return (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }} title={f.title}>
            {f.text}
          </span>
        );
      },
    },
    {
      key: 'amountLabel',
      label: 'Amount',
      render: (v) => (
        <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500 }}>{v}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => (
        <span
          title={row.status === 'failed' && row.failureHint ? row.failureHint : undefined}
          style={{ display: 'inline-flex' }}
        >
          <StatusBadge status={v} icon={payoutStatusIcon(v)} formatLabel={formatStatusLabel} />
        </span>
      ),
    },
    {
      key: 'paidAt',
      label: 'Date',
      render: (v) => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v || '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      width: 72,
      render: (_, row) => {
        if (row.status !== 'failed') {
          return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>;
        }
        const busy = repayLoadingId === row.id;
        return (
          <button
            type="button"
            title="Repayment — retry failed payout"
            aria-label="Repayment — retry failed payout"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              openRepaymentConfirm(row);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: busy ? 'var(--border)' : 'var(--primary-light)',
              color: 'var(--primary)',
              cursor: busy ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy ? 0.65 : 1,
            }}
          >
            <RefreshCw
              size={16}
              strokeWidth={2.25}
              aria-hidden
              style={busy ? { animation: 'spin 0.8s linear infinite' } : undefined}
            />
          </button>
        );
      },
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Payouts" titleOwnRow>
        <SearchBar
          value={payoutSearch}
          onChange={setPayoutSearch}
          placeholder="Search payouts by explorer or experience..."
          style={{ flex: '1 1 200px', maxWidth: 380, minWidth: 160 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          style={{ width: 180, flexShrink: 0 }}
        />
        <DateRangeInputs
          startDate={dateFrom}
          endDate={dateTo}
          onChange={({ startDate, endDate }) => {
            setDateFrom(startDate);
            setDateTo(endDate);
          }}
          onClear={() => {
            setDateFrom('');
            setDateTo('');
          }}
          idPrefix="payouts-dr"
          compact
        />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={displayPayments}
        isLoading={loading}
        emptyMessage="No payouts found."
        rowKey="id"
      />
      <Pagination
        page={page}
        totalPages={displayTotalPages}
        total={displayTotal}
        limit={LIMIT}
        onPageChange={setPage}
      />
      <ConfirmModal
        isOpen={!!repayConfirmRow}
        onClose={closeRepaymentModal}
        onConfirm={executeRepayment}
        loading={!!repayLoadingId}
        variant="primary"
        title="Retry failed payout?"
        confirmLabel="Retry payout"
        message={
          repayConfirmRow
            ? 'This will initiate a new Paystack transfer. Confirm only if the underlying issue is fixed.'
            : ''
        }
      />
    </div>
  );
}
