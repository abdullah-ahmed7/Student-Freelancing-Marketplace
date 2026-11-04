
import { Link, useParams } from 'react-router-dom';
import services from '../data/services';

function ServiceDetails() {
  const { id } = useParams();

  const service = services.find(
    (item) => String(item.id) === id
  );

  if (!service) {
    return (
      <section className="service-details">
        <h1>Service Not Found</h1>
        <p>This service does not exist.</p>
        <Link to="/marketplace" className="primary-btn">
          Back to Marketplace
        </Link>
      </section>
    );
  }

  return (
    <section className="service-details">
      <Link to="/marketplace" className="back-link">
        ← Back to Marketplace
      </Link>

      <div className="service-details-card">
        <p className="section-label">
          {service.category}
        </p>

        <h1>{service.title}</h1>

        <p className="service-description">
          {service.description}
        </p>

        <div className="seller-info">
          <div className="seller-avatar">
            {service.seller.charAt(0)}
          </div>

          <div>
            <strong>{service.seller}</strong>
            <p>Student Service Provider</p>
          </div>
        </div>

        <div className="service-details-meta">
          <div>
            <p>Starting Price</p>
            <h2>PKR {service.price}</h2>
          </div>

          <div>
            <p>Delivery Time</p>
            <h2>{service.deliveryDays} Days</h2>
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={() =>
            alert('Order functionality is coming in the next phase.')
          }
        >
          Order Now
        </button>
      </div>
    </section>
  );
}

export default ServiceDetails;
