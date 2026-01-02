import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import UploadReport from './pages/UploadReport';
import ManageFormats from './pages/ManageFormats';
import ManageAuthorities from './pages/ManageAuthorities';
import ManageSchoolLists from './pages/ManageSchoolLists';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <PrivateRoute>
                  <UploadReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/history"
              element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              }
            />
            <Route
              path="/formats"
              element={
                <PrivateRoute>
                  <ManageFormats />
                </PrivateRoute>
              }
            />
            <Route
              path="/authorities"
              element={
                <PrivateRoute>
                  <ManageAuthorities />
                </PrivateRoute>
              }
            />
            <Route
              path="/school-lists"
              element={
                <PrivateRoute>
                  <ManageSchoolLists />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

