'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { UserSettingsData } from '@/app/actions/settings';
import type { GoalData } from '@/app/actions/goals';
import type { FocusBlock } from '@/lib/focus/types';
import { FocusSection } from '@/components/settings/focus-section';
import { GoalsSection } from '@/components/settings/goals-section';
import {
  AppearanceSection,
  DataSection,
  ReportsSection,
} from '@/components/settings/settings-sections';

interface SettingsClientProps {
  settings: UserSettingsData;
  goals: GoalData[];
  focusConfig: FocusBlock[];
}

export function SettingsClient({ settings, goals, focusConfig }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <div className="mx-auto max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex h-auto w-full max-w-full flex-nowrap justify-start overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible">
          <TabsTrigger className="min-w-24 flex-1" value="goals">
            Goals
          </TabsTrigger>
          <TabsTrigger className="min-w-24 flex-1" value="focus">
            Focus
          </TabsTrigger>
          <TabsTrigger className="min-w-24 flex-1" value="reports">
            Reviews
          </TabsTrigger>
          <TabsTrigger className="min-w-24 flex-1" value="appearance">
            Appearance
          </TabsTrigger>
          <TabsTrigger className="min-w-24 flex-1" value="data">
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <SettingsIntro title="Goals" description="Set your note goals." />
          <GoalsSection settings={settings} goals={goals} />
        </TabsContent>
        <TabsContent value="focus">
          <SettingsIntro title="Focus" description="Set up your focus session." />
          <FocusSection
            key={JSON.stringify(focusConfig)}
            initialBlocks={focusConfig}
            goals={goals}
          />
        </TabsContent>
        <TabsContent value="reports">
          <SettingsIntro
            title="Review defaults"
            description="Choose what to include in review drafts."
          />
          <ReportsSection settings={settings} />
        </TabsContent>
        <TabsContent value="appearance">
          <SettingsIntro title="Appearance" description="Choose how Jobmark looks." />
          <AppearanceSection settings={settings} />
        </TabsContent>
        <TabsContent value="data">
          <SettingsIntro title="Data" description="Export your data or delete it." />
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsIntro({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-border/50 bg-card/45 mb-6">
      <CardContent className="p-5">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">{title}</p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
