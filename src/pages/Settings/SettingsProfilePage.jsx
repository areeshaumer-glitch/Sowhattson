import { useState } from 'react';
import { User, Camera } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function SettingsProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(() => user?.name || '');
  const [email, setEmail] = useState(() => user?.email || user?.identifier || user?.username || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    updateUser({ name: name.trim(), email: email.trim(), identifier: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initial = (name || user?.name || 'A')[0]?.toUpperCase() || 'A';

  return (
    <Card style={{ maxWidth: 520, margin: '0 auto' }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        My Profile
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 28px' }}>
        Update your display name and contact email. This information is used across the admin panel.
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
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<User size={15} />}
          autoComplete="email"
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
