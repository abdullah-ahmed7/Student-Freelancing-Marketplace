import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useApp';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <section className="auth-section">
      <div className="auth-card center-text">
        <p className="tagline">404</p>
        <h1>Page not found</h1>
        <p className="auth-description">The page you are looking for does not exist or was moved.</p>
        <Link to="/" className="primary-btn link-btn">Back to Home</Link>
      </div>
    </section>
  );
}
