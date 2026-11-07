import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { USE_MOCK } from '../services';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // wait a tick so the target section has rendered
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);
  return null;
}

export default function AppLayout() {
  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollManager />
      {USE_MOCK && <div className="demo-banner">Demo mode — sample data stored in this browser. No real payments.</div>}
      <Navbar />
      <div id="main" className="app-main"><Outlet /></div>
      <Footer />
    </div>
  );
}
