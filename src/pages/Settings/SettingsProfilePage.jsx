import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function SettingsProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  const adminEmail =
    user?.email || user?.identifier || user?.username || '';

  // Initial state runs before persist rehydration; sync name when store profile fields change (not on every keystroke).
  const storeProfileKey = user
    ? `${user.id ?? ''}|${user.email ?? ''}|${user.identifier ?? ''}|${user.username ?? ''}|${user.name ?? ''}`
    : '';
  useEffect(() => {
    const u = useAuthStore.getState().user;
    if (!u) {
      setName('');
      return;
    }
    setName(u.name || '');
  }, [storeProfileKey]);

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        My Profile
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 28px' }}>
        Update your display name. Your admin email is shown for reference and cannot be changed here.
      </p>

      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input
          label="Name"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User size={15} />}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          readOnly
          value={adminEmail}
          placeholder="—"
          icon={<User size={15} />}
          autoComplete="off"
          title="Email cannot be changed"
          containerStyle={{ cursor: 'not-allowed' }}
          style={{
            cursor: 'not-allowed',
            color: 'var(--text-muted)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />

        {saved && (
          <p style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, margin: 0 }}>
            Profile saved.
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth style={{ marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Save
        </Button>
      </form>
    </Card>
  );
}
