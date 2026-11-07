import { Link } from 'react-router-dom';
import { reportService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle, useToast } from '../../hooks/useApp';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import AdminNav from './AdminNav';
import { timeAgo } from '../../utils/format';

export default function AdminReports() {
  useDocumentTitle('Admin · Reports');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => reportService.list(), 'reports');
  async function resolve(r, status) {
    try { await reportService.resolve(r.id, status); showToast(`Report ${status.toLowerCase()}.`); reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }
  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Reports" text="Reports submitted by students about listings and profiles." />
      <AdminNav />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && data.length === 0 && <EmptyState title="No reports" text="Nothing needs your attention." />}
      {data && data.length > 0 && (
        <ul className="review-list">
          {data.map((r) => (
            <li key={r.id}>
              <div className="review-head">
                <StatusBadge status={r.status} /><strong>{r.reason}</strong>
                <span className="muted-text">{timeAgo(r.createdAt)} · by {r.reporterName}</span>
              </div>
              <p>Reported {r.targetType}: <Link to={r.targetType === 'service' ? `/services/${r.targetId}` : `/students/${r.targetId}`}>{r.targetLabel}</Link></p>
              {r.details && <p className="muted-text">“{r.details}”</p>}
              {r.status === 'Open' && (
                <div className="inline-actions">
                  <Button onClick={() => resolve(r, 'Resolved')}>Mark resolved</Button>
                  <Button variant="secondary" onClick={() => resolve(r, 'Dismissed')}>Dismiss</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
