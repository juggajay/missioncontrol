import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { useWebSocket } from '@/hooks/use-ws';

function AppInner() {
  useWebSocket();

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="tasks" element={<PlaceholderPage title="TASK BOARD" phase="Phase 2" />} />
        <Route path="sessions" element={<PlaceholderPage title="SESSIONS" phase="Phase 3" />} />
        <Route path="config" element={<PlaceholderPage title="CONFIGURATION" phase="Phase 3" />} />
        <Route path="cron" element={<PlaceholderPage title="CRON JOBS" phase="Phase 3" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
