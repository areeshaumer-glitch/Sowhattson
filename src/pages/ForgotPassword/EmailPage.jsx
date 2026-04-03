import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';

export default function ForgotPasswordEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      notifyError('Please enter your email address.');
      return;
    }
    setLoading(true);

    const trimmed = email.trim();

    await callApi({
      method: Method.POST,
      endPoint: api.forgotPasswordRequest,
      bodyParams: { email: trimmed },
      onSuccess(response) {
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : 'We sent a verification code to your email.';
        notifySuccess(msg);
        navigate('/forgot-password/otp', {
          replace: false,
          state: { email: trimmed },
        });
        setLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter the email for your admin account. We will send you a verification code."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input
          label="Email Address"
          type="email"
          placeholder="admin@sowhatson.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={15} />}
          autoComplete="email"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          iconRight={!loading ? <ArrowRight size={16} /> : undefined}
        >
          Continue
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
