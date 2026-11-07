import { useState } from 'react';
import { profileService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useSubmit } from '../hooks/useSubmit';
import { useDocumentTitle, useToast } from '../hooks/useApp';
import { Button, EmptyState, ErrorState, FormField, LoadingState, PageHeader } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { isUrl } from '../utils/validators';

const EMPTY = { id: '', title: '', description: '', link: '' };

export default function Portfolio() {
  useDocumentTitle('Portfolio');
  const { showToast } = useToast();
  const { data, error, reload } = useAsync(() => profileService.listPortfolio(), 'pf');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const [save, saving] = useSubmit(async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.title.trim().length < 3) errs.title = 'Enter a title (3+ characters).';
    if (form.link && !isUrl(form.link)) errs.link = 'Enter a valid http(s) link.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await profileService.savePortfolioItem({ ...form, title: form.title.trim() });
      showToast(form.id ? 'Portfolio item updated.' : 'Portfolio item added.');
      setForm(null); reload();
    } catch (err) { setErrors({ title: err.message }); }
  });

  const [remove, removing] = useSubmit(async () => {
    try {
      await profileService.deletePortfolioItem(toDelete.id);
      showToast('Portfolio item deleted.');
      setToDelete(null); reload();
    } catch (err) { showToast(err.message, 'error'); setToDelete(null); }
  });

  if (error) return <main className="page-wrap"><ErrorState error={error} onRetry={reload} /></main>;
  if (!data) return <LoadingState />;

  return (
    <main className="page-wrap narrow">
      <PageHeader tagline="SHOW YOUR WORK" title="Portfolio" text="Add projects that prove your skills. They appear on your public profile." />
      {!form && <div className="inline-actions"><Button onClick={() => { setForm(EMPTY); setErrors({}); }}>+ Add item</Button></div>}

      {form && (
        <form className="panel form-panel" onSubmit={save} noValidate>
          <h2>{form.id ? 'Edit item' : 'New item'}</h2>
          <FormField id="pt" label="Title" value={form.title} maxLength={80} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} />
          <FormField id="pd" label="Description" as="textarea" rows={3} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <FormField id="pl" label="Link (optional)" placeholder="https://github.com/…" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} error={errors.link} />
          <div className="inline-actions"><Button type="submit" loading={saving}>Save</Button><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button></div>
        </form>
      )}

      {data.length === 0 && !form && <EmptyState title="No portfolio items yet" text="Add your first project to build trust with buyers." />}
      <ul className="portfolio-grid">
        {data.map((p) => (
          <li key={p.id} className="portfolio-item">
            <h3>{p.title}</h3>
            {p.description && <p className="muted-text">{p.description}</p>}
            {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer">View project ↗</a>}
            <div className="inline-actions">
              <Button variant="secondary" onClick={() => { setForm(p); setErrors({}); }}>Edit</Button>
              <Button variant="danger" onClick={() => setToDelete(p)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog open={!!toDelete} title="Delete this item?" message={`"${toDelete?.title}" will be removed from your profile.`}
        confirmLabel="Delete" danger loading={removing} onCancel={() => setToDelete(null)} onConfirm={remove} />
    </main>
  );
}
