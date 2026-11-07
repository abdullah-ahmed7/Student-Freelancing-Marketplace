import { Link } from 'react-router-dom';
import { Avatar, RatingStars, StatusBadge, VerifiedBadge } from './ui';
import { formatPKR } from '../utils/format';
import { useAuth, useFavorites, useToast } from '../hooks/useApp';

export function ServiceImage({ service, className = '' }) {
  const src = service.images?.[0];
  return src
    ? <img className={`service-thumb ${className}`} src={src} alt={`${service.title} preview`} loading="lazy" />
    : null;
}

export function ServiceCard({ service, showStatus = false, actions }) {
  const { user } = useAuth();
  const fav = useFavorites();
  const { showToast } = useToast();
  const saved = fav.ids.includes(service.id);
  const own = user && service.sellerId === user.id;

  async function toggle() {
    if (!user) { showToast('Log in to save services.', 'error'); return; }
    try {
      const nowSaved = await fav.toggle(service.id);
      showToast(nowSaved ? 'Saved to your list.' : 'Removed from saved.');
    } catch (err) { showToast(err.message, 'error'); }
  }

  return (
    <article className="service-card">
      <ServiceImage service={service} />
      <div className="service-top">
        <span className="service-category">{service.category}</span>
        {showStatus
          ? <StatusBadge status={service.status} />
          : user && !own && (
            <button type="button" className={`heart ${saved ? 'on' : ''}`} onClick={toggle}
              aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save service'}>{saved ? '♥' : '♡'}</button>
          )}
      </div>
      <h3 className="service-title"><Link to={`/services/${service.id}`} className="card-link">{service.title}</Link></h3>
      <p className="service-description clamp-3">{service.description}</p>

      {service.seller && (
        <div className="seller-info seller-info-card">
          <Avatar name={service.seller.fullName} src={service.seller.avatarUrl} />
          <div>
            <span className="seller-label">Offered by</span>
            <p>
              <Link to={`/students/${service.seller.id}`} className="plain-link">{service.seller.fullName}</Link>{' '}
              {service.seller.verified && <span className="verified-tick" title="Verified">✓</span>}
            </p>
          </div>
          <div className="seller-rating"><RatingStars value={service.rating.avg} count={service.rating.count} /></div>
        </div>
      )}

      <div className="service-footer">
        <div>
          <span className="price-label">Starting at</span>
          <h3>{formatPKR(service.price)}</h3>
        </div>
        <span className="delivery-time">{service.deliveryDays} day{service.deliveryDays > 1 ? 's' : ''}</span>
      </div>

      {actions || <Link to={`/services/${service.id}`} className="service-view-btn">View Service →</Link>}
    </article>
  );
}

export function StudentCard({ student }) {
  return (
    <article className="service-card student-card">
      <div className="student-head">
        <Avatar name={student.fullName} src={student.avatarUrl} size={56} />
        <div>
          <h3><Link to={`/students/${student.id}`} className="plain-link">{student.fullName}</Link></h3>
          <p className="muted-text">{student.degree} {student.program} · Sem {student.semester}</p>
        </div>
      </div>
      <div className="chip-row">
        <VerifiedBadge verified={student.verified} />
        <span className={`badge ${student.availability ? 'badge-ok' : 'badge-muted'}`}>
          {student.availability ? 'Available' : 'Busy'}
        </span>
        <RatingStars value={student.rating.avg} count={student.rating.count} />
      </div>
      {student.bio && <p className="service-description clamp-3">{student.bio}</p>}
      <div className="chip-row">
        {student.skills.slice(0, 5).map((s) => <span className="chip" key={s.name}>{s.name}</span>)}
        {student.skills.length === 0 && <span className="muted-text">No skills listed yet</span>}
      </div>
      <Link to={`/students/${student.id}`} className="service-view-btn">View Profile →</Link>
    </article>
  );
}
