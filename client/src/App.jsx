import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../src/components/login';
import Signup from '../src/components/Signup';
import RecycleFluxWelcome from '../src/components/Welcome';
import Onboarding from '../src/components/Onboarding';
import RecycleRush from '../src/components/recycleRush';
import TrashSortGame from '../src/components/TrashSort';
import UpcycleBuilder from '../src/components/UpcycleBuilder';
import RFXCampaignPage from '../src/components/dashboard/RFXCampaignPage';
import RFXGamesPage from '../src/components/dashboard/RFXGamesPage';
import RFXWalletPage from '../src/components/dashboard/RFXWalletPage';
import RFXSettingsPage from '../src/components/dashboard/RFXSettingsPage';
import RFXVerseInterface from '../src/components/dashboard/NFT';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminVerify from './components/admin/AdminVerify';
import AdminCampaignDashboard from './components/admin/adminCampaignDashboard';
import TrivaInterface from './components/TriviaInterface';

// Admin Route Protection Component
const ProtectedAdminRoute = ({ children }) => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';

    return isAdmin && isAuthenticated ? children : <Navigate to="/admin/login" replace />;
};

// Main App Component
function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/onboarding/1" element={<Onboarding />} />
                <Route path="/welcome" element={<RecycleFluxWelcome />} />
                <Route path="/" element={<RFXVerseInterface />} />
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

                {/* Admin Routes */}
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedAdminRoute>
                            <AdminDashboard />
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

                {/* Fallback Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;