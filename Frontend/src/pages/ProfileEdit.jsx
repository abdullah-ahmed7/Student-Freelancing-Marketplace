import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../services';
import { useAuth, useDocumentTitle, useToast } from '../hooks/useApp';
import { useSubmit } from '../hooks/useSubmit';
import { Avatar, Button, FormField, PageHeader } from '../components/ui';
import { isUrl } from '../utils/validators';
import { DEGREE_PROGRAMS, SEMESTERS } from '../utils/constants';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileEdit() {
  useDocumentTitle('Edit Profile');
  const { user, setUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({
    fullName: user.fullName, degree: user.degree, program: user.program, department: user.department,
    semester: user.semester, bio: user.bio, avatarUrl: user.avatarUrl, availability: user.availability,
  });
  const [skills, setSkills] = useState(user.skills);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'Intermediate' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function addSkill() {
    const name = newSkill.name.trim();
    if (!name) { setErrors({ ...errors, skill: 'Enter a skill name.' }); return; }
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) { setErrors({ ...errors, skill: 'You already added that skill.' }); return; }
    if (skills.length >= 15) { setErrors({ ...errors, skill: 'You can add up to 15 skills.' }); return; }
    setSkills([...skills, { name, level: newSkill.level }]);
    setNewSkill({ ...newSkill, name: '' });
    setErrors({ ...errors, skill: '' });
  }

  const [submit, pending] = useSubmit(async (e) => {
    e.preventDefault();
    setFormError('');
    const errs = {};
    if (!f.fullName.trim()) errs.fullName = 'Enter your full name.';
    if (!f.program.trim()) errs.program = 'Enter your program.';
    if (!f.department.trim()) errs.department = 'Enter your department.';
    if (f.bio.length > 500) errs.bio = 'Bio must be 500 characters or fewer.';
    if (f.avatarUrl && !isUrl(f.avatarUrl)) errs.avatarUrl = 'Enter a valid http(s) image URL.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const updated = await profileService.update({ ...f, fullName: f.fullName.trim(), skills });
      setUser(updated);
      showToast('Profile updated.');
      navigate('/profile');
    } catch (err) { setFormError(err.message); }
  });

  return (
    <main className="page-wrap narrow">
      <PageHeader tagline="YOUR PROFILE" title="Edit Profile" />
      <form className="panel form-panel" onSubmit={submit} noValidate>
        <div className="avatar-edit"><Avatar name={f.fullName} src={isUrl(f.avatarUrl) ? f.avatarUrl : ''} size={72} /></div>
        <FormField id="avatarUrl" label="Profile image URL (optional)" placeholder="https://…" value={f.avatarUrl} onChange={set('avatarUrl')} error={errors.avatarUrl} />
        <FormField id="fullName" label="Full name" value={f.fullName} onChange={set('fullName')} error={errors.fullName} />
        <div className="field-row">
          <FormField id="degree" label="Degree" as="select" value={f.degree} onChange={set('degree')}>{DEGREE_PROGRAMS.map((d) => <option key={d}>{d}</option>)}</FormField>
          <FormField id="semester" label="Semester" as="select" value={f.semester} onChange={set('semester')}>{SEMESTERS.map((s) => <option key={s}>{s}</option>)}</FormField>
        </div>
        <FormField id="program" label="Program" value={f.program} onChange={set('program')} error={errors.program} />
        <FormField id="department" label="Department" value={f.department} onChange={set('department')} error={errors.department} />
        <FormField id="bio" label="Bio" as="textarea" rows={4} maxLength={500} value={f.bio} onChange={set('bio')} error={errors.bio}
          hint={`${f.bio.length}/500 — what can you help classmates with?`} />

        <fieldset className="fieldset">
          <legend>Skills</legend>
          <div className="chip-row">
            {skills.map((s) => (
              <span key={s.name} className="chip">{s.name} <em>· {s.level}</em>
                <button type="button" className="chip-x" aria-label={`Remove ${s.name}`} onClick={() => setSkills(skills.filter((x) => x.name !== s.name))}>×</button></span>
            ))}
            {skills.length === 0 && <span className="muted-text">No skills added yet.</span>}
          </div>
          <div className="skill-add">
            <FormField id="skillName" label="Skill" placeholder="e.g. Python" value={newSkill.name} error={errors.skill}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
            <FormField id="skillLevel" label="Level" as="select" value={newSkill.level} onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </FormField>
            <Button variant="secondary" onClick={addSkill}>Add</Button>
          </div>
        </fieldset>

        <label className="check"><input type="checkbox" checked={f.availability} onChange={(e) => setF({ ...f, availability: e.target.checked })} /> I'm available for new orders</label>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="inline-actions">
          <Button type="submit" loading={pending}>Save changes</Button>
          <Button to="/profile" variant="secondary">Cancel</Button>
        </div>
      </form>
    </main>
  );
}
