import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Login from './components/login';
import Signup from './components/Signup';
import RecycleFluxWelcome from './components/Welcome';
import Onboarding from './components/Onboarding';
import RecycleRush from './components/recycleRush';
import TrashSortGame from './components/TrashSort';
import UpcycleBuilder from './components/UpcycleBuilder';
import RFXCampaignPage from './components/dashboard/RFXCampaignPage';
import RFXGamesPage from './components/dashboard/RFXGamesPage';
import RFXWalletPage from './components/dashboard/RFXWalletPage';
import RFXSettingsPage from './components/dashboard/RFXSettingsPage';
import RFXVerseInterface from './components/dashboard/NFT';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminVerify from './components/admin/AdminVerify';
import AdminCampaignDashboard from './components/admin/adminCampaignDashboard';
import TrivaInterface from './components/TriviaInterface';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import PasscodeVerify from './components/admin/PasscodeVerify';
import ReferralsPage from './components/dashboard/ReferralsPage';

// Admin Route Protection Component
const ProtectedAdminRoute = ({ children, superAdminOnly = false }) => {
    const token = localStorage.getItem('authToken');
    const isAuthenticated = !!token;
    let isAdmin = false;
    let isSuperAdmin = false;

    if (isAuthenticated) {
        try {
            const decoded = jwtDecode(token);
            isAdmin = decoded.isAdmin || localStorage.getItem('isAdmin') === 'true';
            isSuperAdmin = decoded.isSuperAdmin || localStorage.getItem('isSuperAdmin') === 'true';
        } catch (err) {
            console.error('Token decode error in ProtectedAdminRoute:', err);
            localStorage.removeItem('authToken');
            return <Navigate to="/login" replace state={{ error: 'Invalid token' }} />;
        }
    }

    if (!isAuthenticated) {
        console.error('No authToken found, redirecting to login');
        return <Navigate to="/login" replace state={{ error: 'Please log in to access this page' }} />;
    }

    if (!isAdmin && !isSuperAdmin) {
        console.error('Not an admin, redirecting to home');
        return <Navigate to="/" replace state={{ error: 'Admin access required' }} />;
    }

    if (superAdminOnly && !isSuperAdmin) {
        console.error('Not a super admin, redirecting to admin dashboard');
        return <Navigate to="/admin/dashboard" replace state={{ error: 'Super admin access required' }} />;
    }

    return children;
};

// Main App Component
function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/onboarding/1" element={<Onboarding />} />
                <Route path="/" element={<RecycleFluxWelcome />} />
                <Route path="/dashboard" element={<RFXVerseInterface />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Game Routes */}
                <Route path="/games" element={<RFXGamesPage />} />
                <Route path="/games/recycle-rush" element={<RecycleRush />} />
                <Route path="/games/trash-sort" element={<TrashSortGame />} />
                <Route path="/games/Trivial" element={<TrivaInterface />} />
                <Route path="/games/recycle-builders" element={<UpcycleBuilder />} />

                {/* User Dashboard Routes */}
                <Route path="/campaign" element={<RFXCampaignPage />} />
                <Route path="/settings" element={<RFXSettingsPage />} />
                <Route path="/wallet" element={<RFXWalletPage />} />

                {/* Referrals */}
                <Route path="/referrals" element={<ReferralsPage />} />

                {/* Admin Routes */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard />
                        </ProtectedAdminRoute>
                    }
                />
                <Route
                    path="/admin/super"
                    element={
                        <ProtectedAdminRoute superAdminOnly={true}>
                            <SuperAdminDashboard />
                        </ProtectedAdminRoute>
                    }
                />
                <Route path="/admin/verify" element={<AdminVerify />} />
                <Route
                    path="/admin/campaigns"
                    element={
                        <ProtectedAdminRoute>
                            <AdminCampaignDashboard />
                        </ProtectedAdminRoute>
                    }
                />
                <Route
                    path="/admin/passcode-verify"
                    element={
                        <ProtectedAdminRoute>
                            <PasscodeVerify />
                        </ProtectedAdminRoute>
                    }
                />

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;