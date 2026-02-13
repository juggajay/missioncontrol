import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { DashboardPage } from '@/pages/DashboardPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { TasksPage } from '@/pages/TasksPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { CronPage } from '@/pages/CronPage';
import { DevicesPage } from '@/pages/DevicesPage';
import { UsagePage } from '@/pages/UsagePage';
import { OrchestrationPage } from '@/pages/OrchestrationPage';
import { useWebSocket } from '@/hooks/use-ws';

function AppInner() {
  useWebSocket();

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="cron" element={<CronPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="orchestration" element={<OrchestrationPage />} />
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
