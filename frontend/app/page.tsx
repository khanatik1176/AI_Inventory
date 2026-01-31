

import AuthGuard from '@/app/components/auth/AuthGuard';
import Dashboard from '@/app/components/Dashboard';

export default function Page() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
