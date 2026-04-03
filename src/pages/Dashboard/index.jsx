import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { DollarSign, Ticket, Users } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { StatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';

/** DateRangeFilter values → GET /admin/dashboard/stats ?period= */
const PERIOD_UI_TO_API = { weekly: 'week', monthly: 'month', yearly: 'year' };

function toApiPeriod(uiPeriod) {
  return PERIOD_UI_TO_API[uiPeriod] ?? 'week';
}

function emptyDashboard() {
  return {
    revenue: { total: 0, formatted: null, change: 0 },
    tickets: { total: 0, change: 0, chart: [] },
    users: { total: 0, change: 0, chart: [] },
    topEvents: [],
  };
}

function normalizeDashboardResponse(res) {
  const stats = res?.stats ?? {};
  const tr = stats.totalRevenue ?? {};
  const ts = stats.ticketsSold ?? {};
  const te = stats.totalExplorers ?? {};

  const explorerTrend = (res?.explorerTrend ?? []).map((p) => ({
    date: p.label ?? '',
    value: Number(p.value) || 0,
  }));
  const ticketSales = (res?.ticketSales ?? []).map((p) => ({
    date: p.label ?? '',
    value: Number(p.value) || 0,
  }));

  const topExperiences = (res?.topExperiences ?? []).map((e) => ({
    id: e.id,
    title: e.name ?? '',
    provider: e.provider ?? '',
    ticketsSold: e.tickets ?? 0,
    revenue: e.revenue ?? 0,
    revenueFormatted: e.revenueFormatted,
    status: e.status ?? 'active',
  }));

  return {
    revenue: {
      total: Number(tr.value) || 0,
      formatted: typeof tr.formatted === 'string' ? tr.formatted : null,
      change: tr.percentChange != null ? Number(tr.percentChange) : 0,
    },
    tickets: {
      total: Number(ts.value) || 0,
      change: ts.percentChange != null ? Number(ts.percentChange) : 0,
      chart: ticketSales,
    },
    users: {
      total: Number(te.value) || 0,
      change: te.percentChange != null ? Number(te.percentChange) : 0,
      chart: explorerTrend,
    },
    topEvents: topExperiences,
  };
}

const fmt = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1E1E1E', borderRadius:8, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ fontSize:13, fontWeight:700, color:p.color||'#fff' }}>
          {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [period, setPeriod] = useState('weekly');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statGridHover, setStatGridHover] = useState(null);

  const fetchStats = useCallback(() => {
    setLoading(true);
    const apiPeriod = toApiPeriod(period);
    callApi({
      method: Method.GET,
      endPoint: api.getDashboardStats(apiPeriod),
      onSuccess(response) {
        setStats(normalizeDashboardResponse(response));
        setLoading(false);
      },
      onError(err) {
        setStats(emptyDashboard());
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  }, [period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const s = stats ?? emptyDashboard();

  const revenueDisplay = s.revenue.formatted ?? fmt(s.revenue.total).replace(/^\$/, '');

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <PageHeader
        title="Dashboard"
        actions={<DateRangeFilter value={period} onChange={setPeriod} />}
      />

      <div style={{ marginBottom: 24 }}>
        <div
          className="dashboard-stat-grid"
          onMouseLeave={() => setStatGridHover(null)}
        >
          <StatCard
            title="Total Revenue"
            value={revenueDisplay}
            change={s.revenue.change}
            icon={<DollarSign size={20} />}
            statKey="revenue"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/payouts"
            ariaLabel="View payouts and revenue"
          />
          <StatCard
            title="Tickets Sold"
            value={s.tickets.total.toLocaleString()}
            change={s.tickets.change}
            icon={<Ticket size={20} />}
            statKey="tickets"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/tickets"
            ariaLabel="View tickets"
          />
          <StatCard
            title="Total Explorers"
            value={s.users.total.toLocaleString()}
            change={s.users.change}
            icon={<Users size={20} />}
            statKey="explorers"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/explorers"
            ariaLabel="View explorers"
          />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap:20, marginBottom:20 }}>
        <Card style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Explorer Trend</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.users.total.toLocaleString()} total explorers for selected period</p>
            </div>
            <div style={{
              padding:'4px 10px',
              borderRadius:'var(--radius-full)',
              background: s.users.change >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: s.users.change >= 0 ? 'var(--success)' : 'var(--danger)',
              fontSize:12,
              fontWeight:700,
            }}
            >
              {s.users.change >= 0 ? '+' : ''}{Number(s.users.change).toFixed(1)}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={s.users.chart} margin={{ top: 8, right: 8, left: 8, bottom: 28 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#66307B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#66307B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', dy: 8 }}
                axisLine={false}
                tickLine={false}
                height={36}
              />
              <YAxis
                width={44}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="New Explorers" stroke="#66307B" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r:5, fill:'#66307B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, minHeight: 44 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Ticket Sales</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.tickets.total.toLocaleString()} sold this period</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={s.tickets.chart} margin={{ top: 8, right: 8, left: 8, bottom: 28 }} barSize={26} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', dy: 8 }}
                axisLine={false}
                tickLine={false}
                height={36}
              />
              <YAxis width={44} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickMargin={8} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Tickets" radius={[4,4,0,0]} fill="url(#barGrad)">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#66307B" stopOpacity={1} />
                    <stop offset="100%" stopColor="#C89A4F" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Top Experiences</h3>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                {['Experience','Provider','Tickets','Revenue','Status'].map((h) => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:12.5, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.topEvents.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '20px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                    No experiences in this period.
                  </td>
                </tr>
              ) : null}
              {s.topEvents.map((ev, i) => (
                <tr key={ev.id ?? i} style={{ borderBottom: i < s.topEvents.length - 1 ? '1px solid var(--border)' : undefined }}>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</td>
                  <td style={{ padding:'11px 12px', fontSize:12.5, color:'var(--text-secondary)' }}>{ev.provider}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500 }}>{ev.ticketsSold}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500, color:'var(--primary)' }}>{ev.revenueFormatted ?? fmt(ev.revenue)}</td>
                  <td style={{ padding:'11px 12px' }}><StatusBadge status={ev.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
