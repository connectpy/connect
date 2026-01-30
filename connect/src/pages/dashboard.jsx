import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AreaChart from '../components/area-chart';

const Dashboard = () => {

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
            </header>
            <main className="dashboard-main">
                <section className="chart-section">
                    <AreaChart title="Ventas Diarias" color="#4e6cc5" />
                </section>
            </main>
        </div>
    );
}

export default Dashboard;