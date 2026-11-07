import { Link } from 'react-router-dom';
import { dashboardService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useApp';
import { ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { timeAgo } from '../../utils/format';
import AdminNav from './AdminNav';

export default function AdminDashboard() {
  useDocumentTitle('Admin');
  const { data, error, reload } = useAsync(() => dashboardService.admin(), 'adm');
  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Admin Dashboard" text="Platform activity computed from current data." />
      <AdminNav />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && (
        <>
          <div className="stat-grid">
            <div className="stat"><span>Students</span><strong>{data.users}</strong><small>{data.unverified} unverified</small></div>
            <div className="stat"><span>Active services</span><strong>{data.activeServices}</strong><small>{data.totalServices} total</small></div>
            <div className="stat"><span>Orders</span><strong>{data.orders}</strong><small>{data.completedOrders} completed</small></div>
            <div className="stat"><span>Reviews</span><strong>{data.reviews}</strong></div>
            <div className="stat"><span>Open reports</span><strong>{data.openReports}</strong>{data.openReports > 0 && <small><Link to="/admin/reports">Review now</Link></small>}</div>
          </div>
          <div className="panel">
            <h2>Recent orders</h2>
            <ul className="row-list">
              {data.recentOrders.map((o) => (
                <li key={o.id}><strong>{o.serviceTitle}</strong><span className="muted-text">{o.buyer} → {o.seller} · {timeAgo(o.createdAt)}</span><StatusBadge status={o.status} /></li>
              ))}
            </ul>
          </div>
        </>
      )}
    </main>
  );
}
