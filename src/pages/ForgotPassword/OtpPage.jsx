import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { callApi, Method } from '../../network/NetworkManager';
import { api } from '../../network/Environment';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { notifyError, notifySuccess } from '../../utils/notify';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

const CELL_COUNT = 4;
const RESEND_COOLDOWN_SEC = 60;

function formatMmSs(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const cellBaseStyle = {
  width: '100%',
  maxWidth: 52,
  aspectRatio: '1',
  minHeight: 48,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: 700,
  fontFamily: 'inherit',
  letterSpacing: '0.02em',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s',
  boxSizing: 'border-box',
};

export default function ForgotPasswordOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [cells, setCells] = useState(() => Array(CELL_COUNT).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(RESEND_COOLDOWN_SEC);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldownSec <= 0) return undefined;
    const t = setTimeout(() => setResendCooldownSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldownSec]);

  const otp = cells.join('');

  const setCharAt = (index, char) => {
    setCells((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length === 0) {
      setCharAt(index, '');
      return;
    }
    if (raw.length > 1) {
      const chars = raw.slice(0, CELL_COUNT).split('');
      setCells((prev) => {
        const next = [...prev];
        for (let j = 0; j < chars.length && index + j < CELL_COUNT; j++) {
          next[index + j] = chars[j];
        }
        return next;
      });
      const nextFocus = Math.min(index + chars.length, CELL_COUNT - 1);
      requestAnimationFrame(() => inputRefs.current[nextFocus]?.focus());
      return;
    }
    setCharAt(index, raw);
    if (index < CELL_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !cells[index] && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < CELL_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CELL_COUNT);
    if (!text) return;
    const chars = text.split('');
    setCells((prev) => {
      const next = [...prev];
      for (let i = 0; i < CELL_COUNT; i++) {
        next[i] = chars[i] ?? '';
      }
      return next;
    });
    const lastFilled = Math.min(chars.length, CELL_COUNT) - 1;
    const focusIdx = lastFilled >= 0 ? lastFilled : 0;
    requestAnimationFrame(() => {
      inputRefs.current[focusIdx]?.focus();
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp;
    if (code.length !== CELL_COUNT) {
      notifyError(`Please enter the full ${CELL_COUNT}-digit code.`);
      return;
    }
    setLoading(true);
    await callApi({
      method: Method.POST,
      endPoint: api.verifyForgotPassword,
      bodyParams: { email, otp: code },
      onSuccess(response) {
        navigate('/forgot-password/reset', {
          replace: false,
          state: {
            email,
            otpVerified: true,
            verifyMessage:
              typeof response?.message === 'string' ? response.message : undefined,
          },
        });
        setLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setLoading(false);
      },
    });
  };

  const handleResend = async () => {
    if (!email || resendCooldownSec > 0 || resendLoading || loading) return;
    setResendLoading(true);
    await callApi({
      method: Method.POST,
      endPoint: api.forgotPasswordRequest,
      bodyParams: { email },
      onSuccess(response) {
        const msg =
          typeof response?.message === 'string' && response.message.trim()
            ? response.message.trim()
            : 'OTP sent to your email for password reset.';
        notifySuccess(msg);
        setResendCooldownSec(RESEND_COOLDOWN_SEC);
        setResendLoading(false);
      },
      onError(err) {
        notifyError(getApiErrorMessage(err));
        setResendLoading(false);
      },
    });
  };

  if (!email) return null;

  return (
    <AuthShell
      title="Enter verification code"
      subtitle={`We sent a code to ${email}. Enter it below to continue.`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>
            Verification code
          </span>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'nowrap',
            }}
          >
            {cells.map((value, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                name={index === 0 ? 'otp' : undefined}
                maxLength={CELL_COUNT}
                value={value}
                placeholder="-"
                aria-label={`Character ${index + 1} of ${CELL_COUNT}`}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.boxShadow = 'none';
                }}
                style={cellBaseStyle}
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          iconRight={!loading ? <ArrowRight size={16} /> : undefined}
        >
          Verify code
        </Button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {resendCooldownSec > 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.06em',
                color: 'var(--text-primary)',
                textAlign: 'center',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
              aria-label={`Resend code in ${formatMmSs(resendCooldownSec)}`}
            >
              {formatMmSs(resendCooldownSec)}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || loading || resendCooldownSec > 0}
            aria-disabled={resendLoading || loading || resendCooldownSec > 0}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color:
                resendLoading || loading || resendCooldownSec > 0
                  ? 'var(--text-muted)'
                  : 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor:
                resendLoading || loading || resendCooldownSec > 0 ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              fontFamily: 'inherit',
              pointerEvents:
                resendLoading || loading || resendCooldownSec > 0 ? 'none' : 'auto',
              userSelect: 'none',
            }}
          >
            {resendLoading ? 'Sending…' : 'Resend code'}
          </button>
          <Link
            to="/login"
            style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
