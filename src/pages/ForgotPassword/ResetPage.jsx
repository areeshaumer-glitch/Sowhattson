import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

export default function ForgotPasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, otp } = location.state ?? {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, otp, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    navigate('/login', {
      replace: true,
      state: { passwordReset: true },
    });
  };

  if (!email || !otp) return null;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Set a new password for your account. Complete this step, then sign in."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input
          label="New password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={15} />}
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={15} />}
          autoComplete="new-password"
        />

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg)',
            border: '1px solid rgba(234,84,85,0.25)',
            fontSize: 13, color: 'var(--danger)', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          iconRight={<ArrowRight size={16} />}
        >
          Update password
        </Button>

        <p style={{ textAlign: 'center', fontSize: 13, marginTop: 4 }}>
          <Link
            to="/login"
            style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
