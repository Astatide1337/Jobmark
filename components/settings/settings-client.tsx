"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalsSection } from "@/components/settings/goals-section";
import { ReportsSection } from "@/components/settings/reports-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DataSection } from "@/components/settings/data-section";
import type { UserSettingsData } from "@/app/actions/settings";
import type { GoalData } from "@/app/actions/goals";

interface SettingsClientProps {
  settings: UserSettingsData;
  goals: GoalData[];
}

export function SettingsClient({ settings, goals }: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsSection settings={settings} goals={goals} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsSection settings={settings} />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSection settings={settings} />
        </TabsContent>

        <TabsContent value="data">
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
