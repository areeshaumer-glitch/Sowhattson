import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
// import { callApi, Method } from '../../network/NetworkManager';
// import { api } from '../../network/Environment';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
// import { getApiErrorMessage } from '../../utils/apiErrorMessage';

export default function ForgotPasswordEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(() => location.state?.email ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);

    // await callApi({
    //   method: Method.POST,
    //   endPoint: api.forgotPasswordRequest,
    //   bodyParams: { identifier: email.trim(), email: email.trim() },
    //   onSuccess() {
    //     navigate('/forgot-password/otp', {
    //       replace: false,
    //       state: { email: email.trim() },
    //     });
    //   },
    //   onError(err) {
    //     setError(getApiErrorMessage(err));
    //     setLoading(false);
    //   },
    // });

    navigate('/forgot-password/otp', {
      replace: false,
      state: { email: email.trim() },
    });
    setLoading(false);
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
