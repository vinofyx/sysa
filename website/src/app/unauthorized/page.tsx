import { ShieldAlert } from 'lucide-react';

import { StatusPage } from '@/components/shared/status-page';

export default function UnauthorizedPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      title="Access denied"
      description="Your account doesn't have permission to view this page. Contact a Super Admin if you believe this is a mistake."
      actionLabel="Back to dashboard"
      actionHref="/admin"
    />
  );
}
