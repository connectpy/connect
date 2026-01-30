import React from 'react';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/landing.jsx'
import LoginPage from './pages/login.jsx'
import Dashboard from './pages/dashboard.jsx';
import './App.css';
import { testConnection } from '../influxService';

const ORG = "CONNECT";
    const BUCKET = "CONNECT";

    testConnection(ORG, BUCKET);
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App