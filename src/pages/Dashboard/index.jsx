import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, CalendarDays, Ticket, Store, Users, CreditCard } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { DateRangeFilter } from '../../components/ui/DateRangeFilter';
import { StatusBadge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';

const generateChart = (period) => {
  const labels = {
    today:   ['12am','3am','6am','9am','12pm','3pm','6pm','9pm'],
    weekly:  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    monthly: ['W1','W2','W3','W4'],
    yearly:  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  };
  return labels[period].map((date) => ({
    date,
    revenue: Math.round(Math.random() * 8000 + 1000),
    tickets: Math.round(Math.random() * 200 + 20),
    explorers: Math.round(Math.random() * 60 + 5),
  }));
};

const mockStats = (period) => {
  const chart = generateChart(period);
  return {
    revenue:   { total: 124500, change: 12.5, chart: chart.map(d => ({ date: d.date, value: d.revenue })) },
    events:    { total: 342,    change: 8.2,  chart: chart.map(d => ({ date: d.date, value: Math.round(Math.random()*15+2) })) },
    tickets:   { total: 8740,   change: 23.1, chart: chart.map(d => ({ date: d.date, value: d.tickets })) },
    providers: { total: 89,     change: 5.3,  active: 74 },
    users:     { total: 3210,   change: 18.7, chart: chart.map(d => ({ date: d.date, value: d.explorers })) },
    payments:  { total: 1842,   change: 9.4,  chart: chart.map(d => ({ date: d.date, value: Math.round(Math.random() * 80 + 40) })) },
    topEvents: [
      { id:'1', title:'Afrobeats Night',  provider:'TxEvents',  category:'nightlife',  ticketsSold:240, revenue:12000, status:'active' },
      { id:'2', title:'Jazz & Wine',      provider:'LuxEvents', category:'concert',    ticketsSold:180, revenue:9000,  status:'active' },
      { id:'3', title:'Comedy Fiesta',    provider:'PrimeShow', category:'theatre',    ticketsSold:150, revenue:7500,  status:'active' },
      { id:'4', title:'Tech Summit 2026', provider:'TechHub',   category:'conference', ticketsSold:320, revenue:32000, status:'completed' },
      { id:'5', title:'Food Festival',    provider:'GastroPro', category:'food',       ticketsSold:580, revenue:17400, status:'active' },
    ],
    topProviders: [
      { id:'1', name:'TxEvents',  businessName:'TxEvents Ltd',      eventsCount:18, revenue:54000, rating:4.8 },
      { id:'2', name:'LuxEvents', businessName:'LuxEvents Co',       eventsCount:12, revenue:38000, rating:4.6 },
      { id:'3', name:'PrimeShow', businessName:'PrimeShow Inc',      eventsCount:9,  revenue:22000, rating:4.5 },
      { id:'4', name:'TechHub',   businessName:'TechHub Nigeria',    eventsCount:6,  revenue:48000, rating:4.9 },
    ],
    recentTransactions: [
      { id:'t1', user:'Amara Osei',   event:'Afrobeats Night', amount:5000,  status:'success',  date:'2026-03-27' },
      { id:'t2', user:'Fatima Ali',   event:'Jazz & Wine',     amount:5000,  status:'success',  date:'2026-03-27' },
      { id:'t3', user:'Kwame Mensah', event:'Tech Summit',     amount:10000, status:'pending',  date:'2026-03-26' },
      { id:'t4', user:'Zara Diallo',  event:'Comedy Fiesta',   amount:5000,  status:'refunded', date:'2026-03-25' },
      { id:'t5', user:'Emeka Uba',    event:'Food Festival',   amount:3000,  status:'success',  date:'2026-03-25' },
    ],
  };
};

const categoryData = [
  { name:'Nightlife', value:35 }, { name:'Concert', value:25 },
  { name:'Sports',   value:15 }, { name:'Theatre', value:12 }, { name:'Other', value:13 },
];
const PIE_COLORS = ['#66307B','#C89A4F','#3DD598','#00CFE8','#FF9F43'];

const fmt = (n) =>
  n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${(n/1_000).toFixed(1)}K`
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
    callApi({
      method: Method.GET,
      endPoint: api.getDashboardStats(period),
      onSuccess(response) {
        setStats(response.stats ?? response.data ?? response);
        setLoading(false);
      },
      onError() {
        setStats(mockStats(period));
        setLoading(false);
      },
    });
  }, [period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const s = stats ?? mockStats(period);
  const paymentsTotal = s.payments?.total ?? 1842;
  const paymentsChange = s.payments?.change ?? 9.4;

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
            value={fmt(s.revenue.total).replace('$', '')}
            change={s.revenue.change}
            icon={<DollarSign size={20} />}
            statKey="revenue"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/payments"
            ariaLabel="View payments and revenue"
          />
          <StatCard
            title="Experiences"
            value={s.events.total.toLocaleString()}
            change={s.events.change}
            icon={<CalendarDays size={20} />}
            statKey="experiences"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/experiences"
            ariaLabel="View experiences"
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
            title="Providers"
            value={s.providers.total.toLocaleString()}
            change={s.providers.change}
            icon={<Store size={20} />}
            statKey="providers"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/providers"
            ariaLabel="View providers"
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
          <StatCard
            title="Payments"
            value={paymentsTotal.toLocaleString()}
            change={paymentsChange}
            icon={<CreditCard size={20} />}
            statKey="payments"
            hoveredKey={statGridHover}
            onHoverEnter={setStatGridHover}
            loading={loading}
            to="/payments"
            ariaLabel="View payments"
          />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:20, marginBottom:24 }}>
        <Card style={{ gridColumn:'span 2', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Revenue Trend</h3>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{fmt(s.revenue.total)} total for selected period</p>
            </div>
            <div style={{ padding:'4px 10px', borderRadius:'var(--radius-full)', background:'var(--success-bg)', color:'var(--success)', fontSize:12, fontWeight:700 }}>
              +{s.revenue.change}%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.revenue.chart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#66307B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#66307B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v>=1000?`${(v/1000).toFixed(0)}k`:v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Revenue" stroke="#66307B" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r:5, fill:'#66307B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ minWidth:0 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Ticket Sales</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:18 }}>{s.tickets.total.toLocaleString()} sold this period</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.tickets.chart} barSize={14} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
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

        <Card style={{ minWidth:0 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Experiences by Category</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Distribution across categories</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" cx="50%" cy="45%" outerRadius={72} innerRadius={40} paddingAngle={3}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ minWidth:0 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Explorer Growth</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:18 }}>{s.users.total.toLocaleString()} total explorers</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={s.users.chart}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C89A4F" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C89A4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="New Explorers" stroke="#C89A4F" strokeWidth={2.5} fill="url(#userGrad)" dot={false} activeDot={{ r:5, fill:'#C89A4F' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))', gap:20, marginBottom:24 }}>
        <Card>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Top Experiences</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--border)' }}>
                  {['Experience','Provider','Tickets','Revenue','Status'].map((h) => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12.5, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.topEvents.map((ev, i) => (
                  <tr key={ev.id} style={{ borderBottom: i < s.topEvents.length-1 ? '1px solid var(--border)' : undefined }}>
                    <td style={{ padding:'10px', fontSize:13, fontWeight:500, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</td>
                    <td style={{ padding:'10px', fontSize:12.5, color:'var(--text-secondary)' }}>{ev.provider}</td>
                    <td style={{ padding:'10px', fontSize:13, fontWeight:500 }}>{ev.ticketsSold}</td>
                    <td style={{ padding:'10px', fontSize:13, fontWeight:500, color:'var(--primary)' }}>{fmt(ev.revenue)}</td>
                    <td style={{ padding:'10px' }}><StatusBadge status={ev.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Top Providers</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:360 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid var(--border)' }}>
                  {['Provider','Experiences','Revenue','Rating'].map((h) => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:12.5, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.topProviders.map((prov, i) => (
                  <tr key={prov.id} style={{ borderBottom: i < s.topProviders.length-1 ? '1px solid var(--border)' : undefined }}>
                    <td style={{ padding:'10px' }}>
                      <p style={{ fontSize:13, fontWeight:500 }}>{prov.businessName}</p>
                      <p style={{ fontSize:11.5, color:'var(--text-muted)' }}>{prov.name}</p>
                    </td>
                    <td style={{ padding:'10px', fontSize:13, fontWeight:500 }}>{prov.eventsCount}</td>
                    <td style={{ padding:'10px', fontSize:13, fontWeight:500, color:'var(--primary)' }}>{fmt(prov.revenue)}</td>
                    <td style={{ padding:'10px', fontSize:12.5, fontWeight:500, color:'var(--warning)' }}>★ {prov.rating.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Recent Transactions</h3>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--border)' }}>
                {['Explorer','Experience','Amount','Status','Date'].map((h) => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:12.5, fontWeight:700, color:'var(--text-primary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.recentTransactions.map((tx, i) => (
                <tr key={tx.id} style={{ borderBottom: i < s.recentTransactions.length-1 ? '1px solid var(--border)' : undefined }}>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500 }}>{tx.user}</td>
                  <td style={{ padding:'11px 12px', fontSize:12.5, color:'var(--text-secondary)' }}>{tx.event}</td>
                  <td style={{ padding:'11px 12px', fontSize:13, fontWeight:500, color:'var(--primary)' }}>{fmt(tx.amount)}</td>
                  <td style={{ padding:'11px 12px' }}><StatusBadge status={tx.status} /></td>
                  <td style={{ padding:'11px 12px', fontSize:12.5, color:'var(--text-muted)' }}>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
