import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

function ToggleRow({ label, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      <button
        type="button"
        onClick={() => setChecked(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: checked ? 'var(--primary)' : 'var(--border)',
          border: 'none', cursor: 'pointer',
          position: 'relative', transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

export default function SettingsNotificationsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <Card style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ color: 'var(--primary)' }}><Bell size={18} /></span>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Notification settings</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.45 }}>
          Choose which admin alerts you want to receive.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { label: 'Send welcome email on explorer signup', key: 'welcome' },
              { label: 'Notify admin on new provider registration', key: 'newProvider' },
              { label: 'Notify admin on new payment', key: 'newPayment' },
              { label: 'Enable push notifications', key: 'push' },
            ].map((item) => (
              <ToggleRow key={item.key} label={item.label} defaultChecked />
            ))}
          </div>

          {saved && (
            <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, margin: 0 }}>
              Notification preferences saved.
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth style={{ marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Save
          </Button>
        </form>
      </Card>
    </div>
  );
}
