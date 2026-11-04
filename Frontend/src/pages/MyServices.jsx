
import { Link } from 'react-router-dom';
import { getCreatedServices } from '../data/serviceStorage';

function MyServices() {
  const myServices = getCreatedServices();

  return (
    <main className="marketplace my-services-page">

      <section className="market-header">
        <p className="tagline">YOUR SELLER DASHBOARD</p>
        <h1>My Services</h1>
        <p>Manage and view your published services.</p>
      </section>

      <section className="services-section">

        <div className="my-services-actions">
          <h2>{myServices.length} services created</h2>

          <Link
            to="/create-service"
            className="primary-btn create-service-link"
          >
            + Create Service
          </Link>
        </div>

        {myServices.length > 0 ? (
          <div className="services-grid">

            {myServices.map((service) => (
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

                <Link
                  to={`/services/${service.id}`}
                  className="service-view-btn my-service-view"
                >
                  View Service →
                </Link>
              </article>
            ))}

          </div>
        ) : (
          <div className="empty-results">
            <h3>You haven't created any services yet.</h3>
            <p>
              Publish your first service to showcase your skills.
            </p>

            <Link
              to="/create-service"
              className="primary-btn create-service-link"
            >
              Create Your First Service
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}

export default MyServices;
