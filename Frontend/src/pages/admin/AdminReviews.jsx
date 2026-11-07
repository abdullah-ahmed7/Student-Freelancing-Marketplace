import { useState } from 'react';
import { reviewService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../../hooks/useApp';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, RatingStars } from '../../components/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminNav from './AdminNav';
import { formatDate } from '../../utils/format';

export default function AdminReviews() {
  useDocumentTitle('Admin · Reviews');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => reviewService.listAll(), 'adm-rev');
  const [toDelete, setToDelete] = useState(null);
  const [remove, removing] = useSubmit(async () => {
    try { await reviewService.remove(toDelete.id); showToast('Review removed.'); reload(); }
    catch (err) { showToast(err.message, 'error'); }
    setToDelete(null);
  });
  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Reviews" />
      <AdminNav />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && data.length === 0 && <EmptyState title="No reviews yet" />}
      {data && data.length > 0 && (
        <ul className="review-list admin-reviews">
          {data.map((r) => (
            <li key={r.id}>
              <div className="review-head"><strong>{r.buyerName}</strong> → {r.sellerName}<RatingStars value={r.rating} /><span className="muted-text">{formatDate(r.createdAt)}</span></div>
              <p className="muted-text">{r.serviceTitle}</p><p>{r.comment}</p>
              <Button variant="danger" onClick={() => setToDelete(r)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!toDelete} title="Remove this review?" message="Ratings will be recalculated without it." confirmLabel="Remove" danger loading={removing}
        onCancel={() => setToDelete(null)} onConfirm={remove} />
    </main>
  );
}
