import { ChangePasswordCard } from '@/components/admin/profile/change-password-card';
import { ProfileInfoCard } from '@/components/admin/profile/profile-info-card';
import { SessionsCard } from '@/components/admin/profile/sessions-card';

export default function ProfilePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account details, password, and active sessions.
        </p>
      </div>

      <ProfileInfoCard />
      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}
