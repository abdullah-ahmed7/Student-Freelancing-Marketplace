import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService, serviceService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../../hooks/useApp';
import { Button, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminNav from './AdminNav';
import { formatPKR } from '../../utils/format';

export default function AdminServices() {
  useDocumentTitle('Admin · Services');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => adminService.listServices(), 'adm-svc');
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

  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Services" text="Moderate listings. Archiving removes a service from the marketplace." />
      <AdminNav />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Service</th><th>Seller</th><th>Category</th><th>Price</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/services/${s.id}`}>{s.title}</Link></td><td>{s.seller?.fullName}</td><td>{s.category}</td><td>{formatPKR(s.price)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="row-actions">
                    {s.status === 'Archived'
                      ? <Button variant="secondary" onClick={() => setStatus(s, 'Active')}>Restore</Button>
                      : <Button variant="secondary" onClick={() => setStatus(s, 'Archived')}>Archive</Button>}
                    <Button variant="danger" onClick={() => setToDelete(s)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!toDelete} title="Delete this service?" message={`"${toDelete?.title}" will be permanently removed.`}
        confirmLabel="Delete" danger loading={removing} onCancel={() => setToDelete(null)} onConfirm={remove} />
    </main>
  );
}
