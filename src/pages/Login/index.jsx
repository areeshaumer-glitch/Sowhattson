import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError } from '../../utils/notify';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AuthBrandAside } from '../../components/auth/AuthBrandAside';

const DEVICE_TOKEN_KEY = 'sowhatson-device-token';

function getOrCreateDeviceToken() {
  try {
    let t = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!t || !String(t).trim()) {
      t =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `web-${crypto.randomUUID()}`
          : `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return `web-${Date.now()}`;
  }
}

/** Map API user to a stable shape for the admin UI (API uses `_id`). */
function normalizeAuthUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: raw._id ?? raw.id ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    role: raw.role ?? null,
    provider: raw.provider ?? null,
    isVerified: raw.isVerified,
    isProfileCompleted: raw.isProfileCompleted,
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('auth-page-lock');
    return () => document.documentElement.classList.remove('auth-page-lock');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = email.trim();
    if (!id && !password) {
      notifyError('Please enter your email and password.');
      return;
    }
    if (!id) {
      notifyError('Please enter your email.');
      return;
    }
    if (!password) {
      notifyError('Please enter your password.');
      return;
    }
    setLoading(true);

    await callApi({
      method: Method.POST,
      endPoint: api.signin,
      bodyParams: {
        identifier: id,
        password,
        deviceToken: getOrCreateDeviceToken(),
      },
      onSuccess(response) {
        const user = normalizeAuthUser(response.user ?? response.data?.user);
        const token =
          response.accessToken
          ?? response.data?.accessToken
          ?? response.token
          ?? response.data?.token;
        const refreshToken = response.refreshToken ?? response.data?.refreshToken ?? null;
        if (!token) {
          notifyError('Sign-in failed. No access token received.');
          setLoading(false);
          return;
        }
        login(user ?? { email: id }, token, refreshToken);
        navigate('/dashboard', { replace: true });
        setLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
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
            label="Email"
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
