import { Link } from 'react-router-dom';
import { dashboardService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth, useDocumentTitle } from '../hooks/useApp';
import { Button, ErrorState, LoadingState, PageHeader, RatingStars, StatusBadge } from '../components/ui';
import { timeAgo } from '../utils/format';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data, error, reload } = useAsync(() => dashboardService.student(), 'dash');

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;

  const checklist = [
    { done: data.profileFields.verified, label: 'Verify your university email', to: '/verify' },
    { done: data.profileFields.bio, label: 'Write a short bio', to: '/profile/edit' },
    { done: data.profileFields.skills, label: 'Add your skills', to: '/profile/edit' },
    { done: data.activeServices > 0, label: 'Publish your first service', to: '/create-service' },
  ];
  const remaining = checklist.filter((c) => !c.done);

  return (
    <main className="page-wrap">
      <PageHeader tagline="YOUR DASHBOARD" title={`Hi, ${user.fullName.split(' ')[0]} 👋`} text="Here is what's happening with your services and orders." />

      <div className="stat-grid">
        <div className="stat"><span>Active services</span><strong>{data.activeServices}</strong></div>
        <div className="stat"><span>Incoming orders</span><strong>{data.incomingActive}</strong></div>
        <div className="stat"><span>Orders I placed</span><strong>{data.outgoingActive}</strong></div>
        <div className="stat"><span>Completed</span><strong>{data.completed}</strong></div>
        <div className="stat"><span>Average rating</span><strong><RatingStars value={data.rating.avg} count={data.rating.count} size={20} /></strong></div>
      </div>

      <div className="quick-actions">
        <Button to="/create-service">+ Create service</Button>
        <Button to="/profile/edit" variant="secondary">Edit profile</Button>
        <Button to="/orders" variant="secondary">View orders</Button>
      </div>

      {remaining.length > 0 && (
        <div className="panel">
          <h2>Complete your profile</h2>
          <p className="muted-text">{checklist.length - remaining.length} of {checklist.length} done</p>
          <ul className="checklist">
            {checklist.map((c) => <li key={c.label} className={c.done ? 'done' : ''}>{c.done ? '✓' : '○'} {c.done ? c.label : <Link to={c.to}>{c.label}</Link>}</li>)}
          </ul>
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <h2>Recent orders</h2>
          {data.recent.length === 0 ? <p className="muted-text">No orders yet.</p> : (
            <ul className="row-list">
              {data.recent.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`}><strong>{o.serviceTitle}</strong></Link>
                  <span className="muted-text">{o.role === 'seller' ? 'Selling' : 'Buying'} · {timeAgo(o.createdAt)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel">
          <h2>Recent activity</h2>
          {data.notifications.length === 0 ? <p className="muted-text">Nothing yet.</p> : (
            <ul className="row-list">
              {data.notifications.map((n) => (
                <li key={n.id}><Link to={n.link || '/notifications'} className={n.read ? '' : 'unread-text'}>{n.text}</Link><span className="muted-text">{timeAgo(n.createdAt)}</span></li>
              ))}
            </ul>
          )}
          <Link to="/notifications" className="more-link">All notifications →</Link>
        </div>
      </div>
    </main>
  );
}
