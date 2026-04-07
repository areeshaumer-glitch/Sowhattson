import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Info, Landmark, XCircle } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import { formatStatusLabel } from '../../utils/formatStatusLabel';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';
import { useMobileHeaderTitle } from '../../components/ui/PageHeader';
import { PresignedImage } from '../../components/ui/PresignedImage';

function emptyDocuments() {
  return {
    identityCard: { front: null, back: null },
    passport: { front: null, back: null },
    drivingLicense: { front: null, back: null },
    nationalIdCard: { front: null, back: null },
    selfie: null,
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

/** Backend `profile.idVerification` + `selfieVerificationImage` → organizer document shape. */
function documentsFromProfileIdVerification(profile) {
  if (!profile || typeof profile !== 'object') return undefined;
  const iv = profile.idVerification || profile.id_verification;
  const selfie =
    profile.selfieVerificationImage
    ?? profile.selfie_verification_image
    ?? null;
  if (!iv || typeof iv !== 'object') {
    return selfie ? { ...emptyDocuments(), selfie } : undefined;
  }
  const front = iv.frontImage ?? iv.front_image ?? null;
  const back = iv.backImage ?? iv.back_image ?? null;
  if (!front && !back && !selfie) return undefined;
  const method = String(iv.method ?? 'identity_card').toLowerCase();
  const pair = { front, back };
  const docs = { ...emptyDocuments(), selfie: selfie || null };
  if (method.includes('passport')) docs.passport = pair;
  else if (method.includes('driving') || method.includes('license')) docs.drivingLicense = pair;
  else if (method.includes('national')) docs.nationalIdCard = pair;
  else docs.identityCard = pair;
  return docs;
}

function formatIdMethodLabel(method) {
  const key = String(method ?? '').trim().toLowerCase();
  if (!key) return undefined;
  const labels = {
    identity_card: 'Identity card',
    driving_license: 'Driving license',
    passport: 'Passport',
    national_id_card: 'National ID',
  };
  if (labels[key]) return labels[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
        <PresignedImage src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
      </div>
    </button>
  );
}

export default function ProviderDetailPage() {
  const { providerId } = useParams();
  const location = useLocation();
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

  useEffect(() => {
    setLoading(true);
    const raw = location.state?.rawUser;
    const id = String(providerId ?? '');
    const rawId = raw && typeof raw === 'object' ? String(raw._id ?? raw.id ?? '') : '';
    if (raw && rawId === id) {
      setProvider(normalizeProviderFromUser(raw));
    } else {
      setProvider(null);
    }
    setLoading(false);
  }, [providerId, location.key, location.state]);

  const handleVerifyAction = () => {
    if (!confirm || !provider) return;
    setActLoading(true);
    const confirmRef = confirm;
    callApi({
      method: Method.PATCH,
      endPoint: api.verifyAdminProvider(provider.id),
      bodyParams: { status: confirmRef.type === 'verify' ? 'verified' : 'rejected' },
      onSuccess(responseData) {
        setConfirm(null);
        setActLoading(false);
        const row = responseData?.data ?? responseData?.user ?? responseData?.provider ?? responseData;
        const fromUser = row && typeof row === 'object' && !Array.isArray(row) ? normalizeProviderFromUser(row) : null;
        if (fromUser) {
          setProvider(fromUser);
          return;
        }
        const looksLikeProvider = row && typeof row === 'object' && !Array.isArray(row)
          && (row.verificationStatus != null || row.businessName != null || row.name != null || row.id != null);
        if (looksLikeProvider) {
          setProvider(normalizeProvider(row));
          return;
        }
        setProvider((prev) => {
          if (!prev) return prev;
          const nextStatus = confirmRef.type === 'verify' ? 'verified' : 'rejected';
          return {
            ...prev,
            verificationStatus: nextStatus,
            isVerified: confirmRef.type === 'verify',
          };
        });
      },
      onError(err) {
        setConfirm(null);
        setActLoading(false);
        notifyError(getApiErrorMessage(err));
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
        <p style={{ marginTop: 20, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.5 }}>
          No provider data loaded. Open a provider from the providers list (eye icon) to view details here. Refreshing this page clears the selection.
        </p>
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
          <PresignedImage
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
              <PresignedImage src={docs.selfie} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
            <PresignedImage
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

function displayNameFromUser(user) {
  if (!user || typeof user !== 'object') return '';
  const p = user.profile && typeof user.profile === 'object' ? user.profile : null;
  if (p) {
    const parts = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    if (parts) return parts;
    if (String(p.username ?? '').trim()) return String(p.username).trim();
    if (String(p.businessName ?? '').trim()) return String(p.businessName).trim();
  }
  const top = String(user.name ?? user.fullName ?? user.displayName ?? '').trim();
  if (top) return top;
  const email = String(user.email ?? '').trim();
  if (email.includes('@')) return email.split('@')[0].trim();
  return '';
}

/** Maps GET /users/:id document into the detail view shape (same field sources as providers list). */
function normalizeProviderFromUser(user) {
  if (!user || typeof user !== 'object') return null;
  const id = String(user._id ?? user.id ?? '');
  if (!id) return null;
  const p = user.profile && typeof user.profile === 'object' ? user.profile : null;
  const firstName = String(p?.firstName ?? user.firstName ?? user.first_name ?? '').trim();
  const lastName = String(p?.lastName ?? user.lastName ?? user.last_name ?? '').trim();
  const person = [firstName, lastName].filter(Boolean).join(' ').trim();
  const businessName =
    String(p?.businessName ?? '').trim()
    || String(p?.username ?? '').trim()
    || displayNameFromUser(user)
    || '—';
  const loc = p?.location && typeof p.location === 'object' ? p.location : null;
  const region = String(loc?.country ?? user.country ?? '').trim() || undefined;
  const profileImageUrl =
    String(p?.profilePicture ?? p?.profile_picture ?? user.profileImageUrl ?? user.avatarUrl ?? '').trim() || undefined;

  const isAdminVerified = user.isAdminVerified === true;
  const vsRaw = String(user.verificationStatus ?? user.verification_status ?? '').toLowerCase();
  let verificationStatus = 'pending';
  if (isAdminVerified || vsRaw === 'verified') verificationStatus = 'verified';
  else if (vsRaw === 'rejected') verificationStatus = 'rejected';
  else if (vsRaw === 'not_submitted') verificationStatus = 'pending';

  const org = user.organizerVerification || user.organizer_verification;
  const iv = p?.idVerification || p?.id_verification;
  const rawDocs =
    org?.documents
    ?? user.documents
    ?? p?.documents
    ?? documentsFromProfileIdVerification(p);

  const documentType =
    org?.documentType
    ?? org?.document_type
    ?? formatIdMethodLabel(iv?.method);

  const row = {
    id,
    _id: user._id ?? id,
    email: user.email,
    phone: user.phone,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    name: person || businessName,
    businessName,
    region,
    createdAt: user.createdAt ?? user.created_at,
    profileImageUrl,
    verificationStatus,
    isVerified: isAdminVerified,
    bankName:
      user.bankName
      ?? user.bank_name
      ?? user.providerBank?.bankName
      ?? user.paystackAccountName,
    accountNumber:
      user.accountNumber
      ?? user.account_number
      ?? user.bankAccountNumber
      ?? user.paystackAccountNumber
      ?? user.providerBank?.accountNumber,
    organizerVerification: org || {
      phone: user.phone ?? p?.phone,
      email: user.email ?? p?.email,
      documentType,
      documents: rawDocs,
    },
  };
  return normalizeProvider(row);
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
    bankName: row.bankName ?? row.bank_name ?? row.paystackAccountName,
    accountNumber:
      row.accountNumber ?? row.account_number ?? row.paystackAccountNumber,
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
