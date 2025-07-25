import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from '../src/components/login';
import Signup from '../src/components/Signup';
import RecycleFluxWelcome from '../src/components/Welcome';
import Onboarding from '../src/components/Onboarding';
import RecycleRush from '../src/components/recycleRush'
import TrashSortGame from '../src/components/TrashSort'
import UpcycleBuilder from '../src/components/UpcycleBuilder';
import RFXCampaignPage from '../src/components/dashboard/RFXCampaignPage';
import RFXGamesPage from '../src/components/dashboard/RFXGamesPage';
import RFXWalletPage from '../src/components/dashboard/RFXWalletPage';
import RFXSettingsPage from '../src/components/dashboard/RFXSettingsPage';
import RFXVerseInterface from '../src/components/dashboard/NFT';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/onboarding/1" element={<Onboarding />} />
                <Route path="/welcome" element={<RecycleFluxWelcome />} />
                <Route path="/" element={<RFXVerseInterface />} />
                <Route path="/login" element={<Login />} />
                <Route path="/games" element={<RFXGamesPage />} />
                <Route path="/campaign" element={<RFXCampaignPage />} />
                <Route path="/settings" element={<RFXSettingsPage />} />
                <Route path="/wallet" element={<RFXWalletPage />} />
                <Route path="/games/recycle-rush" element={<RecycleRush />} />
                <Route path="/games/re" element={<TrashSortGame />} />
                <Route path="/games/recycle-builders" element={<UpcycleBuilder />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </Router>
    );
}

export default App;