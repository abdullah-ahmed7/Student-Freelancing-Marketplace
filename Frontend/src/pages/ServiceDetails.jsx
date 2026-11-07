import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderService, serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useSubmit } from '../hooks/useSubmit';
import { useAuth, useDocumentTitle, useFavorites, useToast } from '../hooks/useApp';
import { Avatar, Button, ErrorState, FormField, LoadingState, RatingStars, StatusBadge, VerifiedBadge } from '../components/ui';
import ReportDialog from '../components/ReportDialog';
import { formatDate, formatPKR } from '../utils/format';

export default function ServiceDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const fav = useFavorites();
  const navigate = useNavigate();
  const { data: service, error, loading, reload } = useAsync(() => serviceService.get(id), id);
  useDocumentTitle(service?.title || 'Service');

  const [form, setForm] = useState({ requirements: '', requestedDeadline: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const [placeOrder, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setFormError(''); setErrors({});
    try {
      const o = await orderService.create({ serviceId: id, ...form });
      showToast('Order requested! The seller has been notified.');
      navigate(`/orders/${o.id}`);
    } catch (err) {
      if (err.fields) setErrors(err.fields); else setFormError(err.message);
    }
  });

  if (!service && loading) return <LoadingState label="Loading service…" />;
  if (error) {
    return (
      <section className="service-details">
        <Link to="/marketplace" className="back-link">← Back to Marketplace</Link>
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} title={error.status === 404 ? 'Service not found' : undefined} />
      </section>
    );
  }
  if (!service) return null;

  const own = user && user.id === service.sellerId;
  const saved = fav.ids.includes(service.id);
  const images = service.images || [];

  async function toggleSave() {
    try {
      const s = await fav.toggle(service.id);
      showToast(s ? 'Saved to your list.' : 'Removed from saved.');
    } catch (err) { showToast(err.message, 'error'); }
  }

  return (
    <section className="service-details">
      <Link to="/marketplace" className="back-link">← Back to Marketplace</Link>

      <div className="detail-layout">
        <div className="service-details-card">
          <div className="detail-top">
            <p className="section-label">{service.category}</p>
            {service.status !== 'Active' && <StatusBadge status={service.status} />}
          </div>
          <h1>{service.title}</h1>
          <div className="detail-rating"><RatingStars value={service.rating.avg} count={service.rating.count} size={18} /></div>

          {images.length > 0 && (
            <div className="gallery">
              <img className="gallery-main" src={images[imgIdx]} alt={`${service.title} — image ${imgIdx + 1}`} />
              {images.length > 1 && (
                <div className="gallery-thumbs">
                  {images.map((src, i) => (
                    <button key={src + i} type="button" className={i === imgIdx ? 'on' : ''} aria-label={`Show image ${i + 1}`} onClick={() => setImgIdx(i)}>
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="detail-h2">About this service</h2>
          <p className="service-description pre-wrap">{service.description}</p>

          {service.requirements && (
            <>
              <h2 className="detail-h2">What the seller needs from you</h2>
              <p className="service-description pre-wrap">{service.requirements}</p>
            </>
          )}

          <div className="seller-info">
            <Avatar name={service.seller.fullName} src={service.seller.avatarUrl} size={48} />
            <div>
              <Link to={`/students/${service.seller.id}`} className="plain-link"><strong>{service.seller.fullName}</strong></Link>
              <p>{service.seller.degree} {service.seller.program} · Semester {service.seller.semester}</p>
              <div className="chip-row"><VerifiedBadge verified={service.seller.verified} />
                <span className={`badge ${service.seller.availability ? 'badge-ok' : 'badge-muted'}`}>{service.seller.availability ? 'Available' : 'Busy'}</span></div>
            </div>
          </div>

          <h2 className="detail-h2">Reviews ({service.reviews.length})</h2>
          {service.reviews.length === 0 && <p className="muted-text">No reviews yet. Reviews appear after completed orders.</p>}
          <ul className="review-list">
            {service.reviews.map((r) => (
              <li key={r.id}>
                <div className="review-head"><strong>{r.buyerName}</strong><RatingStars value={r.rating} /><span className="muted-text">{formatDate(r.createdAt)}</span></div>
                <p>{r.comment}</p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="order-panel">
          <div className="service-details-meta">
            <div><p>Starting Price</p><h2>{formatPKR(service.price)}</h2></div>
            <div><p>Delivery Time</p><h2>{service.deliveryDays} Day{service.deliveryDays > 1 ? 's' : ''}</h2></div>
          </div>

          {own ? (
            <>
              <p className="note-box">This is your own service. You cannot order it.</p>
              <Button to={`/services/${service.id}/edit`} variant="secondary">Edit service</Button>
            </>
          ) : service.status !== 'Active' ? (
            <p className="note-box">This service is not currently accepting orders.</p>
          ) : !user ? (
            <>
              <p className="note-box">Log in with your student account to place an order.</p>
              <Button to="/login" state={{ from: `/services/${service.id}` }}>Log in to order</Button>
            </>
          ) : (
            <form onSubmit={placeOrder} noValidate>
              <h2 className="detail-h2">Request this service</h2>
              <FormField id="requirements" label="Your requirements" as="textarea" rows={5} maxLength={1500}
                placeholder="Describe what you need, any links, and what you want to learn or receive…"
                value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} error={errors.requirements} />
              <FormField id="requestedDeadline" label="Requested deadline (optional)" type="date"
                value={form.requestedDeadline} onChange={(e) => setForm({ ...form, requestedDeadline: e.target.value })} error={errors.requestedDeadline} />
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <Button type="submit" className="full" loading={pending}>Place order request</Button>
              <p className="field-hint">No payment is taken on StudentHub. Agree the details with the seller in the order chat.</p>
            </form>
          )}

          {user && !own && (
            <div className="panel-actions">
              <button type="button" className="link-btn-text" onClick={toggleSave}>{saved ? '♥ Saved' : '♡ Save for later'}</button>
              <button type="button" className="link-btn-text" onClick={() => setReporting(true)}>⚑ Report</button>
            </div>
          )}
        </aside>
      </div>

      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="service" targetId={service.id} />
    </section>
  );
}
