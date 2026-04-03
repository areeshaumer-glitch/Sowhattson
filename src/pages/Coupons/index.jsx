import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataTable } from '../../components/ui/DataTable';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const LIMIT = 8;

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed amount (₦)', value: 'fixed' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function datetimeLocalToIso(localStr) {
  if (!localStr) return '';
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function defaultFormDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    startsAt: toDatetimeLocalValue(start),
    expiresAt: toDatetimeLocalValue(end),
  };
}

const defaultForm = () => ({
  code: '',
  description: '',
  eventId: '',
  discountType: 'free',
  value: '',
  maxUses: '',
  isActive: true,
  ...defaultFormDates(),
});

function normalizeCouponFromApi(c) {
  if (!c || typeof c !== 'object') return null;
  const ev = c.event;
  return {
    id: String(c._id ?? c.id ?? ''),
    code: c.code ?? '',
    description: c.description ?? '',
    eventId: String(ev?._id ?? ev?.id ?? c.eventId ?? ''),
    eventName: ev?.name ?? '',
    discountType: c.discountType ?? 'percentage',
    value: Number(c.value) || 0,
    maxUses: Number(c.maxUses) || 0,
    redeemedCount: Number(c.redeemedCount) || 0,
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    isActive: Boolean(c.isActive),
    createdAt: c.createdAt,
  };
}

const ab = (bg, color) => ({
  width: 28,
  height: 28,
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: bg,
  border: 'none',
  cursor: 'pointer',
  color,
});

export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allCoupons, setAllCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [eventOptions, setEventOptions] = useState([]);
  const debouncedSearch = useDebounce(search, 350);

  const fetchEventsForSelect = useCallback(() => {
    callApi({
      method: Method.GET,
      endPoint: api.getAdminEvents(1, 100, '', ''),
      onSuccess(response) {
        const list = response.data ?? response.events ?? [];
        setEventOptions(
          Array.isArray(list)
            ? list.map((e) => ({
                value: String(e._id ?? e.id ?? ''),
                label: e.title ?? e.name ?? 'Event',
              })).filter((o) => o.value)
            : [],
        );
      },
      onError() {
        setEventOptions([]);
      },
    });
  }, []);

  const fetchCoupons = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminCoupons(),
      onSuccess(response) {
        const rows = response.coupons ?? response.data ?? [];
        const normalized = Array.isArray(rows)
          ? rows.map(normalizeCouponFromApi).filter(Boolean)
          : [];
        setAllCoupons(normalized);
        setLoading(false);
      },
      onError(err) {
        setAllCoupons([]);
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  }, []);

  useEffect(() => {
    fetchEventsForSelect();
  }, [fetchEventsForSelect]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredCoupons = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allCoupons;
    return allCoupons.filter((c) => {
      const blob = [c.code, c.description].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [allCoupons, debouncedSearch]);

  const total = filteredCoupons.length;
  const coupons = useMemo(() => {
    const start = (page - 1) * LIMIT;
    return filteredCoupons.slice(start, start + LIMIT);
  }, [filteredCoupons, page]);

  const openCreate = () => {
    setForm(defaultForm());
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    const code = form.code.trim().toUpperCase();
    if (!code) errors.code = 'Coupon code is required.';
    else if (code.length < 2) errors.code = 'Code must be at least 2 characters.';
    else if (code.length > 40) errors.code = 'Code must be under 40 characters.';

    if (!form.description.trim()) errors.description = 'Description is required.';
    else if (form.description.trim().length > 500) errors.description = 'Description is too long.';

    if (!form.eventId) errors.eventId = 'Select an experience.';

    const maxUses = parseInt(String(form.maxUses).trim(), 10);
    if (form.maxUses === '' || Number.isNaN(maxUses)) errors.maxUses = 'Enter a valid max uses count.';
    else if (maxUses < 0) errors.maxUses = 'Cannot be negative.';

    const valStr = String(form.value).trim();
    const val = parseFloat(valStr);
    if (form.discountType === 'free') {
      if (valStr !== '' && (Number.isNaN(val) || val < 0)) {
        errors.value = 'Enter a valid number (≥ 0) or leave empty for 0.';
      }
    } else if (valStr === '' || Number.isNaN(val)) {
      errors.value = 'Enter a valid value.';
    } else if (form.discountType === 'percentage' && (val < 0 || val > 100)) {
      errors.value = 'Percentage must be between 0 and 100.';
    } else if (form.discountType === 'fixed' && val < 0) {
      errors.value = 'Amount cannot be negative.';
    }

    if (!form.startsAt) errors.startsAt = 'Start date is required.';
    if (!form.expiresAt) errors.expiresAt = 'End date is required.';
    if (form.startsAt && form.expiresAt) {
      const a = new Date(form.startsAt).getTime();
      const b = new Date(form.expiresAt).getTime();
      if (!Number.isNaN(a) && !Number.isNaN(b) && b <= a) {
        errors.expiresAt = 'End must be after start.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildBody = () => {
    const maxUses = parseInt(String(form.maxUses).trim(), 10);
    const rawVal = String(form.value).trim();
    const valueNum =
      rawVal === ''
        ? 0
        : parseFloat(rawVal);
    return {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      eventId: form.eventId,
      discountType: form.discountType,
      value: Number.isNaN(valueNum) ? 0 : valueNum,
      maxUses,
      startsAt: datetimeLocalToIso(form.startsAt),
      expiresAt: datetimeLocalToIso(form.expiresAt),
      isActive: Boolean(form.isActive),
    };
  };

  const mergeCouponResponse = (coupon) => {
    const n = normalizeCouponFromApi(coupon);
    if (!n) return;
    setAllCoupons((prev) => {
      const idx = prev.findIndex((c) => c.id === n.id);
      if (idx === -1) return [n, ...prev];
      const next = [...prev];
      next[idx] = n;
      return next;
    });
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    const body = buildBody();

    callApi({
      method: Method.POST,
      endPoint: api.createAdminCoupon,
      bodyParams: body,
      onSuccess(response) {
        const c = response.coupon ?? response;
        mergeCouponResponse(c);
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : 'Coupon created.';
        notifySuccess(msg);
        setShowModal(false);
        setSaving(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setSaving(false);
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteLoading(true);
    callApi({
      method: Method.DELETE,
      endPoint: api.deleteAdminCoupon(id),
      onSuccess() {
        setAllCoupons((prev) => prev.filter((c) => c.id !== id));
        setDeleteTarget(null);
        setDeleteLoading(false);
        notifySuccess('Coupon deleted.');
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setDeleteTarget(null);
        setDeleteLoading(false);
      },
    });
  };

  const columns = [
    {
      key: 'code',
      label: 'Coupon Name',
      width: '42%',
      render: (value) => (
        <span style={{ fontWeight: 500, fontSize: 13.5 }}>
          {(value || '').trim() || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      align: 'center',
      width: '16%',
      render: (v) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Badge color={v ? 'success' : 'neutral'} dot>
            {v ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      width: '42%',
      render: (_, row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            title="Delete coupon"
            aria-label="Delete coupon"
            style={ab('rgba(234,84,85,0.12)', 'var(--danger)')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar
        title="Coupons"
        actions={
          <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={openCreate}>
            New Coupon
          </Button>
        }
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search coupons…"
          style={{ flex: '1 1 240px', maxWidth: 420, minWidth: 160 }}
        />
      </ListPageToolbar>

      <DataTable
        columns={columns}
        data={coupons}
        isLoading={loading}
        emptyMessage="No coupons found."
        rowKey="id"
        fixedLayout
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / LIMIT))} total={total} limit={LIMIT} onPageChange={setPage} />

      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!saving) setShowModal(false);
        }}
        title="Create coupon"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Create coupon
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Code *"
            placeholder="e.g. SUMMER20"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            error={formErrors.code}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Summer sale discount"
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${formErrors.description ? 'var(--danger)' : 'var(--border)'}`,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 72,
                outline: 'none',
              }}
            />
            {formErrors.description ? (
              <p style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 500 }}>{formErrors.description}</p>
            ) : null}
          </div>
          <Select
            label="Event * (eventId)"
            value={form.eventId}
            onChange={(v) => setForm((f) => ({ ...f, eventId: v }))}
            options={[{ label: 'Select experience…', value: '' }, ...eventOptions]}
            error={formErrors.eventId}
          />
          <Select
            label="Discount type *"
            value={form.discountType}
            onChange={(v) => setForm((f) => ({ ...f, discountType: v }))}
            options={DISCOUNT_TYPE_OPTIONS}
          />
          <Input
            label={
              form.discountType === 'percentage'
                ? 'Value * (%)'
                : form.discountType === 'fixed'
                  ? 'Value * (₦)'
                  : 'Value *'
            }
            type="number"
            min={0}
            max={form.discountType === 'percentage' ? 100 : undefined}
            step={1}
            placeholder={
              form.discountType === 'free'
                ? 'e.g. 20 (optional; 0 if empty)'
                : form.discountType === 'percentage'
                  ? 'e.g. 20'
                  : 'e.g. 5000'
            }
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            error={formErrors.value}
            hint={
              form.discountType === 'free'
                ? 'Sent as numeric value in the request body (matches API schema).'
                : undefined
            }
          />
          <Input
            label="Max uses *"
            type="number"
            min={0}
            placeholder="e.g. 100"
            value={form.maxUses}
            onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
            error={formErrors.maxUses}
          />
          <Input
            label="Starts at * (startsAt)"
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            error={formErrors.startsAt}
          />
          <Input
            label="Expires at * (expiresAt)"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            error={formErrors.expiresAt}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Is active (isActive)</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                cursor: 'pointer',
                background: form.isActive ? 'var(--success-bg)' : 'var(--border)',
                color: form.isActive ? 'var(--success)' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {form.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete coupon"
        confirmLabel="Delete"
        variant="danger"
        message={
          deleteTarget
            ? `Delete coupon "${(deleteTarget.code || '').trim() || 'this coupon'}"? This cannot be undone.`
            : ''
        }
      />
    </div>
  );
}
