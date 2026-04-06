import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { formatNameForCell } from '../../utils/formatNameForCell';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';

const LIMIT = 8;
const NAME_MAX = 30;
const LIMIT_REACHED = 'Limit reached.';

const defaultForm = { name: '', isActive: true };

/** CSS Grid avoids browser bugs with <table> + colgroup leaving a huge gap after column 1. */
const TAGS_GRID_COLS = 'minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)';

const tagsTableWrap = {
  width: '100%',
  overflowX: 'auto',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
};

const tagsTh = {
  padding: '14px 24px',
  fontSize: 12.5,
  fontWeight: 700,
  color: 'var(--text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  background: 'var(--bg-card)',
  borderBottom: '2px solid var(--border)',
  minWidth: 0,
};

const tagsTd = {
  padding: '14px 24px',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
  minWidth: 0,
  overflow: 'hidden',
};

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

function formatCategoryDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).split('T')[0] || '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizeCategory(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row._id ?? row.id ?? '');
  if (!id) return null;
  return {
    id,
    name: String(row.name ?? '').trim(),
    description: String(row.description ?? '').trim(),
    icon: String(row.icon ?? '').trim(),
    isActive: row.isActive !== false,
    createdAt: formatCategoryDate(row.createdAt),
  };
}

export default function TagsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [statusToggleTarget, setStatusToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getCategories(true),
      onSuccess(response) {
        const raw = response.categories ?? response.data ?? response.results ?? [];
        const rows = (Array.isArray(raw) ? raw : []).map(normalizeCategory).filter(Boolean);
        setCategories(rows);
        setLoading(false);
      },
      onError(err) {
        setCategories([]);
        setLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, debouncedSearch]);

  const total = filteredCategories.length;
  const pagedCategories = useMemo(
    () => filteredCategories.slice((page - 1) * LIMIT, page * LIMIT),
    [filteredCategories, page],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditCategory(null);
    setForm(defaultForm);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditCategory(row);
    setForm({
      name: row.name,
      isActive: row.isActive,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    const name = form.name.trim();
    if (form.name.length > NAME_MAX) errors.name = LIMIT_REACHED;
    else if (!name) errors.name = 'Name is required.';
    else if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    const body = {
      name: form.name.trim(),
      description: editCategory ? editCategory.description : '',
      icon: editCategory ? editCategory.icon : '',
      isActive: form.isActive,
    };
    callApi({
      method: editCategory ? Method.PUT : Method.POST,
      endPoint: editCategory ? api.updateCategory(editCategory.id) : api.createCategory,
      bodyParams: body,
      onSuccess() {
        setShowModal(false);
        setSaving(false);
        fetchCategories();
      },
      onError(err) {
        setSaving(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  };

  const handleConfirmStatusToggle = () => {
    if (!statusToggleTarget) return;
    const row = statusToggleTarget;
    const next = !row.isActive;
    setToggleLoading(true);
    callApi({
      method: Method.PUT,
      endPoint: api.updateCategory(row.id),
      bodyParams: {
        name: row.name,
        description: row.description,
        icon: row.icon,
        isActive: next,
      },
      onSuccess() {
        setStatusToggleTarget(null);
        setToggleLoading(false);
        fetchCategories();
      },
      onError(err) {
        setStatusToggleTarget(null);
        setToggleLoading(false);
        notifyError(getApiErrorMessage(err));
      },
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar
        title="Tags"
        actions={
          <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={openCreate}>
            New tag
          </Button>
        }
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search tags…"
          style={{ flex: '1 1 240px', maxWidth: 420, minWidth: 160 }}
        />
      </ListPageToolbar>

      <div style={tagsTableWrap}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: TAGS_GRID_COLS,
            width: '100%',
            minWidth: 560,
          }}
        >
          <div style={{ ...tagsTh, textAlign: 'left' }}>Name</div>
          <div style={{ ...tagsTh, textAlign: 'center' }}>Status</div>
          <div style={{ ...tagsTh, textAlign: 'left' }}>Created</div>
          <div style={{ ...tagsTh, textAlign: 'center' }}>Action</div>

          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Fragment key={`sk-${i}`}>
                  {[0, 1, 2, 3].map((j) => (
                    <div
                      key={j}
                      style={{
                        ...tagsTd,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          height: 14,
                          borderRadius: 4,
                          background: 'var(--border)',
                          opacity: 0.6,
                          width: j === 0 ? '55%' : '42%',
                          maxWidth: 160,
                        }}
                      />
                    </div>
                  ))}
                </Fragment>
              ))
            : null}

          {!loading && pagedCategories.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14,
              }}
            >
              No tags found.
            </div>
          ) : null}

          {!loading
            ? pagedCategories.map((row, idx) => {
                const nameFmt = formatNameForCell(row.name);
                const bottom =
                  idx < pagedCategories.length - 1 ? '1px solid var(--border)' : undefined;
                return (
                  <Fragment key={row.id}>
                    <div
                      style={{
                        ...tagsTd,
                        borderBottom: bottom,
                      }}
                    >
                      <div
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: 13.5 }} title={nameFmt.title}>
                          {nameFmt.text}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        ...tagsTd,
                        textAlign: 'center',
                        borderBottom: bottom,
                      }}
                    >
                      <Badge color={row.isActive ? 'success' : 'neutral'} dot>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div style={{ ...tagsTd, borderBottom: bottom }}>
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        {row.createdAt}
                      </span>
                    </div>
                    <div
                      style={{
                        ...tagsTd,
                        textAlign: 'center',
                        borderBottom: bottom,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(row);
                          }}
                          title="Edit"
                          style={ab('var(--primary-light)', 'var(--primary)')}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusToggleTarget(row);
                          }}
                          title={row.isActive ? 'Deactivate' : 'Activate'}
                          style={ab(
                            row.isActive ? 'var(--success-bg)' : 'rgba(108,108,112,0.12)',
                            row.isActive ? 'var(--success)' : 'var(--text-secondary)',
                          )}
                        >
                          {row.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </div>
                    </div>
                  </Fragment>
                );
              })
            : null}
        </div>
      </div>
      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / LIMIT))}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
      />

      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editCategory ? 'Edit tag' : 'Create tag'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editCategory ? 'Save changes' : 'Create tag'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={`Name * (max ${NAME_MAX} characters)`}
            placeholder="e.g. Music"
            value={form.name}
            maxLength={NAME_MAX}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name }));
              setFormErrors((prev) => {
                const next = { ...prev };
                if (name.length >= NAME_MAX) next.name = LIMIT_REACHED;
                else if (next.name === LIMIT_REACHED) delete next.name;
                return next;
              });
            }}
            error={formErrors.name}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              rowGap: 8,
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <label
              style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}
            >
              Status
            </label>
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
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              {form.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!statusToggleTarget}
        onClose={() => {
          if (!toggleLoading) setStatusToggleTarget(null);
        }}
        onConfirm={handleConfirmStatusToggle}
        loading={toggleLoading}
        title={statusToggleTarget?.isActive ? 'Deactivate tag' : 'Activate tag'}
        confirmLabel={statusToggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusToggleTarget?.isActive ? 'danger' : 'primary'}
        message={
          statusToggleTarget
            ? statusToggleTarget.isActive
              ? `Deactivate "${statusToggleTarget.name}"? It will be hidden when inactive unless you include inactive tags in listings.`
              : `Activate "${statusToggleTarget.name}"? It will be available for experiences.`
            : ''
        }
      />
    </div>
  );
}
