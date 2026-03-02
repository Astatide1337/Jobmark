/**
 * Interactive Projects Demo
 *
 * Why: Demonstrates how users can organize their work into specific
 * workstreams. It allows visitors to experience the "Project Details"
 * drill-down and creation flows without a database.
 *
 * Implementation: Reuses the production `ProjectList` component but
 * provides local state-based CRUD handlers to simulate a real backend.
 */
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { projectColors } from '@/lib/constants';
import { DashboardFrame } from './dashboard-frame';
import { ProjectList } from '@/components/projects/project-list';

// Mock Projects that look realistic
const projects = [
  {
    id: '1',
    name: 'Website Redesign',
    description: 'Updating the landing page for Q1 launch',
    color: '#6366f1', // Indigo
    archived: false,
    _count: { activities: 24 },
    activities: [{ createdAt: new Date() }],
  },
  {
    id: '2',
    name: 'Mobile App MVP',
    description: 'Core features for iOS beta',
    color: '#10b981', // Emerald
    archived: false,
    _count: { activities: 12 },
    activities: [{ createdAt: new Date() }],
  },
  {
    id: '3',
    name: 'Q1 Hiring Strategy',
    description: null,
    color: '#f59e0b', // Amber
    archived: false,
    _count: { activities: 8 },
    activities: [{ createdAt: new Date() }],
  },
];

export function DemoProjects() {
  const [items, setItems] = useState(projects);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  const [viewingId, setViewingId] = useState<string | null>(null);

  const handleCreate = async (data: FormData) => {
    const name = data.get('name') as string;
    const color = data.get('color') as string;
    const description = data.get('description') as string;

    const newProject = {
      id: Math.random().toString(36).substring(7),
      name,
      color,
      description: description || null,
      archived: false,
      _count: { activities: 0 },
      activities: [],
    };

    setItems([newProject, ...items]);
    toast.success('Project created (Demo)');
    return { success: true, message: 'Created' };
  };

  const handleUpdate = async (id: string, data: FormData) => {
    const name = data.get('name') as string;
    const color = data.get('color') as string;
    const description = data.get('description') as string;

    setItems(
      items.map(p => (p.id === id ? { ...p, name, color, description: description || null } : p))
    );
    toast.success('Project updated (Demo)');
    return { success: true, message: 'Updated' };
  };

  const handleArchive = async (id: string) => {
    setItems(items.map(p => (p.id === id ? { ...p, archived: true } : p)));
    toast.success('Project archived');
  };

  const handleUnarchive = async (id: string) => {
    setItems(items.map(p => (p.id === id ? { ...p, archived: false } : p)));
    toast.success('Project restored');
  };

  // We need to filter items based on the active tab
  const filteredItems = items.filter(item =>
    filter === 'active' ? !item.archived : item.archived
  );

  const selectedProject = items.find(p => p.id === viewingId);

  return (
    <DashboardFrame activePath={viewingId ? `/projects/${viewingId}` : '/projects'}>
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Organize your workstreams.</p>
        </div>

        {viewingId && selectedProject ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingId(null)}
                className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors"
              >
                ← Back to Projects
              </button>
            </div>

            <div className="border-border/50 bg-card rounded-xl border p-6">
              <div className="mb-6 flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: selectedProject.color }}
                >
                  <span className="text-xl font-bold">{selectedProject.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedProject.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {selectedProject.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
                  Recent Activity (Demo)
                </h4>
                <div className="border-border/50 relative space-y-8 border-l-2 pl-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="relative">
                      <div
                        className="border-background absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm font-medium">Updated project milestones</p>
                        <p className="text-muted-foreground mt-1 text-xs">{i * 2} days ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ProjectList
            projects={filteredItems}
            initialFilter={filter}
            onTabChange={val => setFilter(val as any)}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            disableNavigation={true}
            onViewTimeline={id => setViewingId(id)}
          />
        )}
      </div>
    </DashboardFrame>
  );
}
