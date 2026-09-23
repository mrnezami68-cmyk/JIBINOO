import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Assets } from './pages/Assets';
import { Reports } from './pages/Reports';
import { Goals } from './pages/Goals';
import { Loans } from './pages/Loans';
import { Profile } from './pages/Profile';
import { Guide } from './pages/Guide';
import { Welcome } from './pages/Welcome';
import { Lock } from './pages/Lock';

function AppRoutes() {
  const { settings } = useStore();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('jibino.unlocked') === '1';
    } catch {
      return false;
    }
  });

  if (!settings.onboarded) {
    return <Welcome />;
  }

  if (settings.pinEnabled && settings.pin && !unlocked) {
    return (
      <Lock
        onUnlock={() => {
          try {
            sessionStorage.setItem('jibino.unlocked', '1');
          } catch {
            /* private mode */
          }
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppRoutes />
      </StoreProvider>
    </BrowserRouter>
  );
}
