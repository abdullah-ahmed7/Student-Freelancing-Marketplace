
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addService } from '../data/serviceStorage';

function CreateService() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: 'Programming',
    description: '',
    price: '',
    deliveryDays: ''
  });

  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const price = Number(formData.price);
    const deliveryDays = Number(formData.deliveryDays);

    if (
      !formData.title.trim() ||
      !formData.description.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(price)
    ) {
      setError('Enter a valid whole-number price.');
      return;
    }

    if (
      !Number.isInteger(deliveryDays) ||
      deliveryDays < 1 ||
      deliveryDays > 365
    ) {
      setError('Delivery must be between 1 and 365 days.');
      return;
    }

    const newService = {
      id: `new-${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      description: formData.description.trim(),
      price: price,
      deliveryDays: deliveryDays,
      seller: 'Demo Student'
    };

    try {
      addService(newService);
      navigate('/my-services');
    } catch {
      setError(
        'Could not save your service. Please try again.'
      );
    }
  }

  return (
    <main className="create-service-page">
      <div className="create-service-card">

        <Link to="/marketplace" className="back-link">
          ← Back to Marketplace
        </Link>

        <p className="tagline">SELL YOUR SKILLS</p>

        <h1>Create a Service</h1>

        <p className="create-service-description">
          Showcase your skills and help other students.
        </p>

        <form onSubmit={handleSubmit}>

          <label htmlFor="title">Service Title</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="e.g. React Website Development"
            value={formData.title}
            onChange={handleChange}
            maxLength={100}
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="Programming">Programming</option>
            <option value="Graphic Design">Graphic Design</option>
            <option value="Content Writing">Content Writing</option>
            <option value="Data Science">Data Science</option>
          </select>

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Explain what your service includes..."
            value={formData.description}
            onChange={handleChange}
            rows={5}
            maxLength={2000}
            required
          />

          <label htmlFor="price">Price (PKR)</label>
          <input
            id="price"
            name="price"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 5000"
            value={formData.price}
            onChange={handleChange}
            required
          />

          <label htmlFor="deliveryDays">
            Delivery Time (Days)
          </label>
          <input
            id="deliveryDays"
            name="deliveryDays"
            type="number"
            min="1"
            max="365"
            step="1"
            placeholder="e.g. 5"
            value={formData.deliveryDays}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
          >
            Publish Service
          </button>

        </form>

      </div>
    </main>
  );
}

export default CreateService;
