'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createProject, updateProject } from '@/app/actions/projects';
import { projectColors } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  };
  onSubmit?: (
    data: FormData
  ) => Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }>;
}

export function ProjectDialog({ open, onOpenChange, project, onSubmit }: ProjectDialogProps) {
  const isEditing = !!project;
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(() => project?.name ?? '');
  const [description, setDescription] = useState(() => project?.description ?? '');
  const [color, setColor] = useState(() => project?.color ?? projectColors[0]);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('color', color);
      formData.append('description', description);

      let result: { success: boolean; message: string; errors?: Record<string, string[]> };
      if (onSubmit) {
        result = await onSubmit(formData);
      } else if (isEditing && project) {
        result = await updateProject(project.id, { name, color, description });
      } else {
        result = (await createProject({ success: false, message: '' }, formData)) as {
          success: boolean;
          message: string;
          errors?: Record<string, string[]>;
        };
      }

      if (result.success) {
        onOpenChange(false);
      } else if (result.errors?.name) {
        setErrors({ name: result.errors.name[0] });
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your project details.' : 'Create a project for related work.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              maxLength={50}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a short description..."
              className="h-20 resize-none"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use ${c} project color`}
                  aria-pressed={color === c}
                  className={`h-6 w-6 rounded-full transition-[border-color,box-shadow] ${
                    color === c
                      ? 'ring-ring ring-offset-background ring-2 ring-offset-2'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
