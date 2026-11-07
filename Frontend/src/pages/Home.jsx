import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoryService, serviceService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useApp';
import { ServiceCard } from '../components/Cards';
import { ErrorState, LoadingState } from '../components/ui';

export default function Home() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const cats = useAsync(() => categoryService.list(), 'cats');
  const featured = useAsync(() => serviceService.search({ sort: 'rating', pageSize: 3 }), 'featured');

  function submit(e) {
    e.preventDefault();
    navigate(q.trim() ? `/marketplace?q=${encodeURIComponent(q.trim())}` : '/marketplace');
  }

  return (
    <>
      <section className="hero" id="home">
        <p className="tagline">THE MARKETPLACE BUILT FOR STUDENTS</p>
        <h1>Your Skills.<br />Your <span>Opportunity.</span></h1>
        <p className="hero-text">Discover talented students, offer your skills, and turn your ideas into reality.</p>
        <div className="hero-buttons">
          <Link to="/marketplace" className="primary-btn">Explore Services →</Link>
          <Link to="/register" className="secondary-btn">Become a Seller</Link>
        </div>
        <form className="search-box" onSubmit={submit} role="search">
          <label htmlFor="home-search" className="sr-only">Search services</label>
          <input id="home-search" type="search" placeholder="What service are you looking for?"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="primary-btn">Search</button>
        </form>
      </section>

      <section className="categories" id="categories">
        <p className="section-label">FIND YOUR MATCH</p>
        <h2>Explore Categories</h2>
        {cats.loading && !cats.data && <LoadingState />}
        {cats.error && <ErrorState error={cats.error} onRetry={cats.reload} />}
        {cats.data && (
          <div className="category-grid">
            {cats.data.map((c) => (
              <Link key={c.id} to={`/marketplace?category=${c.id}`} className="category-card">
                <span aria-hidden="true">{c.icon}</span>
                <h3>{c.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="how">
        <p className="section-label">HOW IT WORKS</p>
        <h2>From request to review</h2>
        <ol className="how-grid">
          <li><strong>1. Find a student</strong><p>Search services or browse skills across your university.</p></li>
          <li><strong>2. Place an order</strong><p>Share your requirements. The seller accepts and starts work.</p></li>
          <li><strong>3. Chat &amp; receive</strong><p>Talk inside the order, get the delivery, ask for a revision if needed.</p></li>
          <li><strong>4. Review</strong><p>Complete the order and leave an honest review.</p></li>
        </ol>
      </section>

      <section className="featured">
        <p className="section-label">TOP RATED</p>
        <h2>Featured services</h2>
        {featured.loading && !featured.data && <LoadingState />}
        {featured.error && <ErrorState error={featured.error} onRetry={featured.reload} />}
        {featured.data && featured.data.items.length > 0 && <div className="services-grid">{featured.data.items.map((s) => <ServiceCard key={s.id} service={s} />)}</div>}
        {featured.data && featured.data.items.length === 0 && (
          <div className="empty-state">
            <h3>No services listed yet</h3>
            <p>Be the first to offer a skill on StudentHub.</p>
            <Link to="/create-service" className="primary-btn btn-link">Create a service</Link>
          </div>
        )}
      </section>
    </>
  );
}
