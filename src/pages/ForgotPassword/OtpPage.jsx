import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';

const CELL_COUNT = 4;

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
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  const otp = cells.join('');

  const setCharAt = (index, char) => {
    setCells((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\s/g, '');
    setError('');
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
    const text = e.clipboardData.getData('text').replace(/\s/g, '').slice(0, CELL_COUNT);
    if (!text) return;
    const chars = text.split('');
    setCells((prev) => {
      const next = [...prev];
      for (let i = 0; i < CELL_COUNT; i++) {
        next[i] = chars[i] ?? '';
      }
      return next;
    });
    setError('');
    const lastFilled = Math.min(chars.length, CELL_COUNT) - 1;
    const focusIdx = lastFilled >= 0 ? lastFilled : 0;
    requestAnimationFrame(() => {
      inputRefs.current[focusIdx]?.focus();
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp;
    if (code.length !== CELL_COUNT) {
      setError('Please enter the full 4-character code.');
      return;
    }
    setError('');
    navigate('/forgot-password/reset', {
      replace: false,
      state: { email, otp: code },
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
                inputMode="text"
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
          Verify code
        </Button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 4 }}>
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
