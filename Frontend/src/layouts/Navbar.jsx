import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../hooks/useApp';
import { useAsync } from '../hooks/useAsync';
import { notificationService } from '../services';
import { Avatar } from '../components/ui';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // { path, menu: 'main' | 'user' }
  const wrapRef = useRef(null);

  // Menus close automatically when the route changes
  const menu = open && open.path === location.pathname ? open.menu : null;
  const setMenu = (m) => setOpen(m ? { path: location.pathname, menu: m } : null);

  const { data: notes } = useAsync(
    () => (user ? notificationService.list() : Promise.resolve([])),
    `${user?.id || 'guest'}:${location.pathname}`,
  );
  const unread = (notes || []).filter((n) => !n.read).length;

  useEffect(() => {
    if (!menu) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menu]);

  async function handleLogout() {
    await logout();
    showToast('You have been logged out.');
    navigate('/');
  }

  const linkCls = ({ isActive }) => (isActive ? 'active' : undefined);

  return (
    <nav className="navbar" ref={wrapRef} aria-label="Main">
      <Link to="/" className="logo">Student<span>Hub</span></Link>

      <button type="button" className="menu-toggle" aria-expanded={menu === 'main'} aria-controls="nav-links"
        onClick={() => setMenu(menu === 'main' ? null : 'main')}>
        <span className="sr-only">Toggle menu</span>☰
      </button>

      <div id="nav-links" className={`nav-links ${menu === 'main' ? 'open' : ''}`}>
        {user && !isAdmin && <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>}
        <NavLink to="/marketplace" className={linkCls}>Explore Services</NavLink>
        <NavLink to="/students" className={linkCls}>Students</NavLink>
        {user && !isAdmin && <NavLink to="/my-services" className={linkCls}>My Services</NavLink>}
        {user && !isAdmin && <NavLink to="/orders" className={linkCls}>Orders</NavLink>}
        {user && !isAdmin && <NavLink to="/saved" className={linkCls}>Saved</NavLink>}
        {isAdmin && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
        {!user && <Link to="/#categories">Categories</Link>}
      </div>

      <div className="nav-buttons">
        {!user && (
          <>
            <Link to="/login" className="login-btn">Login</Link>
            <Link to="/register" className="signup-btn">Join Now</Link>
          </>
        )}
        {user && (
          <>
            {!isAdmin && <Link to="/create-service" className="signup-btn nav-create">Create Service</Link>}
            {!isAdmin && (
              <Link to="/notifications" className="bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
                🔔{unread > 0 && <span className="bell-count">{unread}</span>}
              </Link>
            )}
            <div className="user-menu">
              <button type="button" className="user-btn" aria-haspopup="menu" aria-expanded={menu === 'user'}
                onClick={() => setMenu(menu === 'user' ? null : 'user')}>
                <Avatar name={user.fullName} src={user.avatarUrl} size={34} />
                <span className="user-name">{user.fullName.split(' ')[0]}</span>
              </button>
              {menu === 'user' && (
                <div className="dropdown" role="menu">
                  <p className="dropdown-head">{user.email}</p>
                  {!isAdmin && <Link role="menuitem" to="/profile">My Profile</Link>}
                  {!isAdmin && <Link role="menuitem" to="/portfolio">Portfolio</Link>}
                  {!isAdmin && !user.verified && <Link role="menuitem" to="/verify">Verify account</Link>}
                  {!isAdmin && <Link role="menuitem" to="/notifications">Notifications</Link>}
                  <button role="menuitem" type="button" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
