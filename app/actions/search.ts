/**
 * Global Search Actions
 *
 * Why: As users log hundreds of activities and contacts, they need a fast
 * way to find specific information. This unified search queries 5 different
 * tables in parallel.
 *
 * Smart Features:
 * - Date Parsing: Queries like "today" or "yesterday" are recognized and
 *   automatically converted into Prisma date filters.
 * - Multi-table Parallelism: Executes queries for Activities, Projects,
 *   Reports, Contacts, and Interactions simultaneously using `Promise.all`.
 */
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getLockedProjectIds,
  buildLockedActivityFilter,
  filterLockedReports,
} from '@/lib/project-lock';
import { Prisma } from '@prisma/client';
import { formatDate, getChannelLabel } from '@/lib/network';
import { getActivityDisplayContent } from '@/lib/jobmark/activity-copy';
import {
  calendarDateToUtcMidnight,
  DEFAULT_TIME_ZONE,
  getCalendarDate,
  isValidCalendarDate,
  isValidTimeZone,
  shiftCalendarDate,
} from '@/lib/date-semantics';

export interface SearchResult {
  id: string;
  type: 'activity' | 'project' | 'report' | 'contact' | 'interaction';
  title: string;
  subtitle?: string;
  url: string;
  color?: string;
  fullContent?: string;
  createdAt?: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  const searchTerm = query.trim();
  let searchDate: string | null = null;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { timeZone: true },
  });
  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;

  // Try to parse common date terms
  const lowerQuery = searchTerm.toLowerCase();
  if (lowerQuery === 'today') {
    searchDate = getCalendarDate(new Date(), timeZone);
  } else if (lowerQuery === 'yesterday') {
    searchDate = shiftCalendarDate(getCalendarDate(new Date(), timeZone), -1);
  } else {
    // Try simple date parsing (e.g. "2024-01-01" or "Jan 1")
    if (/^\d{4}-\d{2}-\d{2}$/.test(searchTerm) && isValidCalendarDate(searchTerm)) {
      searchDate = searchTerm;
    }
  }

  const lockedIds = await getLockedProjectIds(session.user.id);

  // Construct Activity where clause
  const activityWhere: Prisma.ActivityWhereInput = {
    userId: session.user.id,
    OR: [{ content: { contains: searchTerm, mode: 'insensitive' } }],
    ...(lockedIds.length > 0 && { AND: [buildLockedActivityFilter(lockedIds)] }),
  };

  if (searchDate) {
    const startOfDay = calendarDateToUtcMidnight(searchDate);
    const endOfDay = calendarDateToUtcMidnight(shiftCalendarDate(searchDate, 1));

    // Add date filter to OR clause
    if (activityWhere.OR && Array.isArray(activityWhere.OR)) {
      activityWhere.OR.push({
        logDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      });
    }
  }

  // Search activities, projects, and reports in parallel
  const [activities, projects, reports, contacts, interactions] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        project: { select: { name: true, color: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        userId: session.user.id,
        archived: false,
        locked: lockedIds.length > 0 ? false : undefined,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.report.findMany({
      where: {
        userId: session.user.id,
        title: { contains: searchTerm, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, fullName: true, email: true, relationship: true },
    }),
    prisma.interactionLog.findMany({
      where: {
        userId: session.user.id,
        summary: { contains: searchTerm, mode: 'insensitive' },
      },
      take: 5,
      include: {
        contact: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  const results: SearchResult[] = [];

  // Add activity results
  activities.forEach(activity => {
    const dateStr = formatDate(activity.logDate);
    const projectStr = activity.project?.name || 'No project';
    const displayContent = getActivityDisplayContent(activity.content);

    results.push({
      id: activity.id,
      type: 'activity',
      title: displayContent.substring(0, 80) + (displayContent.length > 80 ? '...' : ''),
      subtitle: `${projectStr} • ${dateStr}`,
      url: '#', // URL handled by modal
      color: activity.project?.color,
      fullContent: displayContent,
      createdAt: activity.createdAt.toISOString(),
    });
  });

  // Add project results
  projects.forEach(project => {
    results.push({
      id: project.id,
      type: 'project',
      title: project.name,
      subtitle: project.description || `${project.archived ? 'Archived' : 'Active'} project`,
      url: `/projects/${project.id}`,
      color: project.color,
    });
  });

  // Add report results (post-filter locked project reports)
  filterLockedReports(reports, lockedIds).forEach(report => {
    results.push({
      id: report.id,
      type: 'report',
      title: report.title,
      subtitle: formatDate(report.createdAt),
      url: '/reports?tab=history',
    });
  });

  // Add contact results
  contacts.forEach(contact => {
    results.push({
      id: contact.id,
      type: 'contact',
      title: contact.fullName,
      subtitle: contact.relationship || contact.email || undefined,
      url: `/network/${contact.id}`,
    });
  });

  // Add interaction results
  interactions.forEach(interaction => {
    const truncatedSummary =
      interaction.summary.length > 80
        ? interaction.summary.substring(0, 80) + '...'
        : interaction.summary;
    const dateStr = formatDate(interaction.occurredAt);
    const channelStr = getChannelLabel(interaction.channel);
    results.push({
      id: interaction.id,
      type: 'interaction',
      title: truncatedSummary,
      subtitle: `${interaction.contact.fullName} • ${channelStr} • ${dateStr}`,
      url: `/network/${interaction.contactId}`,
    });
  });

  return results;
}

// Get recent projects for default view
export async function getRecentProjects(limit = 3) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const lockedIds = await getLockedProjectIds(session.user.id);
  return prisma.project.findMany({
    where: {
      userId: session.user.id,
      archived: false,
      locked: lockedIds.length > 0 ? false : undefined,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, name: true, color: true },
  });
}

// Get recent reports for default view
export async function getRecentReports(limit = 3) {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  const lockedIds = await getLockedProjectIds(session.user.id);
  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, title: true, metadata: true },
  });
  return filterLockedReports(reports, lockedIds)
    .slice(0, limit)
    .map(report => ({ id: report.id, title: report.title }));
}
