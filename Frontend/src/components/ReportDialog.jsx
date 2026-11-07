import { useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { FormField } from './ui';
import { REPORT_REASONS } from '../utils/constants';
import { reportService } from '../services';
import { useSubmit } from '../hooks/useSubmit';
import { useToast } from '../hooks/useApp';

export default function ReportDialog({ open, onClose, targetType, targetId }) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const [send, pending] = useSubmit(async () => {
    setError('');
    try {
      await reportService.create({ targetType, targetId, reason, details });
      showToast('Report sent. An administrator will review it.');
      setReason(''); setDetails('');
      onClose();
    } catch (err) { setError(err.message); }
  });

  return (
    <ConfirmDialog open={open} title={`Report this ${targetType}`} confirmLabel="Send report" danger
      loading={pending} onCancel={onClose} onConfirm={send}>
      <FormField id="rp-reason" label="Reason" as="select" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select a reason…</option>
        {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
      </FormField>
      <FormField id="rp-details" label="Details (optional)" as="textarea" rows={3} maxLength={500}
        value={details} onChange={(e) => setDetails(e.target.value)} />
      {error && <p className="field-error" role="alert">{error}</p>}
    </ConfirmDialog>
  );
}
