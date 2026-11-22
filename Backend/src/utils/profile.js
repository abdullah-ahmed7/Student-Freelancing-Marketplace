// Profile completeness shown on the student dashboard / own profile.
export function completeness(user, { hasActiveService = false } = {}) {
  const fields = {
    verified: !!user.verified,
    bio: !!user.bio,
    avatar: !!user.avatarUrl,
    skills: (user.skills || []).length > 0,
    service: hasActiveService,
  };
  const done = Object.values(fields).filter(Boolean).length;
  return { percent: Math.round((done / Object.keys(fields).length) * 100), fields };
}
