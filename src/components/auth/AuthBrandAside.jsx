import authIllustration from '../../assets/auth.svg';

export function AuthBrandAside({ lines = [] }) {
  return (
    <aside className="auth-split-brand">
      <div className="auth-split-brand-inner">
        <img
          src={authIllustration}
          alt=""
          className="auth-split-brand-illustration"
          width={321}
          height={128}
          decoding="async"
        />
        {lines.length > 0 ? (
          <div className="auth-split-brand-lines">
            {lines.map((line, i) => (
              <p key={i} className="auth-split-brand-line">{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
