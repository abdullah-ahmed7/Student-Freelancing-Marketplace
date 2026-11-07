import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { useSubmit } from '../hooks/useSubmit';
import { Button, FormField } from '../components/ui';
import { DEMO_OTP } from '../utils/constants';

export default function Verify() {
  useDocumentTitle('Verify account');
  const { user, verify } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code.'); return; }
    try {
      await verify(code);
      showToast('Your account is verified.');
      navigate('/dashboard');
    } catch (err) { setError(err.fields?.code || err.message); }
  });

  if (user.verified) {
    return (
      <section className="auth-section"><div className="auth-card center-text">
        <p className="tagline">ALL SET</p><h1>You're verified ✓</h1>
        <p className="auth-description">Your university email {user.email} is verified.</p>
        <Link to="/dashboard" className="primary-btn link-btn">Go to Dashboard</Link>
      </div></section>
    );
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="tagline">VERIFY YOUR ACCOUNT</p>
        <h1>Confirm your university email</h1>
        <p className="auth-description">We would send a 6-digit code to <strong>{user.email}</strong>. Verified students get a trust badge on their profile and services.</p>
        <div className="demo-box">
          <strong>Demo only</strong>
          <p>No email is sent in demo mode. Use the code <code>{DEMO_OTP}</code>.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <FormField id="code" label="Verification code" inputMode="numeric" maxLength={6} placeholder="123456"
            value={code} onChange={(e) => setCode(e.target.value)} error={error} />
          <Button type="submit" className="auth-submit" loading={pending}>Verify</Button>
        </form>
        <p className="auth-footer"><Link to="/dashboard">Skip for now</Link></p>
      </div>
    </section>
  );
}
