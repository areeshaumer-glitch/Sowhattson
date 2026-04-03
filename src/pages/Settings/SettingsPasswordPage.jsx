import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

export default function SettingsPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    await callApi({
      method: Method.POST,
      endPoint: api.updatePassword,
      bodyParams: { currentPassword, newPassword },
      onSuccess() {
        setSuccess('Your password was updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setLoading(false);
      },
      onError(err) {
        setError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  };

  return (
    <Card style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <span style={{ color: 'var(--primary)' }}><Lock size={18} /></span>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Change password</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.45 }}>
        Use a strong password you do not use elsewhere.
      </p>

      <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="Current password"
          type="password"
          placeholder="Enter current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          icon={<Lock size={15} />}
        />
        <Input
          label="New password"
          type="password"
          placeholder="Enter new password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          icon={<Lock size={15} />}
          hint="At least 8 characters"
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={15} />}
        />

        {success && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--success-bg)',
            border: '1px solid rgba(61,213,152,0.35)',
            fontSize: 13,
            color: 'var(--success)',
            fontWeight: 500,
          }}>
            {success}
          </div>
        )}
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(234,84,85,0.25)',
            fontSize: 13,
            color: 'var(--danger)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          iconRight={!loading ? <ArrowRight size={16} /> : undefined}
          style={{ alignSelf: 'stretch', marginTop: 4 }}
        >
          Update password
        </Button>
      </form>
    </Card>
  );
}
