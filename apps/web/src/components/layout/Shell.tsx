import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { ApprovalQueue } from '../ApprovalQueue';
import { ErrorBoundary } from '../ErrorBoundary';
import { Toaster } from 'sonner';

export function Shell() {
  return (
    <div className="min-h-screen bg-cyber-bg bg-grid">
      <Topbar />
      <Sidebar />
      <main className="pt-14 pl-14 min-h-screen">
        <div className="p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <ApprovalQueue />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-cyber-bg-secondary border border-cyber-border text-cyber-text',
        }}
      />
    </div>
  );
}
