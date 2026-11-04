
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllServices } from '../data/serviceStorage';

function Marketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = [
    'All',
    'Programming',
    'Graphic Design',
    'Content Writing',
    'Data Science'
  ];

  // Get all services, including newly created services
  const services = getAllServices();

  const filteredServices = services.filter((service) => {
    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      service.title.toLowerCase().includes(searchText) ||
      service.description.toLowerCase().includes(searchText) ||
      service.seller.toLowerCase().includes(searchText);

    const matchesCategory =
      category === 'All' ||
      service.category === category;

    return matchesSearch && matchesCategory;
  });

  function clearFilters() {
    setSearch('');
    setCategory('All');
  }

  return (
    <main className="marketplace">

      {/* Marketplace Header */}
      <section className="market-header">
        <p className="tagline">
          STUDENT SKILLS, REAL OPPORTUNITIES
        </p>

        <h1>Explore Services</h1>

        <p>
          Find talented students and the right service for your needs.
        </p>
      </section>

      {/* Search and Category Filters */}
      <section className="market-controls">
        <input
          type="search"
          placeholder="Search services, skills or sellers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="filter-row">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={
                category === item
                  ? 'filter-btn active'
                  : 'filter-btn'
              }
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Service Results */}
      <section className="services-section">

        <div className="results-heading">
          <h2>Available Services</h2>

          <span>
            {filteredServices.length} services found
          </span>
        </div>

        {filteredServices.length > 0 ? (
          <div className="services-grid">

            {filteredServices.map((service) => (
              <article
                className="service-card"
                key={service.id}
              >

                <div className="service-top">
                  <span className="service-category">
                    {service.category}
                  </span>

                  <span className="service-id">
                    #{service.id}
                  </span>
                </div>

                <h3>{service.title}</h3>

                <p className="service-description">
                  {service.description}
                </p>

                {/* Seller Information */}
                <div className="seller-info">
                  <div className="seller-avatar">
                    {service.seller.charAt(0)}
                  </div>

                  <div>
                    <span className="seller-label">
                      Offered by
                    </span>

                    <p>{service.seller}</p>
                  </div>
                </div>

                {/* Price and Delivery */}
                <div className="service-footer">
                  <div>
                    <span className="price-label">
                      Starting at
                    </span>

                    <h3>
                      PKR {Number(service.price).toLocaleString()}
                    </h3>
                  </div>

                  <span className="delivery-time">
                    {service.deliveryDays} days
                  </span>
                </div>

                {/* Service Details Navigation */}
                <Link
                  to={`/services/${service.id}`}
                  className="service-view-btn"
                >
                  View Service →
                </Link>

              </article>
            ))}

          </div>
        ) : (

          /* Empty Results */
          <div className="empty-results">
            <h3>No services found</h3>

            <p>
              Try another search or category.
            </p>

            <button
              type="button"
              className="primary-btn"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>

        )}

      </section>

    </main>
  );
}

export default Marketplace;
