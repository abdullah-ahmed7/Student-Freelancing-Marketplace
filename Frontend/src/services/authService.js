import { run, currentUserOrThrow } from './runtime';
import { ApiError, setSession, clearSession, getSessionUserId, uid } from './mockDb';
import { DEMO_OTP } from '../utils/constants';

const strip = (u) => ({ ...u });

export const authService = {
  login: ({ email }) => run('Login', (d) => {
    const u = d.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) throw new ApiError('No account found for that email.', 401, { email: 'No account found for that email.' });
    if (u.status === 'suspended') throw new ApiError('This account is suspended. Contact the administrator.', 403);
    setSession(u.id);
    return strip(u);
  }),

  register: (f) => run('Register', (d) => {
    if (d.users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase())) {
      throw new ApiError('An account with this email already exists.', 409, { email: 'This email is already registered.' });
    }
    // Role is always "student". Admin can never be chosen at signup.
    const user = {
      id: uid('u'), role: 'student', fullName: f.fullName.trim(), email: f.email.trim().toLowerCase(),
      degree: f.degree, program: f.program.trim(), department: f.department.trim(), semester: f.semester,
      bio: '', avatarUrl: '', verified: false, status: 'active', availability: true, skills: [],
      createdAt: new Date().toISOString(),
    };
    d.users.push(user);
    setSession(user.id);
    return strip(user);
  }, { write: true }),

  restore: () => run('Session', (d) => {
    const id = getSessionUserId();
    const u = d.users.find((x) => x.id === id);
    if (!u || u.status === 'suspended') { clearSession(); return null; }
    return strip(u);
  }, { ms: 80 }),

  logout: async () => { clearSession(); },

  // Demo verification: the "code" is shown on screen and labelled as demo.
  verify: (code) => run('Verification', (d) => {
    const me = currentUserOrThrow(d);
    if (code.trim() !== DEMO_OTP) throw new ApiError('That code is not correct.', 400, { code: 'That code is not correct.' });
    me.verified = true;
    return strip(me);
  }, { write: true }),
};
