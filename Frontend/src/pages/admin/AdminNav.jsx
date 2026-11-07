import { NavLink } from 'react-router-dom';

const LINKS = [['/admin', 'Overview', true], ['/admin/users', 'Users'], ['/admin/categories', 'Categories'], ['/admin/services', 'Services'], ['/admin/reviews', 'Reviews'], ['/admin/reports', 'Reports']];

export default function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}
    </nav>
  );
}
