
import './App.css';

function App() {
  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          Student<span>Hub</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#services">Explore Services</a>
          <a href="#categories">Categories</a>
        </div>

        <div className="nav-buttons">
          <button className="login-btn">Login</button>
          <button className="signup-btn">Join Now</button>
        </div>
      </nav>

      {/* Hero Section */}
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
          <button className="primary-btn">
            Explore Services →
          </button>

          <button className="secondary-btn">
            Become a Seller
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="What service are you looking for?"
          />
          <button>Search</button>
        </div>
      </section>

      {/* Categories */}
      <section className="categories" id="categories">
        <p className="section-label">FIND YOUR MATCH</p>
        <h2>Explore Categories</h2>

        <div className="category-grid">
          <div className="category-card">💻<h3>Programming</h3></div>
          <div className="category-card">🎨<h3>Graphic Design</h3></div>
          <div className="category-card">✍️<h3>Content Writing</h3></div>
          <div className="category-card">📊<h3>Data Science</h3></div>
        </div>
      </section>
    </div>
  );
}

export default App;
