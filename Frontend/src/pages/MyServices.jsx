import { useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useSubmit } from '../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../hooks/useApp';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { ServiceCard } from '../components/Cards';
import ConfirmDialog from '../components/ConfirmDialog';
import { SERVICE_STATUSES } from '../utils/constants';

export default function MyServices() {
  useDocumentTitle('My Services');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => serviceService.listMine(), 'mine');
  const [filter, setFilter] = useState('All');
  const [toDelete, setToDelete] = useState(null);

  async function setStatus(s, status) {
    try { await serviceService.setStatus(s.id, status); showToast(`"${s.title}" is now ${status}.`); reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }
  const [remove, removing] = useSubmit(async () => {
    try { await serviceService.remove(toDelete.id); showToast('Service deleted.'); reload(); }
    catch (err) { showToast(err.message, 'error'); }
    setToDelete(null);
  });

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;
  const list = filter === 'All' ? data : data.filter((s) => s.status === filter);

  return (
    <main className="marketplace my-services-page">
      <PageHeader tagline="YOUR SELLER DASHBOARD" title="My Services" text="Create, edit, pause and archive your listings." />
      <section className="services-section">
        <div className="my-services-actions">
          <h2>{data.length} service{data.length === 1 ? '' : 's'}</h2>
          <Link to="/create-service" className="primary-btn create-service-link">+ Create Service</Link>
        </div>
        <div className="filter-row tabs">
          {['All', ...SERVICE_STATUSES].map((s) => (
            <button key={s} type="button" className={`filter-btn ${filter === s ? 'active' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s}{s !== 'All' && ` (${data.filter((x) => x.status === s).length})`}
            </button>
          ))}
        </div>

        {list.length > 0 ? (
          <div className="services-grid">
            {list.map((s) => (
              <ServiceCard key={s.id} service={s} showStatus actions={
                <div className="card-actions">
                  <Button to={`/services/${s.id}`} variant="secondary">View</Button>
                  <Button to={`/services/${s.id}/edit`} variant="secondary">Edit</Button>
                  {s.status !== 'Active' && s.status !== 'Archived' && <Button onClick={() => setStatus(s, 'Active')}>Publish</Button>}
                  {s.status === 'Archived' && <Button onClick={() => setStatus(s, 'Draft')}>Restore</Button>}
                  {s.status === 'Active' && <Button variant="secondary" onClick={() => setStatus(s, 'Paused')}>Pause</Button>}
                  {s.status !== 'Archived' && <Button variant="secondary" onClick={() => setStatus(s, 'Archived')}>Archive</Button>}
                  <Button variant="danger" onClick={() => setToDelete(s)}>Delete</Button>
                </div>
              } />
            ))}
          </div>
        ) : (
          <EmptyState title={data.length ? `No ${filter.toLowerCase()} services` : "You haven't created any services yet."}
            text={data.length ? 'Try another status tab.' : 'Publish your first service to showcase your skills.'}
            action={!data.length && <Link to="/create-service" className="primary-btn create-service-link">Create Your First Service</Link>} />
        )}
      </section>
      <ConfirmDialog open={!!toDelete} title="Delete this service?" message={`"${toDelete?.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete service" danger loading={removing} onCancel={() => setToDelete(null)} onConfirm={remove} />
    </main>
  );
}
