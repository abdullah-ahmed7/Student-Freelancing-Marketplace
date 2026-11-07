import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { categoryService, serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useSubmit } from '../hooks/useSubmit';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { Button, ErrorState, FormField, LoadingState } from '../components/ui';
import { validateService } from '../utils/validators';

function Form({ existing, categories }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const editing = !!existing;
  const [f, setF] = useState(existing ? {
    title: existing.title, categoryId: existing.categoryId, description: existing.description,
    price: String(existing.price), deliveryDays: String(existing.deliveryDays),
    requirements: existing.requirements || '', status: existing.status,
    images: [...(existing.images || []), '', '', '', ''].slice(0, 4),
  } : {
    title: '', categoryId: categories[0]?.id || '', description: '', price: '', deliveryDays: '',
    requirements: '', status: 'Active', images: ['', '', '', ''],
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = validateService(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = { ...f, images: f.images.map((u) => u.trim()).filter(Boolean) };
    try {
      if (editing) await serviceService.update(existing.id, payload); else await serviceService.create(payload);
      showToast(editing ? 'Service updated.' : 'Service saved.');
      navigate('/my-services');
    } catch (err) {
      if (err.fields) setErrors(err.fields); else setFormError(err.message);
    }
  });

  return (
    <main className="create-service-page">
      <div className="create-service-card">
        <Link to="/my-services" className="back-link">← Back to My Services</Link>
        <p className="tagline">SELL YOUR SKILLS</p>
        <h1>{editing ? 'Edit Service' : 'Create a Service'}</h1>
        <p className="create-service-description">Showcase your skills and help other students.</p>
        <p className="note-box">Academic services must be tutoring, mentoring, debugging, explanation or study guidance. Listings that offer to complete graded work for someone else will be removed.</p>

        <form onSubmit={submit} noValidate>
          <FormField id="title" label="Service Title" placeholder="e.g. React Website Development" maxLength={100} value={f.title} onChange={set('title')} error={errors.title} />
          <FormField id="categoryId" label="Category" as="select" value={f.categoryId} onChange={set('categoryId')} error={errors.category}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormField>
          <FormField id="description" label="Description" as="textarea" rows={5} maxLength={2000} placeholder="Explain what your service includes…"
            value={f.description} onChange={set('description')} error={errors.description} hint={`${f.description.length}/2000`} />
          <div className="field-row">
            <FormField id="price" label="Price (PKR)" type="number" min="1" step="1" placeholder="e.g. 5000" value={f.price} onChange={set('price')} error={errors.price} />
            <FormField id="deliveryDays" label="Delivery (days)" type="number" min="1" max="365" step="1" placeholder="e.g. 5" value={f.deliveryDays} onChange={set('deliveryDays')} error={errors.deliveryDays} />
          </div>
          <FormField id="requirements" label="What do you need from the buyer? (optional)" as="textarea" rows={3} maxLength={800}
            placeholder="e.g. Links to your project, the topic you're stuck on…" value={f.requirements} onChange={set('requirements')} />
          <fieldset className="fieldset">
            <legend>Images (optional, up to 4 image URLs)</legend>
            {f.images.map((url, i) => (
              <FormField key={i} id={`img${i}`} label={`Image ${i + 1}`} placeholder="https://…" value={url}
                onChange={(e) => setF({ ...f, images: f.images.map((u, j) => (j === i ? e.target.value : u)) })} error={i === 0 ? errors.images : undefined} />
            ))}
          </fieldset>
          <FormField id="status" label="Visibility" as="select" value={f.status} onChange={set('status')}
            hint="Only Active services appear in the marketplace.">
            <option value="Active">Active — visible in marketplace</option>
            <option value="Draft">Draft — only you can see it</option>
            <option value="Paused">Paused — hidden, not taking orders</option>
            {editing && <option value="Archived">Archived</option>}
          </FormField>

          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Button type="submit" className="auth-submit" loading={pending}>{editing ? 'Save changes' : f.status === 'Active' ? 'Publish Service' : 'Save Service'}</Button>
        </form>
      </div>
    </main>
  );
}

export default function ServiceForm() {
  const { id } = useParams();
  const { user } = useAuth();
  useDocumentTitle(id ? 'Edit Service' : 'Create Service');
  const cats = useAsync(() => categoryService.list(), 'cats');
  const svc = useAsync(() => (id ? serviceService.get(id) : Promise.resolve(null)), `svc-${id || 'new'}`);

  if (cats.error) return <main className="page-wrap"><ErrorState error={cats.error} onRetry={cats.reload} /></main>;
  if (svc.error) return <main className="page-wrap"><ErrorState error={svc.error} onRetry={svc.reload} /></main>;
  if (!cats.data || svc.loading) return <LoadingState />;
  if (id && svc.data.sellerId !== user.id) {
    return <main className="page-wrap"><ErrorState title="Not your service" error={{ message: 'You can only edit services you created.' }} /></main>;
  }
  return <Form key={id || 'new'} existing={svc.data} categories={cats.data} />;
}
