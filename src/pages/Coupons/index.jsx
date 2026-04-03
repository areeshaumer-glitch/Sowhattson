import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
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

const MOCK_COUPONS = [
  { id: '1', name: 'Early bird', totalQuantity: 500, discountType: 'percentage', discountValue: 15, isActive: true, createdAt: '2026-01-12' },
  { id: '2', name: 'Weekend special', totalQuantity: 200, discountType: 'fixed', discountValue: 2500, isActive: true, createdAt: '2026-01-10' },
  { id: '3', name: 'VIP launch', totalQuantity: 50, discountType: 'percentage', discountValue: 25, isActive: false, createdAt: '2026-01-08' },
  { id: '4', name: 'Student pass', totalQuantity: 1000, discountType: 'percentage', discountValue: 10, isActive: true, createdAt: '2026-01-05' },
  { id: '5', name: 'Flat ₦5k off', totalQuantity: 80, discountType: 'fixed', discountValue: 5000, isActive: true, createdAt: '2026-01-02' },
  { id: '6', name: 'New year', totalQuantity: 0, discountType: 'percentage', discountValue: 20, isActive: false, createdAt: '2025-12-28' },
];

const defaultForm = {
  name: '',
  totalQuantity: '',
  discountType: 'percentage',
  discountValue: '',
  isActive: true,
};

const DISCOUNT_TYPE_OPTIONS = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed value (₦)', value: 'fixed' },
];

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

function formatDiscount(row) {
  const t = row?.discountType === 'fixed' ? 'fixed' : 'percentage';
  const v = Number(row?.discountValue);
  if (Number.isNaN(v)) return '—';
  if (t === 'fixed') return `₦${v.toLocaleString()}`;
  return `${v}%`;
}

export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [coupons, setCoupons] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const LIMIT = 8;

  const fetchCoupons = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminCoupons(page, LIMIT, debouncedSearch),
      onSuccess(response) {
        const rows = response.data ?? response.coupons ?? [];
        setCoupons(Array.isArray(rows) ? rows.map(normalizeCouponRow) : []);
        setTotal(response.total ?? rows.length ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK_COUPONS.filter((c) =>
          c.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
        setCoupons(filtered.slice((page - 1) * LIMIT, page * LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const openCreate = () => {
    setForm(defaultForm);
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Coupon name is required.';
    else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (form.name.trim().length > 80) errors.name = 'Name must be under 80 characters.';

    const qty = parseInt(String(form.totalQuantity).trim(), 10);
    if (form.totalQuantity === '' || Number.isNaN(qty)) errors.totalQuantity = 'Enter a valid number.';
    else if (qty < 0) errors.totalQuantity = 'Cannot be negative.';

    const val = parseFloat(String(form.discountValue).trim());
    if (form.discountValue === '' || Number.isNaN(val)) errors.discountValue = 'Enter a valid value.';
    else if (form.discountType === 'percentage' && (val < 0 || val > 100)) {
      errors.discountValue = 'Percentage must be between 0 and 100.';
    } else if (form.discountType === 'fixed' && val < 0) {
      errors.discountValue = 'Amount cannot be negative.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyCreate = () => {
    const qty = parseInt(String(form.totalQuantity).trim(), 10);
    const val = parseFloat(String(form.discountValue).trim());
    const newRow = {
      id: String(Date.now()),
      name: form.name.trim(),
      totalQuantity: qty,
      discountType: form.discountType,
      discountValue: val,
      isActive: form.isActive,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCoupons((prev) => [normalizeCouponRow(newRow), ...prev]);
    setTotal((t) => t + 1);
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    const qty = parseInt(String(form.totalQuantity).trim(), 10);
    const val = parseFloat(String(form.discountValue).trim());
    callApi({
      method: Method.POST,
      endPoint: api.createAdminCoupon,
      bodyParams: {
        name: form.name.trim(),
        totalQuantity: qty,
        discountType: form.discountType,
        discountValue: val,
        isActive: form.isActive,
      },
      onSuccess() {
        applyCreate();
        setShowModal(false);
        setSaving(false);
      },
      onError() {
        applyCreate();
        setShowModal(false);
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
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        setDeleteTarget(null);
        setDeleteLoading(false);
      },
      onError() {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        setDeleteTarget(null);
        setDeleteLoading(false);
      },
    });
  };

  const columns = [
    {
      key: 'name',
      label: 'Coupon Name',
      render: (v) => <span style={{ fontWeight: 500, fontSize: 13.5 }}>{v}</span>,
    },
    {
      key: 'totalQuantity',
      label: 'No. of Coupons',
      align: 'center',
      render: (v) => <span style={{ fontSize: 13, fontWeight: 500 }}>{v ?? 0}</span>,
    },
    {
      key: 'discountValue',
      label: 'Percentage / Value',
      render: (_, row) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{formatDiscount(row)}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      align: 'center',
      render: (v) => <Badge color={v ? 'success' : 'neutral'} dot>{v ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'center',
      width: '72px',
      render: (_, row) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
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

      <DataTable columns={columns} data={coupons} isLoading={loading} emptyMessage="No coupons found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Coupon"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Create Coupon</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Coupon Name *"
            placeholder="e.g. Early bird"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            error={formErrors.name}
          />
          <Input
            label="No. of Coupons *"
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={form.totalQuantity}
            onChange={(e) => setForm((f) => ({ ...f, totalQuantity: e.target.value }))}
            error={formErrors.totalQuantity}
          />
          <Select
            label="Discount type *"
            value={form.discountType}
            onChange={(v) => setForm((f) => ({ ...f, discountType: v }))}
            options={DISCOUNT_TYPE_OPTIONS}
          />
          <Input
            label={form.discountType === 'percentage' ? 'Percentage *' : 'Value (₦) *'}
            type="number"
            min={0}
            max={form.discountType === 'percentage' ? 100 : undefined}
            step={form.discountType === 'percentage' ? 1 : 1}
            placeholder={form.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 5000'}
            value={form.discountValue}
            onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            error={formErrors.discountValue}
            hint={form.discountType === 'percentage' ? 'Enter a value from 0 to 100.' : 'Fixed amount in Naira.'}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</span>
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
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        title="Delete coupon"
        confirmLabel="Delete"
        variant="danger"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This cannot be undone.`
            : ''
        }
      />
    </div>
  );
}

function normalizeCouponRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    id: String(row.id ?? ''),
    name: row.name ?? '',
    totalQuantity: row.totalQuantity ?? row.quantity ?? row.count ?? 0,
    discountType: row.discountType === 'fixed' || row.type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(row.discountValue ?? row.value ?? row.percent ?? 0),
    isActive: row.isActive !== false && row.status !== 'inactive',
    createdAt: row.createdAt,
  };
}
