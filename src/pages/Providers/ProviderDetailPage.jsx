import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Info, Landmark, XCircle } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import { findMockProvider } from './mockProviders';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { useMobileHeaderTitle } from '../../components/ui/PageHeader';

/** Persist verification UI when API is unavailable (mock); cleared after a successful API verify. */
const PROVIDER_VERIFY_STORAGE_PREFIX = 'sw_admin_provider_verify:';

function readPersistedVerification(id) {
  if (id == null) return null;
  try {
    const raw = sessionStorage.getItem(PROVIDER_VERIFY_STORAGE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistVerificationSnapshot(providerId, snapshot) {
  try {
    sessionStorage.setItem(PROVIDER_VERIFY_STORAGE_PREFIX + providerId, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

function clearPersistedVerification(providerId) {
  try {
    sessionStorage.removeItem(PROVIDER_VERIFY_STORAGE_PREFIX + providerId);
  } catch { /* ignore */ }
}

function applyPersistedVerificationOverride(base) {
  if (!base?.id) return base;
  const patch = readPersistedVerification(base.id);
  if (!patch) return base;
  return {
    ...base,
    verificationStatus: patch.verificationStatus ?? base.verificationStatus,
    isVerified: patch.isVerified ?? base.isVerified,
    organizerVerification: {
      phone: patch.organizerVerification?.phone ?? base.organizerVerification?.phone,
      email: patch.organizerVerification?.email ?? base.organizerVerification?.email,
      documentType: patch.organizerVerification?.documentType ?? base.organizerVerification?.documentType,
      documents: patch.organizerVerification?.documents
        ? mergeDocuments(patch.organizerVerification.documents)
        : mergeDocuments(base.organizerVerification?.documents),
    },
  };
}

function emptyDocuments() {
  return {
    identityCard: { front: null, back: null },
    passport: { front: null, back: null },
    drivingLicense: { front: null, back: null },
    nationalIdCard: { front: null, back: null },
    selfie: null,
  };
}

function demoDocumentsOnVerify(providerId) {
  const s = `v${providerId}`;
  return {
    identityCard: { front: `https://picsum.photos/seed/${s}idf/420/280`, back: `https://picsum.photos/seed/${s}idb/420/280` },
    passport: { front: `https://picsum.photos/seed/${s}pf/420/280`, back: `https://picsum.photos/seed/${s}pb/420/280` },
    drivingLicense: { front: `https://picsum.photos/seed/${s}df/420/280`, back: `https://picsum.photos/seed/${s}db/420/280` },
    nationalIdCard: { front: `https://picsum.photos/seed/${s}nf/420/280`, back: `https://picsum.photos/seed/${s}nb/420/280` },
    selfie: `https://picsum.photos/seed/${s}selfie/400/400`,
  };
}

function mergeDocuments(raw) {
  const base = emptyDocuments();
  if (!raw || typeof raw !== 'object') return base;
  return {
    identityCard: { ...base.identityCard, ...raw.identityCard },
    passport: { ...base.passport, ...raw.passport },
    drivingLicense: { ...base.drivingLicense, ...raw.drivingLicense },
    nationalIdCard: { ...base.nationalIdCard, ...raw.nationalIdCard },
    selfie: raw.selfie ?? base.selfie,
  };
}

/** Prefer existing uploaded URLs; fill gaps from demo set when admin verifies. */
function mergeDocPairs(demo, current) {
  const c = mergeDocuments(current);
  const d = mergeDocuments(demo);
  const pick = (a, b) => ({
    front: a.front || b.front || null,
    back: a.back || b.back || null,
  });
  return {
    identityCard: pick(c.identityCard, d.identityCard),
    passport: pick(c.passport, d.passport),
    drivingLicense: pick(c.drivingLicense, d.drivingLicense),
    nationalIdCard: pick(c.nationalIdCard, d.nationalIdCard),
    selfie: c.selfie || d.selfie || null,
  };
}

function pushPairSides(out, pair, prefix) {
  if (pair?.front) out.push({ key: `${prefix}-front`, url: pair.front });
  if (pair?.back) out.push({ key: `${prefix}-back`, url: pair.back });
}

/** ID document sides only (not selfie) — URLs only, no placeholders. */
function collectUploadedDocumentTiles(docs) {
  const out = [];
  pushPairSides(out, docs.identityCard, 'identity');
  pushPairSides(out, docs.passport, 'passport');
  pushPairSides(out, docs.drivingLicense, 'driving');
  pushPairSides(out, docs.nationalIdCard, 'national');
  return out;
}

function DocumentImageTile({ url, onPreview }) {
  return (
    <button
      type="button"
      onClick={() => onPreview?.(url)}
      aria-label="View document image full size"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        margin: 0,
        padding: 0,
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        background: 'var(--bg-input)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ aspectRatio: '4 / 3', width: '100%', minHeight: 0 }}>
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
      </div>
    </button>
  );
}

export default function ProviderDetailPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useOutletContext() ?? {};
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actLoading, setActLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const mobileNavTitle = loading
    ? 'Provider'
    : provider
      ? (provider.businessName || 'Provider detail')
      : 'Not found';
  useMobileHeaderTitle(mobileNavTitle);

  const fetchProvider = useCallback((opts = {}) => {
    const showLoading = opts.showLoading !== false;
    if (showLoading) setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminProviderById(providerId),
      onSuccess(response) {
        const row = response.data ?? response.provider ?? response;
        const normalized = normalizeProvider(row);
        if (normalized?.id) clearPersistedVerification(normalized.id);
        setProvider(normalized);
        if (showLoading) setLoading(false);
      },
      onError() {
        const mock = findMockProvider(providerId);
        const base = mock ? normalizeProvider(mock) : null;
        setProvider(base ? applyPersistedVerificationOverride(base) : null);
        if (showLoading) setLoading(false);
      },
    });
  }, [providerId]);

  useEffect(() => { fetchProvider({ showLoading: true }); }, [fetchProvider]);

  const applyVerifiedUpdate = (p, confirmRef) => {
    if (!p) return p;
    const nextStatus = confirmRef.type === 'verify' ? 'verified' : 'rejected';
    const nextDocs = confirmRef.type === 'verify'
      ? mergeDocPairs(demoDocumentsOnVerify(p.id), p.organizerVerification?.documents)
      : mergeDocuments(p.organizerVerification?.documents);
    return {
      ...p,
      verificationStatus: nextStatus,
      isVerified: confirmRef.type === 'verify',
      organizerVerification: {
        phone: p.organizerVerification?.phone || p.phone,
        email: p.organizerVerification?.email || p.email,
        documentType: p.organizerVerification?.documentType || 'Identity card',
        documents: nextDocs,
      },
    };
  };

  const handleVerifyAction = () => {
    if (!confirm || !provider) return;
    setActLoading(true);
    const confirmRef = confirm;
    callApi({
      method: Method.PATCH,
      endPoint: api.verifyAdminProvider(provider.id),
      bodyParams: { status: confirmRef.type === 'verify' ? 'verified' : 'rejected' },
      onSuccess(responseData) {
        clearPersistedVerification(provider.id);
        setConfirm(null);
        setActLoading(false);
        const row = responseData?.data ?? responseData?.provider ?? responseData;
        const looksLikeProvider = row && typeof row === 'object' && !Array.isArray(row)
          && (row.verificationStatus != null || row.businessName != null || row.name != null || row.id != null);
        if (looksLikeProvider) {
          setProvider(normalizeProvider(row));
          return;
        }
        fetchProvider({ showLoading: false });
      },
      onError() {
        const updated = applyVerifiedUpdate(provider, confirmRef);
        setProvider(updated);
        persistVerificationSnapshot(provider.id, {
          verificationStatus: updated.verificationStatus,
          isVerified: updated.isVerified,
          organizerVerification: updated.organizerVerification,
        });
        setConfirm(null);
        setActLoading(false);
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
    );
  }

  if (!provider) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/providers" style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>← Back to providers</Link>
        <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>Provider not found.</p>
      </div>
    );
  }

  const ov = provider.organizerVerification || {};
  const docs = mergeDocuments(ov.documents);
  const documentTiles = collectUploadedDocumentTiles(docs);
  const isVerified = provider.verificationStatus === 'verified';
  const isRejected = provider.verificationStatus === 'rejected';
  const initial = (provider.name || 'P')[0]?.toUpperCase() || 'P';

  const statusDotColor = isVerified ? 'var(--success)' : isRejected ? 'var(--danger)' : 'var(--warning)';
  const statusLabel = isVerified
    ? formatStatusLabel('verified')
    : isRejected
      ? formatStatusLabel('rejected')
      : 'Pending verification';

  const dash = (v) => (v != null && String(v).trim() !== '' ? String(v) : '—');

  const statusPillBase = {
    padding: '10px 22px',
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'default',
    transition: 'opacity 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div style={{ marginBottom: 22 }}>
        <button
          type="button"
          onClick={() => navigate('/providers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={16} />
          Providers
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {!isMobile && (
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Provider detail
          </h1>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {isVerified ? (
            <button type="button" disabled style={{
              ...statusPillBase,
              border: '2px solid var(--success)',
              background: 'var(--success-bg)',
              color: 'var(--success)',
            }}
            >
              <CheckCircle size={18} strokeWidth={2.25} />
              Verified
            </button>
          ) : isRejected ? (
            <button type="button" disabled style={{
              ...statusPillBase,
              border: '2px solid var(--danger)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
            }}
            >
              <XCircle size={18} strokeWidth={2.25} />
              {formatStatusLabel('rejected')}
            </button>
          ) : (
            <>
              <Button variant="outline" size="md" onClick={() => setConfirm({ type: 'verify', prov: provider })}>
                Verify
              </Button>
              <Button variant="danger" size="md" onClick={() => setConfirm({ type: 'reject', prov: provider })}>
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 28, flexWrap: 'wrap' }}>
        {provider.profileImageUrl ? (
          <img
            src={provider.profileImageUrl}
            alt=""
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid var(--border)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{provider.name}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDotColor, flexShrink: 0 }} />
              {statusLabel}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            {provider.businessName}
          </p>
        </div>
      </div>

      <Card style={{ marginBottom: 22, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Info size={20} color="var(--primary)" strokeWidth={2} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Provider details</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))'
              : 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: isMobile ? '16px 20px' : '20px 28px',
            width: '100%',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {[
            { label: 'Region', value: dash(provider.region) },
            { label: 'Business name', value: dash(provider.businessName) },
            { label: 'First name', value: dash(provider.firstName) },
            { label: 'Last name', value: dash(provider.lastName) },
            { label: 'Email', value: dash(provider.email) },
            { label: 'Phone number', value: dash(ov.phone) },
            { label: 'Document type', value: dash(ov.documentType) },
            { label: 'Verification status', value: statusLabel },
            { label: 'Member since', value: dash(provider.createdAt) },
          ].map((row) => (
            <div key={row.label}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {row.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 22, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Landmark size={20} color="var(--primary)" strokeWidth={2} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Bank details</h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px 28px',
          }}
        >
          {[
            { label: 'Bank name', value: dash(provider.bankName) },
            { label: 'Account number', value: dash(provider.accountNumber) },
          ].map((row) => (
            <div key={row.label}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {row.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 0, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 6px',
            maxWidth: '100%',
            overflowWrap: 'break-word',
            lineHeight: 1.3,
          }}
        >
          Document images (front and back side)
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            margin: '0 0 24px',
            lineHeight: 1.5,
            maxWidth: '100%',
            overflowWrap: 'break-word',
          }}
        >
          Submitted identity documents and selfie for organizer verification.
        </p>

        {documentTiles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.5 }}>
            No document images uploaded.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))'
                : 'repeat(auto-fill, minmax(305px, 1fr))',
              gap: isMobile ? 12 : 14,
              marginBottom: 28,
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            {documentTiles.map(({ key, url }) => (
              <DocumentImageTile key={key} url={url} onPreview={setImagePreviewUrl} />
            ))}
          </div>
        )}

        <div style={{ marginBottom: 0, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>Verify selfie</h3>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-muted)',
              margin: '0 0 14px',
              lineHeight: 1.45,
              maxWidth: '100%',
              overflowWrap: 'break-word',
            }}
          >
            Live selfie to match the document photo.
          </p>
          {docs.selfie ? (
            <button
              type="button"
              onClick={() => setImagePreviewUrl(docs.selfie)}
              aria-label="View selfie full size"
              style={{
                width: '100%',
                maxWidth: 'min(320px, 100%)',
                minWidth: 0,
                margin: 0,
                padding: 0,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                aspectRatio: '1',
                background: 'var(--bg-input)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'block',
                boxSizing: 'border-box',
              }}
            >
              <img src={docs.selfie} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 'min(320px, 100%)',
                minWidth: 0,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                aspectRatio: '1',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-placeholder)', fontWeight: 500 }}>No image</span>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={!!imagePreviewUrl}
        onClose={() => setImagePreviewUrl(null)}
        title="Preview"
        size="lg"
        noPadding
        compactHeader
        scrollableBody={false}
        fillHeight
        panelMaxHeight="60vh"
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            width: '100%',
            padding: 28,
            boxSizing: 'border-box',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imagePreviewUrl ? (
            <img
              key={imagePreviewUrl}
              src={imagePreviewUrl}
              alt=""
              style={{
                minWidth: 0,
                minHeight: 0,
                maxWidth: 'min(100%, 480px)',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                objectPosition: 'center',
                display: 'block',
              }}
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleVerifyAction}
        loading={actLoading}
        variant={confirm?.type === 'reject' ? 'danger' : 'primary'}
        title={confirm?.type === 'verify' ? 'Verify organizer' : 'Reject verification'}
        confirmLabel={confirm?.type === 'verify' ? 'Verify' : 'Reject'}
        message={
          confirm?.type === 'verify'
            ? `Mark "${confirm?.prov.businessName}" as verified?`
            : `Reject organizer verification for "${confirm?.prov.businessName}"?`
        }
      />
    </div>
  );
}

function normalizeProvider(row) {
  const org = row.organizerVerification || row.organizer_verification;
  const rawDocs = org?.documents ?? row.documents;
  const fullName = (row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim() || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const derivedFirst = parts[0] || '';
  const derivedLast = parts.slice(1).join(' ');
  return {
    ...row,
    region: row.region ?? row.state ?? row.region_name,
    bankName: row.bankName ?? row.bank_name,
    accountNumber: row.accountNumber ?? row.account_number,
    firstName: row.firstName ?? row.first_name ?? derivedFirst,
    lastName: row.lastName ?? row.last_name ?? derivedLast,
    name: row.name || (derivedFirst && `${derivedFirst} ${derivedLast}`.trim()) || fullName,
    religion: row.religion ?? row.religion_preference,
    profileImageUrl: row.profileImageUrl ?? row.avatarUrl ?? row.profile_image_url,
    organizerVerification: {
      phone: org?.phone ?? row.phone,
      email: org?.email ?? row.email,
      documentType: org?.documentType ?? org?.document_type,
      documents: mergeDocuments(rawDocs),
    },
  };
}
