import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { allowedActions, orderService, reviewService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useSubmit } from '../hooks/useSubmit';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { Avatar, Button, ErrorState, FormField, LoadingState, RatingStars, StatusBadge } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import OrderTimeline from '../components/OrderTimeline';
import { formatDate, formatDateTime, formatPKR } from '../utils/format';

const ACTION_LABEL = {
  accept: 'Accept request', reject: 'Reject', start: 'Start work', deliver: 'Submit delivery',
  complete: 'Accept delivery', revise: 'Request revision', cancel: 'Cancel order',
};
const NEEDS_CONFIRM = { reject: true, cancel: true, complete: true };
const CONFIRM_TEXT = {
  reject: 'Reject this request? The buyer will be notified.',
  cancel: 'Cancel this order? This cannot be undone.',
  complete: 'Accept the delivery and complete the order? The buyer can then leave a review.',
};

function Messages({ orderId, myId }) {
  const { data, error, reload } = useAsync(() => orderService.listMessages(orderId), orderId);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const endRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [data]);

  const [send, sending] = useSubmit(async (e) => {
    e.preventDefault(); setErr('');
    try { await orderService.sendMessage(orderId, text); setText(''); reload(); }
    catch (er) { setErr(er.message); showToast(er.message, 'error'); }
  });

  return (
    <div className="panel chat">
      <h2>Messages</h2>
      {error && <ErrorState error={error} onRetry={reload} />}
      <div className="chat-log" role="log" aria-live="polite">
        {data && data.length === 0 && <p className="muted-text">No messages yet. Say hello and agree on the details.</p>}
        {data?.map((m) => (
          <div key={m.id} className={`bubble ${m.senderId === myId ? 'mine' : ''}`}>
            <p>{m.text}</p><span>{formatDateTime(m.at)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={send}>
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" value={text} maxLength={1000} placeholder="Write a message…" onChange={(e) => setText(e.target.value)} />
        <Button type="submit" loading={sending} disabled={!text.trim()}>Send</Button>
      </form>
      {err && <p className="field-error" role="alert">{err}</p>}
    </div>
  );
}

function ReviewBox({ order, onDone }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault(); setErrors({});
    try { await reviewService.create({ orderId: order.id, rating, comment }); showToast('Thanks for your review!'); onDone(); }
    catch (err) { setErrors(err.fields || { comment: err.message }); }
  });
  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>Leave a review</h2>
      <p className="muted-text">You can review this order once.</p>
      <RatingStars value={rating} onChange={setRating} size={28} />
      {errors.rating && <p className="field-error" role="alert">{errors.rating}</p>}
      <FormField id="comment" label="Your review" as="textarea" rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} error={errors.comment} />
      <Button type="submit" loading={pending}>Submit review</Button>
    </form>
  );
}

export default function OrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: o, error, loading, reload } = useAsync(() => orderService.get(id), id);
  useDocumentTitle(o ? `Order · ${o.serviceTitle}` : 'Order');

  const [confirm, setConfirm] = useState(null);       // action name needing a confirm dialog
  const [panel, setPanel] = useState(null);           // 'deliver' | 'revise'
  const [fields, setFields] = useState({ message: '', link: '', note: '' });
  const [errors, setErrors] = useState({});
  const [actionError, setActionError] = useState('');

  const [perform, pending] = useSubmit(async (action, payload) => {
    setActionError(''); setErrors({});
    try {
      await orderService.act(id, action, payload);
      showToast(`Order updated: ${ACTION_LABEL[action].toLowerCase()}.`);
      setConfirm(null); setPanel(null); setFields({ message: '', link: '', note: '' });
      reload();
    } catch (err) {
      // invalid transitions or permission errors from the server are shown to the user
      if (err.fields) setErrors(err.fields); else { setActionError(err.message); setConfirm(null); }
      reload();
    }
  });

  if (!o && loading) return <LoadingState />;
  if (error) return <main className="page-wrap"><Link to="/orders" className="back-link">← Orders</Link><ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} /></main>;
  if (!o) return null;

  const isBuyer = o.buyerId === user.id;
  const other = isBuyer ? o.seller : o.buyer;
  const actions = allowedActions(o, user.id);

  function onAction(a) {
    setActionError(''); setErrors({});
    if (a === 'deliver' || a === 'revise') setPanel(a);
    else if (NEEDS_CONFIRM[a]) setConfirm(a);
    else perform(a);
  }

  return (
    <main className="page-wrap">
      <Link to="/orders" className="back-link">← Orders</Link>
      <div className="order-head">
        <div>
          <p className="tagline">ORDER #{o.id.slice(-6).toUpperCase()}</p>
          <h1>{o.serviceTitle}</h1>
          <p className="muted-text">You are the <strong>{isBuyer ? 'buyer' : 'seller'}</strong> · placed {formatDate(o.createdAt)}</p>
        </div>
        <StatusBadge status={o.status} />
      </div>

      <div className="order-layout">
        <div className="order-main">
          <div className="panel">
            <h2>Order details</h2>
            <dl className="detail-list">
              <div><dt>{isBuyer ? 'Seller' : 'Buyer'}</dt><dd><Avatar name={other.fullName} src={other.avatarUrl} size={28} /> <Link to={`/students/${other.id}`}>{other.fullName}</Link></dd></div>
              <div><dt>Price (at order time)</dt><dd>{formatPKR(o.price)}</dd></div>
              <div><dt>Delivery estimate</dt><dd>{o.deliveryDays} day{o.deliveryDays > 1 ? 's' : ''}</dd></div>
              <div><dt>Requested deadline</dt><dd>{o.requestedDeadline ? formatDate(o.requestedDeadline) : 'None'}</dd></div>
              <div><dt>Service</dt><dd><Link to={`/services/${o.serviceId}`}>View listing</Link></dd></div>
            </dl>
            <h3 className="detail-h3">Requirements</h3>
            <p className="pre-wrap">{o.requirements}</p>
            <p className="field-hint">Payment is not processed on StudentHub. Agree any arrangement directly.</p>
          </div>

          {o.delivery && (
            <div className="panel">
              <h2>Delivery</h2>
              <p className="pre-wrap">{o.delivery.message}</p>
              {o.delivery.link && <p><a href={o.delivery.link} target="_blank" rel="noopener noreferrer">Open delivered files ↗</a></p>}
              <p className="muted-text">Delivered {formatDateTime(o.delivery.at)}</p>
            </div>
          )}
          {o.status === 'Revision Requested' && o.revisionNote && (
            <div className="panel"><h2>Revision requested</h2><p className="pre-wrap">{o.revisionNote}</p></div>
          )}

          {actionError && <p className="form-error" role="alert">{actionError}</p>}

          {actions.length > 0 && !panel && (
            <div className="panel">
              <h2>Next step</h2>
              <div className="inline-actions">
                {actions.map((a) => (
                  <Button key={a} variant={a === 'reject' || a === 'cancel' ? 'danger' : a === 'revise' ? 'secondary' : 'primary'} loading={pending && !confirm} onClick={() => onAction(a)}>
                    {ACTION_LABEL[a]}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {!actions.length && !['Completed', 'Rejected', 'Cancelled'].includes(o.status) && (
            <p className="note-box">Waiting for the {isBuyer ? 'seller' : 'buyer'} to take the next step.</p>
          )}

          {panel === 'deliver' && (
            <form className="panel" onSubmit={(e) => { e.preventDefault(); perform('deliver', { message: fields.message, link: fields.link }); }} noValidate>
              <h2>Submit delivery</h2>
              <FormField id="dm" label="Delivery note" as="textarea" rows={4} maxLength={1000} value={fields.message} onChange={(e) => setFields({ ...fields, message: e.target.value })} error={errors.message} />
              <FormField id="dl" label="Link to files (optional)" placeholder="https://drive.google.com/…" value={fields.link} onChange={(e) => setFields({ ...fields, link: e.target.value })} />
              <div className="inline-actions"><Button type="submit" loading={pending}>Send delivery</Button><Button variant="secondary" onClick={() => setPanel(null)}>Cancel</Button></div>
            </form>
          )}
          {panel === 'revise' && (
            <form className="panel" onSubmit={(e) => { e.preventDefault(); perform('revise', { note: fields.note }); }} noValidate>
              <h2>Request a revision</h2>
              <FormField id="rn" label="What should change?" as="textarea" rows={4} maxLength={1000} value={fields.note} onChange={(e) => setFields({ ...fields, note: e.target.value })} error={errors.note} />
              <div className="inline-actions"><Button type="submit" loading={pending}>Send request</Button><Button variant="secondary" onClick={() => setPanel(null)}>Cancel</Button></div>
            </form>
          )}

          {o.status === 'Completed' && isBuyer && !o.review && <ReviewBox order={o} onDone={reload} />}
          {o.review && (
            <div className="panel"><h2>Review</h2>
              <RatingStars value={o.review.rating} size={20} /><p>{o.review.comment}</p>
              <p className="muted-text">Left {formatDate(o.review.createdAt)}</p></div>
          )}
          {o.status === 'Completed' && !isBuyer && !o.review && <p className="note-box">The buyer can leave a review for this order.</p>}
        </div>

        <aside className="order-side">
          <div className="panel"><h2>Progress</h2><OrderTimeline order={o} /></div>
          <Messages orderId={o.id} myId={user.id} />
        </aside>
      </div>

      <ConfirmDialog open={!!confirm} title={confirm ? ACTION_LABEL[confirm] : ''} message={confirm ? CONFIRM_TEXT[confirm] : ''}
        confirmLabel={confirm ? ACTION_LABEL[confirm] : ''} danger={confirm === 'reject' || confirm === 'cancel'} loading={pending}
        onCancel={() => setConfirm(null)} onConfirm={() => perform(confirm)} />
    </main>
  );
}
