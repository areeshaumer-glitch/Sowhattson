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
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const LIMIT = 8;

const defaultForm = () => ({
  code: '',
  isActive: true,
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
  const debouncedSearch = useDebounce(search, 350);

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
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const filteredCoupons = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allCoupons;
    return allCoupons.filter((c) => {
      const code = String(c.code ?? '').toLowerCase();
      const desc = String(c.description ?? '').toLowerCase();
      return code.includes(q) || desc.includes(q);
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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildBody = () => ({
    code: form.code.trim().toUpperCase(),
    isActive: Boolean(form.isActive),
  });

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
        size="sm"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Status *</span>
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
