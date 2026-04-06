import { useState, useEffect, useCallback, useMemo } from 'react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { ListPageToolbar } from '../../components/ui/PageHeader';
import { useDebounce } from '../../hooks/useDebounce';

const LIMIT = 20;
/** Client-side filter over a larger fetch when search is active. */
const CLIENT_REVIEW_SEARCH_LIMIT = 300;

const RATING_OPTIONS = [
  { label: 'All ratings', value: '' },
  { label: '5 stars', value: '5' },
  { label: '4 stars', value: '4' },
  { label: '3 stars', value: '3' },
  { label: '2 stars', value: '2' },
  { label: '1 star', value: '1' },
];

/** Display name from admin GET /payment-reviews `userId` + nested `profile`. */
function reviewReviewerName(userId) {
  if (!userId) return '—';
  const p = userId.profile;
  const fromParts = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  if (p?.username?.trim()) return p.username.trim();
  if (p?.businessName?.trim()) return p.businessName.trim();
  if (userId.email?.trim()) return userId.email.trim();
  return '—';
}

function reviewReviewerEmail(userId) {
  const e = userId?.email;
  return typeof e === 'string' && e.trim() ? e.trim() : '';
}

function formatReviewDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function reviewBody(row) {
  return row.text ?? row.comment ?? '';
}

function isExplorerReview(row) {
  return String(row?.userId?.role ?? '').toLowerCase() === 'explorer';
}

function reviewRowMatchesQuery(row, qLower) {
  if (!qLower) return true;
  const name = reviewReviewerName(row.userId);
  const email = reviewReviewerEmail(row.userId);
  const body = reviewBody(row);
  const hay = [name, email, body].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(qLower);
}

export default function ReviewsPage() {
  const [reviewSearch, setReviewSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const debouncedReviewSearch = useDebounce(reviewSearch, 350);
  const queryLower = debouncedReviewSearch.trim().toLowerCase();
  const hasSearchQuery = queryLower.length > 0;
  const requestPage = hasSearchQuery ? 1 : page;
  const requestLimit = hasSearchQuery ? CLIENT_REVIEW_SEARCH_LIMIT : LIMIT;

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const q = debouncedReviewSearch.trim();
    callApi({
      method: Method.GET,
      endPoint: api.getAdminPaymentReviews({
        page: requestPage,
        limit: requestLimit,
        sortBy: 'createdAt',
        sortOrder: -1,
        rating: ratingFilter === '' ? undefined : ratingFilter,
        search: q,
      }),
      onSuccess(response) {
        const raw = response.reviews ?? response.data ?? [];
        const list = Array.isArray(raw) ? raw.filter(isExplorerReview) : [];
        setReviews(list);
        if (!q) {
          const pg = response.pagination;
          if (pg && typeof pg.total === 'number') {
            setTotal(pg.total);
            setTotalPages(
              typeof pg.pages === 'number' && pg.pages >= 0
                ? Math.max(1, pg.pages)
                : Math.max(1, Math.ceil(pg.total / (pg.limit || LIMIT))),
            );
          } else {
            setTotal(list.length);
            setTotalPages(Math.max(1, Math.ceil(list.length / LIMIT)));
          }
        }
        setLoading(false);
      },
      onError() {
        setReviews([]);
        setTotal(0);
        setTotalPages(0);
        setLoading(false);
      },
    });
  }, [requestPage, requestLimit, ratingFilter, debouncedReviewSearch]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setPage(1);
  }, [debouncedReviewSearch, ratingFilter]);

  const filteredReviews = useMemo(() => {
    if (!queryLower) return reviews;
    return reviews.filter((row) => reviewRowMatchesQuery(row, queryLower));
  }, [reviews, queryLower]);

  const displayReviews = useMemo(() => {
    if (!queryLower) return reviews;
    const start = (page - 1) * LIMIT;
    return filteredReviews.slice(start, start + LIMIT);
  }, [reviews, filteredReviews, queryLower, page]);

  const displayTotal = queryLower ? filteredReviews.length : total;
  const displayTotalPages = queryLower
    ? Math.max(1, Math.ceil(filteredReviews.length / LIMIT))
    : totalPages;

  const stars = (n) => {
    const r = Math.min(5, Math.max(0, Number(n) || 0));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  const colQ = { width: '25%' };

  const columns = [
    {
      key: 'userId',
      label: 'Explorer',
      ...colQ,
      wrap: true,
      render: (_, row) => {
        const u = row.userId;
        const name = reviewReviewerName(u);
        const email = reviewReviewerEmail(u);
        const emailDisplay =
          email.length > 22 ? `${email.slice(0, 20)}…` : email;
        return (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }} title={name !== '—' ? name : undefined}>
              {name}
            </p>
            {email ? (
              <p
                style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}
                title={email}
              >
                {emailDisplay}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      ...colQ,
      render: (v, row) => {
        const d = v ?? row.created_at ?? row.date;
        return (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{formatReviewDate(d)}</span>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      ...colQ,
      align: 'center',
      render: (v) => (
        <span style={{ color: 'var(--warning)', fontSize: 13, letterSpacing: 1 }}>{stars(v)}</span>
      ),
    },
    {
      key: 'text',
      label: 'Comment',
      ...colQ,
      wrap: true,
      render: (_, row) => (
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {reviewBody(row) || '—'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <ListPageToolbar title="Explorer reviews">
        <SearchBar
          value={reviewSearch}
          onChange={setReviewSearch}
          placeholder="Search by explorer or comment..."
          style={{ flex: '1 1 200px', maxWidth: 380, minWidth: 160 }}
        />
        <Select
          value={ratingFilter}
          onChange={setRatingFilter}
          options={RATING_OPTIONS}
          style={{ width: 180, flexShrink: 0 }}
        />
      </ListPageToolbar>
      <DataTable
        columns={columns}
        data={displayReviews}
        isLoading={loading}
        emptyMessage="No explorer reviews on this page."
        rowKey="_id"
        fixedLayout
        minWidth={640}
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
