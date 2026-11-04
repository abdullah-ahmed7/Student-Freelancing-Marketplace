
import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from 'react-router-dom';

import Marketplace from './pages/marketplace';
import './App.css';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        Student<span>Hub</span>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/marketplace">Explore Services</Link>
        <Link to="/#categories">Categories</Link>
      </div>

      <div className="nav-buttons">
        <Link to="/login" className="login-btn">
          Login
        </Link>

        <Link to="/register" className="signup-btn">
          Join Now
        </Link>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <>
      <section className="hero" id="home">
        <p className="tagline">
          THE MARKETPLACE BUILT FOR STUDENTS
        </p>

        <h1>
          Your Skills.
          <br />
          Your <span>Opportunity.</span>
        </h1>

        <p className="hero-text">
          Discover talented students, offer your skills,
          and turn your ideas into reality.
        </p>

        <div className="hero-buttons">
          <Link to="/marketplace" className="primary-btn">
            Explore Services →
          </Link>

          <Link to="/register" className="secondary-btn">
            Become a Seller
          </Link>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="What service are you looking for?"
          />
          <Link to="/marketplace" className="primary-btn">
            Search
          </Link>
        </div>
      </section>

      <section className="categories" id="categories">
        <p className="section-label">FIND YOUR MATCH</p>
        <h2>Explore Categories</h2>

        <div className="category-grid">
          <div className="category-card">
            💻
            <h3>Programming</h3>
          </div>

          <div className="category-card">
            🎨
            <h3>Graphic Design</h3>
          </div>

          <div className="category-card">
            ✍️
            <h3>Content Writing</h3>
          </div>

          <div className="category-card">
            📊
            <h3>Data Science</h3>
          </div>
        </div>
      </section>
    </>
  );
}

function Login() {
  function handleSubmit(e) {
    e.preventDefault();
    alert('Login will be connected to our backend later.');
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="tagline">WELCOME BACK</p>

        <h1>Login to StudentHub</h1>

        <p className="auth-description">
          Continue your student freelancing journey.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>

          <input
            type="email"
            placeholder="you@example.com"
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="auth-submit">
            Login
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </section>
  );
}

function Register() {
  function handleSubmit(e) {
    e.preventDefault();
    alert('Registration will be connected to our backend later.');
  }

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="tagline">JOIN OUR COMMUNITY</p>

        <h1>Create Account</h1>

        <p className="auth-description">
          Start offering services or discover student talent.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            required
          />

          <label>Student Email</label>

          <input
            type="email"
            placeholder="you@university.edu"
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            minLength={8}
            required
          />

          <label>Account Type</label>

          <select defaultValue="buyer" required>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Buyer & Seller</option>
          </select>

          <button type="submit" className="auth-submit">
            Create Account
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{' '}
          <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/marketplace"
            element={<Marketplace />}
          />

          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
