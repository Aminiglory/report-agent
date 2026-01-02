import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

const Landing = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div className="landing-loading">Loading...</div>;
  }
  return (
    <div className="landing">
      <div className="landing-container">
        <header className="landing-header">
          <div className="landing-nav">
            <h1 className="landing-logo">📊 Report Agent</h1>
            <div className="landing-nav-links">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link primary">Get Started</Link>
            </div>
          </div>
        </header>

        <main className="landing-main">
          <section className="hero">
            <h1 className="hero-title">Report Agent</h1>
            <p className="hero-subtitle">Transform Your Sector Reports into Individual School Reports</p>
            <p className="hero-description">
              Upload a single sector report and automatically generate individual Excel files for each school. 
              Manage formats, track history, and maintain authority signatures with ease.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-primary">Get Started Free</Link>
              <Link to="/login" className="btn-secondary">Sign In</Link>
            </div>
          </section>

          <section className="features">
            <h2 className="features-title">Powerful Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📤</div>
                <h3>Upload & Process</h3>
                <p>Upload your sector Excel reports and let the system automatically identify and separate schools</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Custom Formats</h3>
                <p>Create and manage different report formats for various report types</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📥</div>
                <h3>Download Options</h3>
                <p>Download combined reports, original files, or individual school reports</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✍️</div>
                <h3>Auto Signatures</h3>
                <p>Automatically add inspector, secretary, and head teacher signatures to reports</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📅</div>
                <h3>History Tracking</h3>
                <p>View and filter all your reports by month and year</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3>Authority Management</h3>
                <p>Manage inspector, secretary, and head teacher names with automatic updates</p>
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <h2 className="section-title">How It Works</h2>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Create Account</h3>
                <p>Sign up for free and get started in seconds</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3>Set Up Formats</h3>
                <p>Define your report formats and authority names</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3>Upload Reports</h3>
                <p>Upload your sector reports and let the system process them</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <h3>Download Files</h3>
                <p>Download individual school reports or combined files</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <p>&copy; 2024 Report Agent. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;

