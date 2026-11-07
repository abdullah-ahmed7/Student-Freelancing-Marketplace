import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { useSubmit } from '../hooks/useSubmit';
import { FormField, Button } from '../components/ui';
import { isEmail } from '../utils/validators';
import { USE_MOCK } from '../services';

export default function Login() {
  useDocumentTitle('Login');
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = {};
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const u = await login(form);
      showToast(`Welcome back, ${u.fullName.split(' ')[0]}!`);
      navigate(location.state?.from || (u.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      if (err.fields) setErrors(err.fields); else setFormError(err.message);
    }
  });

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="tagline">WELCOME BACK</p>
        <h1>Login to StudentHub</h1>
        <p className="auth-description">Continue your student freelancing journey.</p>

        <form onSubmit={submit} noValidate>
          <FormField id="email" label="University Email" type="email" autoComplete="email" placeholder="you@university.edu.pk"
            value={form.email} onChange={set('email')} error={errors.email} />
          <FormField id="password" label="Password" type="password" autoComplete="current-password" placeholder="Enter your password"
            value={form.password} onChange={set('password')} error={errors.password} />
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Button type="submit" className="auth-submit" loading={pending}>Login</Button>
        </form>

        {USE_MOCK && (
          <div className="demo-box">
            <strong>Demo mode</strong>
            <p>Passwords are not checked. Try a demo account:</p>
            <div className="chip-row">
              <button type="button" className="chip chip-btn" onClick={() => setForm({ email: 'ali.hassan@lhr.nu.edu.pk', password: 'demo-password' })}>Student (Ali)</button>
              <button type="button" className="chip chip-btn" onClick={() => setForm({ email: 'sara.ahmed@lhr.nu.edu.pk', password: 'demo-password' })}>Student (Sara)</button>
              <button type="button" className="chip chip-btn" onClick={() => setForm({ email: 'admin@lhr.nu.edu.pk', password: 'demo-password' })}>Admin</button>
            </div>
          </div>
        )}

        <p className="auth-footer">Don't have an account? <Link to="/register">Create one</Link></p>
      </div>
    </section>
  );
}
