/**
 * Search domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { getLockedProjectIds } from '@/lib/project-lock';
import { JobmarkActor, assertActor } from './index';

export type SearchResult = {
  type: 'activity' | 'project' | 'report' | 'contact' | 'interaction';
  id: string;
  title: string;
  snippet: string;
  metadata: Record<string, unknown>;
};

export async function globalSearch(
  actor: JobmarkActor,
  query: string,
  options: { limit?: number } = {}
): Promise<SearchResult[]> {
  assertActor(actor);

  const { limit = 20 } = options;
  const lockedIds = await getLockedProjectIds(actor.userId);

  const lockedFilter = lockedIds.length > 0
    ? { OR: [{ projectId: null }, { projectId: { notIn: lockedIds } }] }
    : {};

  const results: SearchResult[] = [];

  // Search activities
  const activities = await prisma.activity.findMany({
    where: {
      userId: actor.userId,
      content: { contains: query, mode: 'insensitive' },
      ...lockedFilter,
    },
    take: Math.ceil(limit / 5),
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  results.push(
    ...activities.map((a) => ({
      type: 'activity' as const,
      id: a.id,
      title: a.content.slice(0, 80),
      snippet: a.content.slice(0, 160),
      metadata: { project: a.project, logDate: a.logDate.toISOString().split('T')[0] },
    }))
  );

  // Search projects
  const projects = await prisma.project.findMany({
    where: {
      userId: actor.userId,
      name: { contains: query, mode: 'insensitive' },
      ...(lockedIds.length > 0 && { id: { notIn: lockedIds } }),
    },
    take: Math.ceil(limit / 5),
  });

  results.push(
    ...projects.map((p) => ({
      type: 'project' as const,
      id: p.id,
      title: p.name,
      snippet: p.description ?? '',
      metadata: { color: p.color, archived: p.archived },
    }))
  );

  // Search reports
  const reports = await prisma.report.findMany({
    where: {
      userId: actor.userId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
      ...lockedFilter,
    },
    take: Math.ceil(limit / 5),
    include: { project: { select: { id: true, name: true, color: true } } },
  });

  results.push(
    ...reports.map((r) => ({
      type: 'report' as const,
      id: r.id,
      title: r.title,
      snippet: r.content.slice(0, 160),
      metadata: { project: r.project },
    }))
  );

  // Search contacts
  const contacts = await prisma.contact.findMany({
    where: {
      userId: actor.userId,
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: Math.ceil(limit / 5),
  });

  results.push(
    ...contacts.map((c) => ({
      type: 'contact' as const,
      id: c.id,
      title: c.fullName,
      snippet: c.email ?? c.notes ?? '',
      metadata: { email: c.email, relationship: c.relationship },
    }))
  );

  // Search interactions
  const interactions = await prisma.interactionLog.findMany({
    where: {
      userId: actor.userId,
      OR: [
        { summary: { contains: query, mode: 'insensitive' } },
        { nextStep: { contains: query, mode: 'insensitive' } },
        { rawNotes: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: Math.ceil(limit / 5),
    include: { contact: { select: { id: true, fullName: true } } },
  });

  results.push(
    ...interactions.map((i) => ({
      type: 'interaction' as const,
      id: i.id,
      title: i.contact.fullName,
      snippet: i.summary.slice(0, 160),
      metadata: { channel: i.channel, occurredAt: i.occurredAt.toISOString() },
    }))
  );

  return results.slice(0, limit);
}
