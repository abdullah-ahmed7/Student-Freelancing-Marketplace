import { Link } from 'react-router-dom';
import { USE_MOCK } from '../services';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Link to="/" className="logo">Student<span>Hub</span></Link>
          <p className="muted-text">A university marketplace for tutoring, mentoring and student skills.</p>
        </div>
        <div className="footer-links">
          <Link to="/marketplace">Explore Services</Link>
          <Link to="/students">Discover Students</Link>
          <Link to="/register">Join StudentHub</Link>
        </div>
      </div>
      <p className="footer-note">
        Academic services on StudentHub are limited to tutoring, mentoring, debugging and study guidance.
        Completing graded work for someone else is not allowed. Payments are not processed on this platform.
        {USE_MOCK && <> <strong>Local mode:</strong> data is stored only in this browser.</>}
      </p>
    </footer>
  );
}
