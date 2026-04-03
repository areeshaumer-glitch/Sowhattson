import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Calendar, ImageIcon, MapPin, Repeat, Ticket, Sparkles } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { useMobileHeaderTitle } from '../../components/ui/PageHeader';
import {
  formatExperienceTypeLabel,
  getExperienceStatus,
  inferRecurrenceKind,
  isExperienceRecurring,
  MOCK_EXPERIENCE_STATUSES,
} from '../../utils/experienceType';

const TITLE_POOL = [
  'Afrobeats Night', 'Jazz & Wine', 'Tech Summit', 'Comedy Fiesta', 'Food Festival',
  'Art Gallery Night', 'Yoga Retreat', 'Business Mixer', 'Film Festival', 'Dance Battle',
  'Wine Tasting', 'Street Carnival', 'Book Fair', 'Fashion Show', 'Sports Day',
];

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₦${Number(n).toLocaleString()}`;
}

function dash(v) {
  return v != null && String(v).trim() !== '' ? String(v) : '—';
}

function pickFirstPresent(row, keys) {
  if (!row || typeof row !== 'object') return null;
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return null;
}

function formatDetailDate(raw) {
  if (raw == null || String(raw).trim() === '') return '—';
  const t = Date.parse(String(raw));
  if (Number.isNaN(t)) return String(raw).trim();
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Same string resolution for media + activities so the preview modal always gets a real URL. */
function resolveImagePreviewUrl(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t || null;
  }
  if (typeof raw === 'object') {
    const u = raw.url ?? raw.src ?? raw.href;
    if (typeof u === 'string' && u.trim()) return u.trim();
  }
  return null;
}

function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => (typeof t === 'string' ? t : t?.name || t?.slug || '')).filter(Boolean);
  }
  return [];
}

function normalizeTickets(raw) {
  const base = {
    regular: { price: null, total: null },
    vip: { price: null, total: null },
    kids: { price: null, total: null },
  };
  if (!raw || typeof raw !== 'object') return base;
  const pick = (obj, keysPrice, keysTotal) => {
    let price = null;
    let total = null;
    for (const k of keysPrice) {
      if (obj[k] != null) { price = obj[k]; break; }
    }
    for (const k of keysTotal) {
      if (obj[k] != null) { total = obj[k]; break; }
    }
    return { price, total };
  };
  if (Array.isArray(raw)) {
    raw.forEach((t) => {
      const label = String(t?.category || t?.type || t?.name || '').toLowerCase();
      const slot = label.includes('vip') ? 'vip' : label.includes('kid') ? 'kids' : 'regular';
      base[slot] = {
        price: t.price ?? t.amount ?? base[slot].price,
        total: t.total ?? t.quantity ?? t.capacity ?? base[slot].total,
      };
    });
    return base;
  }
  base.regular = pick(raw.regular || raw.standard || {}, ['price', 'amount'], ['total', 'quantity', 'capacity']);
  base.vip = pick(raw.vip || {}, ['price', 'amount'], ['total', 'quantity', 'capacity']);
  base.kids = pick(raw.kids || raw.children || {}, ['price', 'amount'], ['total', 'quantity', 'capacity']);
  return base;
}

function normalizeActivities(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((a, i) => ({
    id: a.id ?? String(i),
    image: resolveImagePreviewUrl(a.image ?? a.imageUrl ?? a.photo ?? a.thumbnail),
    type: a.type ?? a.name ?? a.title ?? 'Activity',
    price: a.price ?? a.amount,
  }));
}

function normalizeMedia(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((m) => resolveImagePreviewUrl(m)).filter(Boolean);
  }
  const one = resolveImagePreviewUrl(raw);
  return one ? [one] : [];
}

function normalizeExperience(row) {
  if (!row || typeof row !== 'object') return null;
  const recurring = isExperienceRecurring(row);
  const kind = inferRecurrenceKind(row, recurring);

  const monthlyDates = row.monthlyDates ?? row.monthDates ?? row.datesOfMonth ?? row.recurrenceDates;
  const weeklyDays = row.weeklyDays ?? row.daysOfWeek ?? row.weekdays;

  return {
    id: String(row.id ?? ''),
    title: row.title ?? row.name ?? 'Experience',
    description: row.description ?? row.summary ?? '',
    tags: normalizeTags(row.tags ?? row.tagList),
    status: getExperienceStatus(row),
    experienceType: recurring ? 'recurring' : 'one_time',
    recurrenceKind: recurring ? kind : null,
    monthlyDates: Array.isArray(monthlyDates) ? monthlyDates.map(String) : [],
    weeklyDays: Array.isArray(weeklyDays) ? weeklyDays.map(String) : [],
    until: row.until ?? row.recurrenceEnd ?? row.endsAt ?? row.endDate ?? null,
    startDate: pickFirstPresent(row, [
      'startDate',
      'start_date',
      'startsAt',
      'start_at',
      'eventStart',
      'event_start',
      'beginDate',
      'begin_date',
    ]),
    endDate: pickFirstPresent(row, [
      'endDate',
      'end_date',
      'endsAt',
      'end_at',
      'eventEnd',
      'event_end',
      'finishDate',
      'finish_date',
    ]),
    location: row.location ?? row.address ?? row.venue ?? row.city,
    media: normalizeMedia(row.media ?? row.images ?? row.imageUrls ?? row.coverImage),
    tickets: normalizeTickets(row.tickets ?? row.ticketTiers),
    activities: normalizeActivities(row.activities ?? row.addOns ?? row.extras),
    provider: {
      id: row.provider?.id != null ? String(row.provider.id) : null,
      username: row.provider?.username ?? row.provider?.userName ?? row.provider?.handle,
      name: row.provider?.name ?? row.provider?.businessName,
      profileImageUrl: row.provider?.profileImageUrl ?? row.provider?.avatar ?? row.provider?.photo,
    },
  };
}

function mockExperienceDetail(id) {
  const n = Math.max(1, parseInt(String(id), 10) || 1);
  const idx = (n - 1) % TITLE_POOL.length;
  /** Must match list MOCK: `experienceType: i % 3 === 0 ? 'recurring' : 'one_time'` with id = i + 1. */
  const recurring = (n - 1) % 3 === 0;
  const seed = `exp${n}`;
  return normalizeExperience({
    id: String(id),
    title: TITLE_POOL[idx],
    description:
      'Join us for an unforgettable evening with curated sound, food partners, and a welcoming crowd. '
      + 'Doors open early for networking; main programme follows the headline set.',
    tags: ['Afrobeats', 'Classy', 'Live Music'].slice(0, 2 + (idx % 2)),
    /** Same index as list MOCK row `i` (id = i + 1). */
    status: MOCK_EXPERIENCE_STATUSES[idx],
    experienceType: recurring ? 'recurring' : 'one_time',
    recurrenceKind: recurring ? (idx % 2 === 0 ? 'monthly' : 'weekly') : null,
    monthlyDates: recurring && idx % 2 === 0 ? ['1', '15'] : [],
    weeklyDays: recurring && idx % 2 !== 0 ? ['Friday', 'Saturday'] : [],
    until: recurring ? '2026-12-31' : null,
    startDate: `2026-${String((idx % 9) + 3).padStart(2, '0')}-10`,
    endDate: recurring ? '2026-12-31' : `2026-${String((idx % 9) + 3).padStart(2, '0')}-12`,
    location: '12 Admiralty Way, Lekki Phase 1, Lagos',
    media: [
      `https://picsum.photos/seed/${seed}a/800/500`,
      `https://picsum.photos/seed/${seed}b/800/500`,
      `https://picsum.photos/seed/${seed}c/800/500`,
    ],
    tickets: {
      regular: { price: 15000, total: 200 },
      vip: { price: 45000, total: 40 },
      kids: { price: 7500, total: 30 },
    },
    activities: [
      { image: `https://picsum.photos/seed/${seed}act1/400/280`, type: 'Meet & greet', price: 5000 },
      { image: `https://picsum.photos/seed/${seed}act2/400/280`, type: 'Photo booth', price: 2000 },
    ],
    provider: {
      id: String(n),
      username: `provider_${n}`,
      name: `Provider ${n}`,
      profileImageUrl: `https://picsum.photos/seed/${seed}p/200/200`,
    },
  });
}

const detailLabelStyle = {
  fontSize: 11.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
};

const detailValueStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--text-primary)',
  lineHeight: 1.45,
};

function DetailRow({ label, children, narrow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <span style={detailLabelStyle}>{label}</span>
      <div
        style={{
          ...detailValueStyle,
          ...(narrow ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TagChip({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: 9999,
        fontSize: 12.5,
        fontWeight: 600,
        background: 'var(--primary-light)',
        color: 'var(--primary)',
      }}
    >
      {children}
    </span>
  );
}

export default function ExperienceDetailPage() {
  const { experienceId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useOutletContext() ?? {};
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const mobileTitle = loading ? 'Experience' : exp?.title || 'Experience';
  useMobileHeaderTitle(mobileTitle);

  const fetchExperience = useCallback(() => {
    if (!experienceId) return;
    setLoading(true);
    callApi({
      method: Method.GET,
      endPoint: api.getAdminEventById(experienceId),
      onSuccess(response) {
        const row = response.data ?? response.event ?? response;
        setExp(normalizeExperience(row));
        setLoading(false);
      },
      onError() {
        setExp(mockExperienceDetail(experienceId));
        setLoading(false);
      },
    });
  }, [experienceId]);

  useEffect(() => { fetchExperience(); }, [fetchExperience]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
    );
  }

  if (!exp) {
    return (
      <div style={{ padding: 24 }}>
        <Link to="/experiences" style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>← Back to experiences</Link>
        <p style={{ marginTop: 20, color: 'var(--text-muted)' }}>Experience not found.</p>
      </div>
    );
  }

  const recurring = exp.experienceType === 'recurring';
  const p = exp.provider;

  const ticketRows = [
    { key: 'regular', label: 'Regular ticket', ...exp.tickets.regular },
    { key: 'vip', label: 'VIP ticket', ...exp.tickets.vip },
    { key: 'kids', label: 'Kids ticket', ...exp.tickets.kids },
  ];

  const cardFull = { width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' };
  const cardPad = isMobile ? 18 : 22;

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div style={{ marginBottom: 22 }}>
        <button
          type="button"
          onClick={() => navigate('/experiences')}
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
          Experiences
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: isMobile ? 14 : 20,
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? 20 : 26,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.02em',
            flex: '1 1 min(0, 280px)',
            minWidth: 0,
            lineHeight: 1.25,
          }}
        >
          {exp.title}
        </h1>
        {exp.status ? (
          <span style={{ flexShrink: 0 }}>
            <StatusBadge status={exp.status} />
          </span>
        ) : null}
      </div>

      <div
        style={{
          width: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
          <Card padding={cardPad} style={cardFull}>
            <DetailRow label="Name" narrow={!!isMobile}>{exp.title}</DetailRow>
            <DetailRow label="Description" narrow={!!isMobile}>
              {exp.description ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{exp.description}</span>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label="Tags" narrow={!!isMobile}>
              {exp.tags.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {exp.tags.map((t) => (
                    <TagChip key={t}>{t}</TagChip>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </DetailRow>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                {[
                  ['Type', formatExperienceTypeLabel(exp)],
                  ['Start date', formatDetailDate(exp.startDate)],
                  ['End date', formatDetailDate(exp.endDate)],
                ].map(([lab, val]) => (
                  <div key={lab}>
                    <span style={{ ...detailLabelStyle, display: 'block', marginBottom: 4 }}>{lab}</span>
                    <div
                      style={{
                        ...detailValueStyle,
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  columnGap: 20,
                  rowGap: 6,
                  marginBottom: 12,
                }}
              >
                <span style={detailLabelStyle}>Type</span>
                <span style={detailLabelStyle}>Start date</span>
                <span style={detailLabelStyle}>End date</span>
                <div style={detailValueStyle}>{formatExperienceTypeLabel(exp)}</div>
                <div style={detailValueStyle}>{formatDetailDate(exp.startDate)}</div>
                <div style={detailValueStyle}>{formatDetailDate(exp.endDate)}</div>
              </div>
            )}
          </Card>

          {recurring && (() => {
            const schedule =
              exp.recurrenceKind === 'weekly' ? 'Weekly' : exp.recurrenceKind === 'monthly' ? 'Monthly' : '—';
            const datesOrDaysLabel = exp.recurrenceKind === 'monthly' ? 'Dates' : 'Days';
            const datesOrDaysValue =
              exp.recurrenceKind === 'monthly'
                ? (exp.monthlyDates.length ? exp.monthlyDates.join(', ') : '—')
                : exp.recurrenceKind === 'weekly'
                  ? (exp.weeklyDays.length ? exp.weeklyDays.join(', ') : '—')
                  : '—';
            const recurFieldLabel = {
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: 4,
              display: 'block',
            };
            return (
              <Card padding={cardPad} style={cardFull}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    minWidth: 0,
                  }}
                >
                  <Repeat size={18} color="var(--primary)" />
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0 }}>Recurrence</h2>
                </div>
                <div
                  style={
                    isMobile
                      ? { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }
                      : {
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: '12px 20px',
                          alignItems: 'start',
                        }
                  }
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={recurFieldLabel}>Schedule type</span>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.45,
                        ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                      }}
                    >
                      {schedule}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={recurFieldLabel}>{datesOrDaysLabel}</span>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.45,
                        ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                      }}
                    >
                      {datesOrDaysValue}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={recurFieldLabel}>Until</span>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: 1.45,
                        ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                      }}
                    >
                      {dash(exp.until)}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}

          <Card padding={cardPad} style={cardFull}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                minWidth: 0,
              }}
            >
              <MapPin size={18} color="var(--primary)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0 }}>Location</h2>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
              }}
            >
              {dash(typeof exp.location === 'object' ? exp.location?.label ?? exp.location?.address : exp.location)}
            </p>
          </Card>

          <Card padding={cardPad} style={cardFull}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                minWidth: 0,
              }}
            >
              <ImageIcon size={18} color="var(--primary)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0 }}>Media</h2>
            </div>
            {exp.media.length ? (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  overflowX: isMobile ? 'visible' : 'auto',
                  paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch',
                  width: '100%',
                  minWidth: 0,
                }}
              >
                {exp.media.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    style={{
                      flex: isMobile ? '1 1 100%' : '0 0 auto',
                      width: isMobile ? '100%' : 280,
                      maxWidth: isMobile ? '100%' : 280,
                      minWidth: 0,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      background: 'var(--bg-input)',
                    }}
                  >
                    <div style={{ aspectRatio: '16/11', background: 'var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const u = resolveImagePreviewUrl(url);
                          if (u) setImagePreviewUrl(u);
                        }}
                        aria-label="View image full size"
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: 0,
                          margin: 0,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'block',
                          fontFamily: 'inherit',
                          background: 'transparent',
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No images uploaded.</p>
            )}
          </Card>

          <Card padding={cardPad} style={cardFull}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                minWidth: 0,
              }}
            >
              <Ticket size={18} color="var(--primary)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0 }}>Tickets</h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))'
                  : 'repeat(3, minmax(0, 1fr))',
                gap: 14,
                width: '100%',
                minWidth: 0,
              }}
            >
              {ticketRows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    minWidth: 0,
                    padding: isMobile ? 12 : 14,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{row.label}</p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: isMobile ? 12 : 10,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Price</span>
                      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(row.price)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total tickets</span>
                      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>{dash(row.total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding={cardPad} style={cardFull}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                minWidth: 0,
              }}
            >
              <Sparkles size={18} color="var(--primary)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0 }}>Activities</h2>
            </div>
            {exp.activities.length ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile
                    ? 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))'
                    : 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: isMobile ? 12 : 14,
                  ...(isMobile ? { width: '100%' } : {}),
                }}
              >
                {exp.activities.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      ...(isMobile ? { minWidth: 0 } : {}),
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      background: 'var(--bg-input)',
                    }}
                  >
                    <div style={{ aspectRatio: '16/11', background: 'var(--border)' }}>
                      {a.image ? (
                        <button
                          type="button"
                          onClick={() => {
                            const u = resolveImagePreviewUrl(a.image);
                            if (u) setImagePreviewUrl(u);
                          }}
                          aria-label={`View ${dash(a.type)} image full size`}
                          style={{
                            width: '100%',
                            height: '100%',
                            padding: 0,
                            margin: 0,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'block',
                            fontFamily: 'inherit',
                            background: 'transparent',
                          }}
                        >
                          <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                        </button>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <Calendar size={28} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: isMobile ? 10 : 12 }}>
                      <p
                        style={{
                          margin: '0 0 6px',
                          fontSize: 13,
                          fontWeight: 700,
                          ...(isMobile ? { wordBreak: 'break-word' } : {}),
                        }}
                      >
                        {dash(a.type)}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(a.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>No activities listed.</p>
            )}
          </Card>

          <Card padding={cardPad} style={cardFull}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>Provider</h2>
            {p?.id ? (
              <Link
                to={`/providers/${p.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  textDecoration: 'none',
                  color: 'inherit',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {p.profileImageUrl ? (
                  <img
                    src={p.profileImageUrl}
                    alt=""
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {(p?.username || p?.name || 'P')[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : '1 1 auto', maxWidth: '100%' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                    }}
                  >
                    {p.username != null && String(p.username).trim()
                      ? `@${String(p.username).replace(/^@/, '')}`
                      : '—'}
                  </p>
                  {p.name && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12.5,
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                      }}
                    >
                      {p.name}
                    </p>
                  )}
                </div>
              </Link>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {p?.profileImageUrl ? (
                  <img
                    src={p.profileImageUrl}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: 'var(--primary)',
                    }}
                  >
                    {(p?.username || 'P')[0]?.toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: isMobile ? '1 1 100%' : undefined, maxWidth: '100%' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                    }}
                  >
                    {p?.username != null && String(p.username).trim()
                      ? `@${String(p.username).replace(/^@/, '')}`
                      : '—'}
                  </p>
                  {p?.name && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12.5,
                        color: 'var(--text-muted)',
                        ...(isMobile ? { overflowWrap: 'break-word', wordBreak: 'break-word' } : {}),
                      }}
                    >
                      {p.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
      </div>

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
    </div>
  );
}
