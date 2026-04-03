import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

function deriveNameParts(u) {
  if (!u) return { first: '', last: '' };
  const f = u.firstName != null ? String(u.firstName) : '';
  const l = u.lastName != null ? String(u.lastName) : '';
  if (f || l) return { first: f.trim(), last: l.trim() };
  const n = String(u.name || '').trim();
  const i = n.indexOf(' ');
  if (i === -1) return { first: n, last: '' };
  return { first: n.slice(0, i).trim(), last: n.slice(i + 1).trim() };
}

export default function SettingsProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const adminEmail =
    user?.email || user?.identifier || user?.username || '';

  const storeProfileKey = user
    ? `${user.id ?? ''}|${user.email ?? ''}|${user.firstName ?? ''}|${user.lastName ?? ''}|${user.name ?? ''}`
    : '';

  useEffect(() => {
    const u = useAuthStore.getState().user;
    if (!u) {
      setFirstName('');
      setLastName('');
      return;
    }
    const { first, last } = deriveNameParts(u);
    setFirstName(first);
    setLastName(last);
  }, [storeProfileKey]);

  const handleSave = (e) => {
    e.preventDefault();
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f && !l) {
      notifyError('Enter at least a first name or last name.');
      return;
    }
    setLoading(true);
    callApi({
      method: Method.PUT,
      endPoint: api.updateProfile,
      bodyParams: {
        firstName: f,
        lastName: l,
      },
      onSuccess() {
        const displayName = [f, l].filter(Boolean).join(' ');
        updateUser({
          firstName: f,
          lastName: l,
          name: displayName || undefined,
        });
        notifySuccess('Profile updated.');
        setLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  };

  return (
    <Card style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
        My Profile
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 28px' }}>
        Update your first and last name. Your admin email is shown for reference and cannot be changed here.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input
          label="First name"
          placeholder="e.g. Ada"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          icon={<User size={15} />}
          autoComplete="given-name"
        />
        <Input
          label="Last name"
          placeholder="e.g. Lovelace"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          icon={<User size={15} />}
          autoComplete="family-name"
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          style={{ marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Save
        </Button>
      </form>
    </Card>
  );
}
