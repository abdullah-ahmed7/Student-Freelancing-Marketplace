import { Link } from 'react-router-dom';
import { initials } from '../utils/format';

export function Button({ variant = 'primary', loading = false, to, children, className = '', disabled, type = 'button', ...rest }) {
  const cls = `btn btn-${variant} ${className}`.trim();
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function Avatar({ name, src, size = 42 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (src) return <img className="avatar" style={style} src={src} alt="" />;
  return <span className="avatar avatar-fallback" style={style} aria-hidden="true">{initials(name)}</span>;
}

export function VerifiedBadge({ verified }) {
  return verified
    ? <span className="badge badge-ok" title="University email verified">✓ Verified</span>
    : <span className="badge badge-muted" title="Not verified yet">Unverified</span>;
}

const STATUS_TONE = {
  Requested: 'info', Accepted: 'info', 'In Progress': 'warn', Delivered: 'warn',
  'Revision Requested': 'warn', Completed: 'ok', Rejected: 'bad', Cancelled: 'muted',
  Active: 'ok', Draft: 'muted', Paused: 'warn', Archived: 'muted',
  Open: 'warn', Resolved: 'ok', Dismissed: 'muted', Suspended: 'bad',
};
export function StatusBadge({ status }) {
  return <span className={`badge badge-${STATUS_TONE[status] || 'muted'}`}>{status}</span>;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="state-box state-error" role="alert">
      <h3>{title}</h3>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-results">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ tagline, title, text, children }) {
  return (
    <section className="market-header page-header">
      {tagline && <p className="tagline">{tagline}</p>}
      <h1>{title}</h1>
      {text && <p className="page-header-text">{text}</p>}
      {children}
    </section>
  );
}

export function FormField({ id, label, error, hint, as = 'input', children, ...props }) {
  const Tag = as;
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {as === 'select'
        ? <select id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props}>{children}</select>
        : <Tag id={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} />}
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

export function RatingStars({ value = 0, count, size = 16, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  if (onChange) {
    return (
      <div className="stars stars-input" role="radiogroup" aria-label="Rating">
        {stars.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={n <= value ? 'star on' : 'star'} style={{ fontSize: size }} onClick={() => onChange(n)}>★</button>
        ))}
      </div>
    );
  }
  return (
    <span className="stars" aria-label={count === 0 ? 'No reviews yet' : `Rated ${value} out of 5`}>
      {count === 0
        ? <span className="muted-text">New</span>
        : <>
          <span className="star on" style={{ fontSize: size }} aria-hidden="true">★</span>
          <strong>{value.toFixed(1)}</strong>
          {count !== undefined && <span className="muted-text">({count})</span>}
        </>}
    </span>
  );
}

export function Pagination({ page, total, pageSize, onChange }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Previous</Button>
      <span aria-live="polite">Page {page} of {pages}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</Button>
    </nav>
  );
}
