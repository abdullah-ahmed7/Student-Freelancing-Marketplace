import { useState } from 'react';
import { categoryService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../../hooks/useApp';
import { Button, ErrorState, FormField, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminNav from './AdminNav';

export default function AdminCategories() {
  useDocumentTitle('Admin · Categories');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => categoryService.list({ includeInactive: true }), 'cats-admin');
  const [name, setName] = useState('');
  const [addErr, setAddErr] = useState('');
  const [editing, setEditing] = useState(null); // { id, name }
  const [toDelete, setToDelete] = useState(null);

  const [add, adding] = useSubmit(async (e) => {
    e.preventDefault(); setAddErr('');
    try { await categoryService.create(name); setName(''); showToast('Category added.'); reload(); }
    catch (err) { setAddErr(err.message); }
  });
  async function patch(id, p, msg) {
    try { await categoryService.update(id, p); showToast(msg); setEditing(null); reload(); }
    catch (err) { showToast(err.message, 'error'); }
  }
  const [remove, removing] = useSubmit(async () => {
    try { await categoryService.remove(toDelete.id); showToast('Category deleted.'); reload(); }
    catch (err) { showToast(err.message, 'error'); }
    setToDelete(null);
  });

  return (
    <main className="page-wrap">
      <PageHeader tagline="ADMINISTRATION" title="Categories" />
      <AdminNav />
      <form className="inline-form" onSubmit={add} noValidate>
        <FormField id="newcat" label="New category" value={name} onChange={(e) => setName(e.target.value)} error={addErr} maxLength={40} />
        <Button type="submit" loading={adding}>Add</Button>
      </form>
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingState />}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Category</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>
                    {editing?.id === c.id ? (
                      <form className="inline-edit" onSubmit={(e) => { e.preventDefault(); patch(c.id, { name: editing.name }, 'Category renamed.'); }}>
                        <input aria-label="Category name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                        <Button type="submit">Save</Button><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                      </form>
                    ) : <>{c.icon} {c.name}</>}
                  </td>
                  <td><StatusBadge status={c.active ? 'Active' : 'Archived'} /></td>
                  <td className="row-actions">
                    <Button variant="secondary" onClick={() => setEditing({ id: c.id, name: c.name })}>Rename</Button>
                    <Button variant="secondary" onClick={() => patch(c.id, { active: !c.active }, c.active ? 'Category deactivated.' : 'Category activated.')}>{c.active ? 'Deactivate' : 'Activate'}</Button>
                    <Button variant="danger" onClick={() => setToDelete(c)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!toDelete} title="Delete category?" message={`"${toDelete?.name}" will be removed. Categories that still have services cannot be deleted.`}
        confirmLabel="Delete" danger loading={removing} onCancel={() => setToDelete(null)} onConfirm={remove} />
    </main>
  );
}
