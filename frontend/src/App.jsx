import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Markets from './pages/Markets';
import HistoryPage from './pages/History';
import ListenerPage from './pages/Listener';
import CopyTrading from './pages/CopyTrading';
import Layout from './components/Layout';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));

    const setAuthToken = (newToken) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
        }
        setToken(newToken);
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={!token ? <Login setToken={setAuthToken} /> : <Navigate to="/" />}
                />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={token ? <Layout setToken={setAuthToken}><Dashboard token={token} /></Layout> : <Navigate to="/login" />}
                />
                <Route
                    path="/markets"
                    element={token ? <Layout setToken={setAuthToken}><Markets token={token} /></Layout> : <Navigate to="/login" />}
                />
                <Route
                    path="/copy-trading"
                    element={token ? <Layout setToken={setAuthToken}><CopyTrading token={token} /></Layout> : <Navigate to="/login" />}
                />
                <Route
                    path="/listener"
                    element={token ? <Layout setToken={setAuthToken}><ListenerPage token={token} /></Layout> : <Navigate to="/login" />}
                />
                <Route
                    path="/history"
                    element={token ? <Layout setToken={setAuthToken}><HistoryPage token={token} /></Layout> : <Navigate to="/login" />}
                />
                <Route
                    path="/settings"
                    element={token ? <Layout setToken={setAuthToken}><Settings token={token} /></Layout> : <Navigate to="/login" />}
                />
            </Routes>
        </Router>
    );
}

export default App;
