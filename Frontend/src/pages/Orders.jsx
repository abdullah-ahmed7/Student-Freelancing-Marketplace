import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useAuth, useDocumentTitle } from '../hooks/useApp';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import { formatDate, formatPKR } from '../utils/format';

export default function Orders() {
  useDocumentTitle('Orders');
  const { user } = useAuth();
  const { data, error, reload } = useAsync(() => orderService.list(), 'orders');
  const [tab, setTab] = useState('buying');

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;

  const buying = data.filter((o) => o.buyerId === user.id);
  const selling = data.filter((o) => o.sellerId === user.id);
  const list = tab === 'buying' ? buying : selling;

  return (
    <main className="page-wrap">
      <PageHeader tagline="TRACK YOUR WORK" title="Orders" text="Orders you placed and orders you received." />
      <div className="filter-row tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'buying'} className={`filter-btn ${tab === 'buying' ? 'active' : ''}`} onClick={() => setTab('buying')}>I'm buying ({buying.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'selling'} className={`filter-btn ${tab === 'selling' ? 'active' : ''}`} onClick={() => setTab('selling')}>I'm selling ({selling.length})</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={tab === 'buying' ? 'No orders placed yet' : 'No orders received yet'}
          text={tab === 'buying' ? 'Find a service and send your first request.' : 'Orders from other students will show up here.'}
          action={tab === 'buying' ? <Link to="/marketplace" className="primary-btn link-btn">Explore Services</Link> : <Link to="/create-service" className="primary-btn link-btn">Create a service</Link>} />
      ) : (
        <ul className="order-list">
          {list.map((o) => {
            const other = tab === 'buying' ? o.seller : o.buyer;
            return (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="order-row">
                  <Avatar name={other.fullName} src={other.avatarUrl} />
                  <div className="order-row-main">
                    <strong>{o.serviceTitle}</strong>
                    <span className="muted-text">{tab === 'buying' ? 'Seller' : 'Buyer'}: {other.fullName} · {formatDate(o.createdAt)}</span>
                  </div>
                  <span className="order-price">{formatPKR(o.price)}</span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
