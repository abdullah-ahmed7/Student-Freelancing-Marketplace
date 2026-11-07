import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { profileService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth, useDocumentTitle } from '../hooks/useApp';
import { Avatar, Button, EmptyState, ErrorState, LoadingState, RatingStars, VerifiedBadge } from '../components/ui';
import { ServiceCard } from '../components/Cards';
import ReportDialog from '../components/ReportDialog';
import { formatDate } from '../utils/format';

export function ProfileView({ student, isOwner }) {
  return (
    <>
      <div className="profile-card">
        <Avatar name={student.fullName} src={student.avatarUrl} size={96} />
        <div className="profile-main">
          <h1>{student.fullName}</h1>
          <p className="muted-text">{student.degree} {student.program} · {student.department} · Semester {student.semester}</p>
          <div className="chip-row">
            <VerifiedBadge verified={student.verified} />
            <span className={`badge ${student.availability ? 'badge-ok' : 'badge-muted'}`}>{student.availability ? 'Available for work' : 'Currently busy'}</span>
            <RatingStars value={student.rating.avg} count={student.rating.count} size={18} />
          </div>
          <p className="profile-bio pre-wrap">{student.bio || (isOwner ? 'Add a short bio so others know what you can help with.' : 'This student has not written a bio yet.')}</p>
        </div>
      </div>

      <h2 className="section-h2">Skills</h2>
      {student.skills.length === 0
        ? <p className="muted-text">{isOwner ? 'No skills yet. Add some from Edit Profile.' : 'No skills listed yet.'}</p>
        : <div className="chip-row">{student.skills.map((s) => <span key={s.name} className="chip">{s.name} <em>· {s.level}</em></span>)}</div>}
    </>
  );
}

export function PortfolioList({ items }) {
  return (
    <ul className="portfolio-grid">
      {items.map((p) => (
        <li key={p.id} className="portfolio-item">
          <h3>{p.title}</h3>
          {p.description && <p className="muted-text">{p.description}</p>}
          {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">View project ↗</a>}
        </li>
      ))}
    </ul>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: s, error, loading, reload } = useAsync(() => profileService.getPublic(id), id);
  const [reporting, setReporting] = useState(false);
  useDocumentTitle(s?.fullName || 'Student');

  if (!s && loading) return <LoadingState />;
  if (error) return <section className="page-wrap"><Link to="/students" className="back-link">← All students</Link><ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} /></section>;
  if (!s) return null;
  const isMe = user?.id === s.id;

  return (
    <main className="page-wrap">
      <Link to="/students" className="back-link">← All students</Link>
      <ProfileView student={s} isOwner={isMe} />
      {isMe && <div className="inline-actions"><Button to="/profile/edit" variant="secondary">Edit profile</Button></div>}
      {user && !isMe && <button type="button" className="link-btn-text" onClick={() => setReporting(true)}>⚑ Report this profile</button>}

      <h2 className="section-h2">Services ({s.services.length})</h2>
      {s.services.length === 0 ? <EmptyState title="No active services" text="This student has not published a service yet." />
        : <div className="services-grid">{s.services.map((sv) => <ServiceCard key={sv.id} service={sv} />)}</div>}

      {s.portfolio.length > 0 && <><h2 className="section-h2">Portfolio</h2><PortfolioList items={s.portfolio} /></>}

      <h2 className="section-h2">Reviews ({s.reviews.length})</h2>
      {s.reviews.length === 0 ? <p className="muted-text">No reviews yet.</p> : (
        <ul className="review-list">
          {s.reviews.map((r) => (
            <li key={r.id}>
              <div className="review-head"><strong>{r.buyer?.fullName}</strong><RatingStars value={r.rating} /><span className="muted-text">{formatDate(r.createdAt)}</span></div>
              <p className="muted-text">on {r.serviceTitle}</p><p>{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="user" targetId={s.id} />
    </main>
  );
}
