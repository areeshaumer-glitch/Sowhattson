import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
// import { callApi, Method } from '../../network/NetworkManager';
// import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authStore';
// import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthBrandAside } from '../../components/auth/AuthBrandAside';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('auth-page-lock');
    return () => document.documentElement.classList.remove('auth-page-lock');
  }, []);

  useEffect(() => {
    if (location.state?.passwordReset) {
      setInfo("You've completed the reset steps. Sign in below.");
      navigate('/login', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setError('');
    setLoading(true);

    // await callApi({
    //   method: Method.POST,
    //   endPoint: api.signin,
    //   bodyParams: { identifier: email, password },
    //   onSuccess(response) {
    //     const user = response.user ?? response.data?.user;
    //     const token = response.token ?? response.data?.token ?? response.accessToken ?? response.data?.accessToken;
    //     const refreshToken = response.refreshToken ?? response.data?.refreshToken;
    //     if (!token) { setError('Login failed. No token received.'); return; }
    //     login(user, token, refreshToken);
    //     navigate('/dashboard', { replace: true });
    //   },
    //   onError(err) {
    //     setError(getApiErrorMessage(err));
    //     setLoading(false);
    //   },
    // });

    login({ email }, 'dev-mock-token', undefined);
    navigate('/dashboard', { replace: true });
    setLoading(false);
  };

  return (
    <div className="auth-split-wrap">
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 500, height: 500, borderRadius: '50%',
        background: 'var(--gradient)', opacity: 0.06, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'var(--gradient)', opacity: 0.06, pointerEvents: 'none',
      }} />

      <div className="auth-split-card">
        <AuthBrandAside
          lines={[
            'Sign in with your administrator email and password. Manage experiences, providers, tickets, and settings from one place.',
            
          ]}
        />
        <section className="auth-split-form">
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Login
          </h1>
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
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            autoComplete="current-password"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -10 }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--primary)',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          {info && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--success-bg)',
              border: '1px solid rgba(61,213,152,0.35)',
              fontSize: 13, color: 'var(--success)', fontWeight: 500,
            }}>
              {info}
            </div>
          )}

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
            style={{ marginTop: 6 }}
          >
            Sign In
          </Button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Access restricted to authorised administrators only.
        </p>
        </section>
      </div>
    </div>
  );
}
