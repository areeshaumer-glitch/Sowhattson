import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

export default function ForgotPasswordResetPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, otpVerified, verifyMessage } = location.state ?? {};

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const verifyToastShown = useRef(false);

  useEffect(() => {
    if (!email || !otpVerified) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, otpVerified, navigate]);

  useEffect(() => {
    const msg =
      typeof verifyMessage === 'string' && verifyMessage.trim() ? verifyMessage.trim() : '';
    if (msg && !verifyToastShown.current) {
      verifyToastShown.current = true;
      notifySuccess(msg);
    }
  }, [verifyMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      notifyError('Please enter a new password.');
      return;
    }
    if (password.length < 8) {
      notifyError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      notifyError('Passwords do not match.');
      return;
    }
    setLoading(true);
    await callApi({
      method: Method.POST,
      endPoint: api.forgotPasswordReset,
      bodyParams: { email, newPassword: password },
      onSuccess(response) {
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : 'Password updated. Sign in with your new password.';
        notifySuccess(msg);
        navigate('/login', { replace: true });
        setLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  };

  if (!email || !otpVerified) return null;

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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          iconRight={!loading ? <ArrowRight size={16} /> : undefined}
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
