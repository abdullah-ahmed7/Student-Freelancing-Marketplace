import { formatDateTime } from '../utils/format';

const MAIN = ['Requested', 'Accepted', 'In Progress', 'Delivered', 'Completed'];

export default function OrderTimeline({ order }) {
  const reached = new Map();
  order.timeline.forEach((t) => reached.set(t.status, t));
  const ended = ['Rejected', 'Cancelled'].find((s) => reached.has(s));
  const steps = ended ? [...MAIN.filter((s) => reached.has(s)), ended] : MAIN;
  const hadRevision = reached.has('Revision Requested');
  return (
    <ol className="timeline" aria-label="Order progress">
      {steps.map((s) => {
        const hit = reached.get(s);
        const current = order.status === s || (s === 'In Progress' && order.status === 'Revision Requested');
        const cls = ['timeline-step', hit ? 'done' : '', current ? 'current' : '', s === ended ? 'ended' : ''].join(' ');
        return (
          <li key={s} className={cls} aria-current={current ? 'step' : undefined}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{s === 'In Progress' && order.status === 'Revision Requested' ? 'In Progress (revision)' : s}</strong>
              <span className="muted-text">{hit ? formatDateTime(hit.at) : 'Pending'}</span>
            </div>
          </li>
        );
      })}
      {hadRevision && order.status === 'Revision Requested' && (
        <li className="timeline-step done current"><span className="timeline-dot" aria-hidden="true" />
          <div><strong>Revision Requested</strong><span className="muted-text">Waiting for seller</span></div></li>
      )}
    </ol>
  );
}
