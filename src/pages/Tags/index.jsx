import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { DataTable } from '../../components/ui/DataTable';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';

const MOCK_TAGS = [
  { id:'1', name:'Suited and booted',  slug:'suited-and-booted',  description:'Formal dress code experiences',          eventsCount:12, isActive:true,  createdAt:'2026-01-10', updatedAt:'2026-01-10' },
  { id:'2', name:'Afrobeats',          slug:'afrobeats',           description:'Afrobeats music experiences',            eventsCount:34, isActive:true,  createdAt:'2026-01-08', updatedAt:'2026-02-12' },
  { id:'3', name:'Grown',              slug:'grown',               description:'Mature audience experiences',            eventsCount:18, isActive:true,  createdAt:'2026-01-05', updatedAt:'2026-01-05' },
  { id:'4', name:'Calm',               slug:'calm',                description:'Relaxed, chill atmosphere',         eventsCount:9,  isActive:true,  createdAt:'2026-01-03', updatedAt:'2026-01-03' },
  { id:'5', name:'Crazy night out',    slug:'crazy-night-out',     description:'High-energy party experiences',          eventsCount:27, isActive:false, createdAt:'2026-01-01', updatedAt:'2026-03-10' },
  { id:'6', name:'Classy and Elegant', slug:'classy-and-elegant',  description:'Upscale, premium experiences',           eventsCount:15, isActive:true,  createdAt:'2025-12-20', updatedAt:'2025-12-20' },
  { id:'7', name:'Family Friendly',    slug:'family-friendly',     description:'Suitable for all ages',             eventsCount:8,  isActive:true,  createdAt:'2025-12-15', updatedAt:'2025-12-15' },
  { id:'8', name:'Live Music',         slug:'live-music',          description:'Experiences featuring live bands',       eventsCount:41, isActive:true,  createdAt:'2025-12-10', updatedAt:'2026-02-01' },
  { id:'9', name:'Rooftop',            slug:'rooftop',             description:'Outdoor rooftop venue experiences',      eventsCount:7,  isActive:false, createdAt:'2025-11-25', updatedAt:'2026-01-18' },
  { id:'10', name:'VIP Access',        slug:'vip-access',          description:'Exclusive VIP tier experiences',         eventsCount:22, isActive:true,  createdAt:'2025-11-10', updatedAt:'2025-11-10' },
];

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const defaultForm = { name: '', description: '', isActive: true };

const ab = (bg, color) => ({
  width:28, height:28, borderRadius:'var(--radius-sm)',
  display:'flex', alignItems:'center', justifyContent:'center',
  background:bg, border:'none', cursor:'pointer', color,
});

export default function TagsPage() {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [tags, setTags]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editTag, setEditTag]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm]               = useState(defaultForm);
  const [formErrors, setFormErrors]   = useState({});
  const debouncedSearch               = useDebounce(search, 350);
  const LIMIT = 8;

  const fetchTags = useCallback(() => {
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminTags(page, LIMIT, debouncedSearch),
      onSuccess(response) {
        setTags(response.data ?? response.tags ?? []);
        setTotal(response.total ?? 0);
        setLoading(false);
      },
      onError() {
        const filtered = MOCK_TAGS.filter((t) =>
          t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (t.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()),
        );
        setTags(filtered.slice((page - 1) * LIMIT, page * LIMIT));
        setTotal(filtered.length);
        setLoading(false);
      },
    });
  }, [page, debouncedSearch]);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const openCreate = () => { setEditTag(null); setForm(defaultForm); setFormErrors({}); setShowModal(true); };
  const openEdit   = (tag) => { setEditTag(tag); setForm({ name: tag.name, description: tag.description || '', isActive: tag.isActive }); setFormErrors({}); setShowModal(true); };

  const validate = () => {
    const errors = {};
    if (!form.name.trim())               errors.name = 'Tag name is required.';
    else if (form.name.trim().length < 2) errors.name = 'Tag name must be at least 2 characters.';
    else if (form.name.trim().length > 60) errors.name = 'Tag name must be under 60 characters.';
    const dup = MOCK_TAGS.find((t) => t.name.toLowerCase() === form.name.trim().toLowerCase() && t.id !== editTag?.id);
    if (dup) errors.name = 'A tag with this name already exists.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyCreate = () => {
    const newTag = {
      id: String(Date.now()), name: form.name.trim(),
      slug: slugify(form.name.trim()), description: form.description,
      eventsCount: 0, isActive: form.isActive,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setTags((prev) => [newTag, ...prev]);
    setTotal((t) => t + 1);
  };

  const applyUpdate = () => {
    setTags((prev) => prev.map((t) => t.id === editTag?.id
      ? { ...t, ...form, slug: slugify(form.name), updatedAt: new Date().toISOString().split('T')[0] }
      : t,
    ));
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    callApi({
      method: editTag ? Method.PATCH : Method.POST,
      endPoint: editTag ? api.updateAdminTag(editTag.id) : api.createAdminTag,
      bodyParams: form,
      onSuccess() { editTag ? applyUpdate() : applyCreate(); setShowModal(false); setSaving(false); },
      onError()   { editTag ? applyUpdate() : applyCreate(); setShowModal(false); setSaving(false); },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    callApi({
      method: Method.DELETE,
      endPoint: api.deleteAdminTag(deleteTarget.id),
      onSuccess() {},
      onError()  {},
    });
    setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setTotal((t) => t - 1);
    setDeleteTarget(null);
    setDeleting(false);
  };

  const columns = [
    {
      key: 'name',
      label: 'Tag Name',
      render: (v) => <span style={{ fontWeight: 500, fontSize: 13.5 }}>{v}</span>,
    },
    {
      key: 'eventsCount',
      label: 'Experiences',
      align: 'center',
      render: (v) => <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{v}</span>,
    },
    {
      key: 'isActive', label: 'Status', align: 'center',
      render: (v) => <Badge color={v ? 'success' : 'neutral'} dot>{v ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt', label: 'Created',
      render: (v) => <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{v}</span>,
    },
    {
      key: 'actions', label: 'Action', align: 'center', width: '88px',
      render: (_, row) => (
        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(row); }} title="Edit" style={ab('var(--primary-light)', 'var(--primary)')}>
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            title={row.eventsCount > 0 ? `Delete tag (${row.eventsCount} linked experiences)` : 'Delete tag'}
            style={ab('var(--danger-bg)', 'var(--danger)')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <ListPageToolbar
        title="Tags"
        actions={
          <Button variant="primary" size="md" icon={<Plus size={15} />} onClick={openCreate}>New Tag</Button>
        }
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search tags…" style={{ flex:'1 1 240px', maxWidth:420, minWidth:160 }} />
        {/* <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:13, flexShrink:0 }}>
          <span style={{ color:'var(--text-muted)' }}>Active:</span>
          <strong style={{ color:'var(--success)' }}>{tags.filter(t => t.isActive).length}</strong>
          <span style={{ color:'var(--border)' }}>·</span>
          <span style={{ color:'var(--text-muted)' }}>Inactive:</span>
          <strong style={{ color:'var(--text-muted)' }}>{tags.filter(t => !t.isActive).length}</strong>
        </div> */}
      </ListPageToolbar>

      <DataTable columns={columns} data={tags} isLoading={loading} emptyMessage="No tags found." rowKey="id" />
      <Pagination page={page} totalPages={Math.ceil(total / LIMIT)} total={total} limit={LIMIT} onPageChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTag ? 'Edit Tag' : 'Create New Tag'} size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>{editTag ? 'Save Changes' : 'Create Tag'}</Button>
          </>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="Tag Name *" placeholder="e.g. Afrobeats" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={formErrors.name} />
          {form.name && (
            <p style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:-10 }}>Slug: <strong>/{slugify(form.name)}</strong></p>
          )}
          <Textarea label="Description" placeholder="Briefly describe this tag…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>Status</label>
            <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:'var(--radius-full)', border:'none', cursor:'pointer',
                background: form.isActive ? 'var(--success-bg)' : 'var(--border)', color: form.isActive ? 'var(--success)' : 'var(--text-muted)',
                fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'background 0.2s, color 0.2s' }}>
              {form.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        loading={deleting} title="Delete Tag" confirmLabel="Delete" variant="danger"
        message={
          deleteTarget
            ? (deleteTarget.eventsCount > 0
              ? `The tag "${deleteTarget.name}" is linked to ${deleteTarget.eventsCount} experience(s). Deleting may affect those listings. Are you sure you want to continue? This cannot be undone.`
              : `Are you sure you want to delete the tag "${deleteTarget.name}"? This action cannot be undone.`)
            : ''
        }
      />
    </div>
  );
}
