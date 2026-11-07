import { Link } from 'react-router-dom';
import { notificationService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle, useToast } from '../hooks/useApp';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { timeAgo } from '../utils/format';

export default function Notifications() {
  useDocumentTitle('Notifications');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => notificationService.list(), 'notes');

  async function mark(id) {
    try { await notificationService.markRead(id); reload(); } catch (e) { showToast(e.message, 'error'); }
  }

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;
  const unread = data.filter((n) => !n.read).length;

  return (
    <main className="page-wrap narrow">
      <PageHeader tagline="STAY UPDATED" title="Notifications" text={unread ? `${unread} unread` : 'You are all caught up.'} />
      {unread > 0 && <div className="inline-actions"><Button variant="secondary" onClick={() => mark()}>Mark all as read</Button></div>}
      {data.length === 0 ? <EmptyState title="No notifications yet" text="Order updates and messages will appear here." /> : (
        <ul className="notif-list">
          {data.map((n) => (
            <li key={n.id} className={n.read ? '' : 'unread'}>
              <Link to={n.link || '/dashboard'} onClick={() => !n.read && mark(n.id)}>{n.text}</Link>
              <span className="muted-text">{timeAgo(n.createdAt)}</span>
              {!n.read && <button type="button" className="link-btn-text" onClick={() => mark(n.id)}>Mark read</button>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
