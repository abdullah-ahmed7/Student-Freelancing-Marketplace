import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { useSubmit } from '../hooks/useSubmit';
import { FormField, Button } from '../components/ui';
import { validateRegister } from '../utils/validators';
import { DEGREE_PROGRAMS, SEMESTERS } from '../utils/constants';

export default function Register() {
  useDocumentTitle('Create account');
  const { user, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', degree: '', program: '', department: '', semester: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [justRegistered, setJustRegistered] = useState(false); // stops the signed-in redirect from racing with /verify

  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = validateRegister(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      setJustRegistered(true);
      await register(form); // role is always "student"; admin cannot be chosen here
      showToast('Account created! Verify your university email to earn the Verified badge.');
      navigate('/verify', { replace: true });
    } catch (err) {
      setJustRegistered(false);
      if (err.fields) setErrors(err.fields); else setFormError(err.message);
    }
  });

  if (user && !justRegistered) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-wide">
        <p className="tagline">JOIN OUR COMMUNITY</p>
        <h1>Create Account</h1>
        <p className="auth-description">One student account lets you both offer services and order from others.</p>

        <form onSubmit={submit} noValidate>
          <FormField id="fullName" label="Full Name" autoComplete="name" placeholder="Enter your full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
          <FormField id="email" label="University Email" type="email" autoComplete="email" placeholder="you@university.edu.pk" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="field-row">
            <FormField id="degree" label="Degree" as="select" value={form.degree} onChange={set('degree')} error={errors.degree}>
              <option value="">Select…</option>
              {DEGREE_PROGRAMS.map((d) => <option key={d}>{d}</option>)}
            </FormField>
            <FormField id="semester" label="Semester" as="select" value={form.semester} onChange={set('semester')} error={errors.semester}>
              <option value="">Select…</option>
              {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
            </FormField>
          </div>
          <FormField id="program" label="Program" placeholder="e.g. Computer Science" value={form.program} onChange={set('program')} error={errors.program} />
          <FormField id="department" label="Department" placeholder="e.g. Computing" value={form.department} onChange={set('department')} error={errors.department} />
          <FormField id="password" label="Password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} />
          <FormField id="confirm" label="Confirm Password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <Button type="submit" className="auth-submit" loading={pending}>Create Account</Button>
        </form>

        <p className="auth-footer">Already registered? <Link to="/login">Login</Link></p>
      </div>
    </section>
  );
}
