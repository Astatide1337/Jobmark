"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface SearchResult {
  id: string;
  type: "activity" | "project" | "report";
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
  let searchDate: Date | null = null;
  
  // Try to parse common date terms
  const lowerQuery = searchTerm.toLowerCase();
  if (lowerQuery === 'today') {
    searchDate = new Date();
  } else if (lowerQuery === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    searchDate = d;
  } else {
    // Try simple date parsing (e.g. "2024-01-01" or "Jan 1")
    const parsed = new Date(searchTerm);
    if (!isNaN(parsed.getTime()) && searchTerm.length > 3) {
      searchDate = parsed;
    }
  }

  // Construct Activity where clause
  const activityWhere: any = {
    userId: session.user.id,
    OR: [
      { content: { contains: searchTerm, mode: "insensitive" } },
    ],
  };

  if (searchDate) {
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    activityWhere.OR.push({
      logDate: {
        gte: startOfDay,
        lte: endOfDay,
      }
    });
  }

  // Search activities, projects, and reports in parallel
  const [activities, projects, reports] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        project: { select: { name: true, color: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        userId: session.user.id,
        archived: false,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.report.findMany({
      where: {
        userId: session.user.id,
        title: { contains: searchTerm, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const results: SearchResult[] = [];

  // Add activity results
  activities.forEach((activity) => {
    const dateStr = activity.logDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const projectStr = activity.project?.name || "No Project";
    
    results.push({
      id: activity.id,
      type: "activity",
      title: activity.content.substring(0, 80) + (activity.content.length > 80 ? "..." : ""),
      subtitle: `${projectStr} • ${dateStr}`,
      url: "#", // URL handled by modal
      color: activity.project?.color,
      fullContent: activity.content,
      createdAt: activity.createdAt.toISOString(),
    });
  });

  // Add project results
  projects.forEach((project) => {
    results.push({
      id: project.id,
      type: "project",
      title: project.name,
      subtitle: project.description || `${project.archived ? "Archived" : "Active"} project`,
      url: `/projects/${project.id}`,
      color: project.color,
    });
  });

  // Add report results
  reports.forEach((report) => {
    results.push({
      id: report.id,
      type: "report",
      title: report.title,
      subtitle: new Date(report.createdAt).toLocaleDateString(),
      url: "/reports?tab=history",
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

  return prisma.project.findMany({
    where: { userId: session.user.id, archived: false },
    orderBy: { updatedAt: "desc" },
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

  return prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true },
  });
}
