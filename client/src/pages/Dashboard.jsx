import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentReports();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const response = await axios.get('/api/history?limit=5');
      setRecentReports(response.data.reports?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Welcome back, {user?.username}! 👋</h1>
            <p>Manage your sector reports and generate school-specific Excel files</p>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          <div className="action-cards">
            <Link to="/upload" className="action-card primary">
              <div className="action-icon">📤</div>
              <h3>Upload New Report</h3>
              <p>Upload a sector report and generate individual Excel files for each school</p>
            </Link>
            <Link to="/history" className="action-card">
              <div className="action-icon">📊</div>
              <h3>View History</h3>
              <p>Browse and download your previous reports organized by month and year</p>
            </Link>
            <Link to="/formats" className="action-card">
              <div className="action-icon">📋</div>
              <h3>Manage Formats</h3>
              <p>Create and manage report formats for different report types</p>
            </Link>
            <Link to="/authorities" className="action-card">
              <div className="action-icon">👥</div>
              <h3>Manage Authorities</h3>
              <p>Set inspector, secretary, and head teacher names for signatures</p>
            </Link>
            <Link to="/school-lists" className="action-card">
              <div className="action-icon">🏫</div>
              <h3>Manage School Lists</h3>
              <p>Create ordered lists of schools and assign head teachers</p>
            </Link>
          </div>
        </section>

        {/* Recent Reports */}
        {!loading && recentReports.length > 0 && (
          <section className="recent-reports">
            <div className="section-header">
              <h2 className="section-title">Recent Reports</h2>
              <Link to="/history" className="view-all-link">View All →</Link>
            </div>
            <div className="reports-grid">
              {recentReports.map((report) => (
                <Link key={report.id} to="/history" className="report-card-small">
                  <div className="report-icon">📄</div>
                  <div className="report-info">
                    <h4>{report.sector_name || 'Unnamed Sector'}</h4>
                    <p className="report-meta">{report.month} {report.year}</p>
                    <p className="report-schools">{report.total_schools} schools</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Features Overview */}
        <section className="features-overview">
          <h2 className="section-title">What You Can Do</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">📤</div>
              <h3>Upload Reports</h3>
              <p>Upload Excel sector reports in .xlsx or .xls format. The system automatically identifies schools and processes the data.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <h3>Custom Formats</h3>
              <p>Create different report formats for various report types. Define school column mappings and signature configurations.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📥</div>
              <h3>Download Options</h3>
              <p>Download combined Excel files (all schools), original reports, or individual school files separately.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✍️</div>
              <h3>Auto Signatures</h3>
              <p>Automatically add Sector Inspector, Executive Secretary, and Head Teacher signatures to all reports.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <h3>History & Filtering</h3>
              <p>View all your reports with filtering by month and year. Access and download any previous report.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔄</div>
              <h3>Authority Updates</h3>
              <p>Update head teacher names when they change. New reports automatically use the latest names.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🏫</div>
              <h3>Ordered School Lists</h3>
              <p>Create and manage ordered lists of schools. Assign head teachers to each school. Reuse the same order every month.</p>
            </div>
          </div>
        </section>

        {/* Getting Started Guide */}
        <section className="getting-started">
          <h2 className="section-title">Getting Started</h2>
          <div className="steps-guide">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload Your Format Template</h3>
                <p>Go to <Link to="/formats">Formats</Link> and upload your Excel format template file. Name it and it will be reused every month.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Create School List</h3>
                <p>Go to <Link to="/school-lists">School Lists</Link> and create an ordered list of schools. Arrange them in the order you want and assign head teachers to each school.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Set Authority Names</h3>
                <p>Go to <Link to="/authorities">Authorities</Link> and enter the names of Sector Inspector and Executive Secretary.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Upload Monthly Report</h3>
                <p>Go to <Link to="/upload">Upload Report</Link>, select your format and school list, then upload your monthly Excel file. Reports will be generated in your specified order.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>Download & View History</h3>
                <p>Download individual school files or combined reports. View all your reports in <Link to="/history">History</Link>.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
