import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../../hooks/useApp';
import { Button, ErrorState, LoadingState, PageHeader, StatusBadge, VerifiedBadge } from '../../components/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminNav from './AdminNav';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  useDocumentTitle('Admin · Users');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => adminService.listUsers(), 'users');
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(null);

  const [apply, pending] = useSubmit(async () => {
    try {
      const next = target.status === 'suspended' ? 'active' : 'suspended';
      await adminService.updateUser(target.id, { status: next });
      showToast(`${target.fullName} is now ${next}.`);
      reload();
    } catch (err) { showToast(err.message, 'error'); }
    setTarget(null);
  });
  async function toggleVerified(u) {
    try { await adminService.updateUser(u.id, { verified: !u.verified }); showToast('Verification updated.'); reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }

  const list = (data || []).filter((u) => !q.trim() || `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Users" />
      <AdminNav />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && (
        <>
          <input className="table-search" type="search" aria-label="Search users" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Program</th><th>Verified</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td><Link to={`/students/${u.id}`}>{u.fullName}</Link></td><td>{u.email}</td><td>{u.degree} {u.program}</td>
                    <td><VerifiedBadge verified={u.verified} /></td>
                    <td><StatusBadge status={u.status === 'suspended' ? 'Suspended' : 'Active'} /></td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="row-actions">
                      <Button variant="secondary" onClick={() => toggleVerified(u)}>{u.verified ? 'Unverify' : 'Verify'}</Button>
                      <Button variant={u.status === 'suspended' ? 'secondary' : 'danger'} onClick={() => setTarget(u)}>{u.status === 'suspended' ? 'Reinstate' : 'Suspend'}</Button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={7} className="muted-text">No users match.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      <ConfirmDialog open={!!target} title={target?.status === 'suspended' ? 'Reinstate user?' : 'Suspend user?'}
        message={target?.status === 'suspended' ? `${target?.fullName} will be able to log in again.` : `${target?.fullName} will be signed out of marketplace actions and hidden from discovery.`}
        confirmLabel={target?.status === 'suspended' ? 'Reinstate' : 'Suspend'} danger={target?.status !== 'suspended'} loading={pending}
        onCancel={() => setTarget(null)} onConfirm={apply} />
    </main>
  );
}
