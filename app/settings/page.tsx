/**
 * User Settings Hub
 *
 * Why: The central point for user configuration. It fetches all
 * necessary data (User Preferences, Goals, Focus Config) in parallel
 * before handing off to the `SettingsClient` for interactive management.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { getUserSettings } from '@/app/actions/settings';
import { SettingsClient } from './settings-client';
import { getGoals } from '@/app/actions/goals';
import { getFocusConfig } from '@/app/actions/focus-config';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const [settings, goals, focusConfig] = await Promise.all([
    getUserSettings(),
    getGoals(),
    getFocusConfig(),
  ]);

  if (!settings) {
    redirect('/');
  }

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Settings"
        />
      }
    >
      <div className="mx-auto w-full max-w-(--container-content)">
        <SettingsClient settings={settings} goals={goals} focusConfig={focusConfig} />
      </div>
    </DashboardShell>
  );
}
