# Jobmark — Product Specification Document

Version 1.0
Last Updated: December 2024

---

## 1. Executive Summary

### 1.1 Product Name
Jobmark

### 1.2 Tagline
"Capture your daily wins. Generate impressive reports instantly."

### 1.3 Product Vision
Jobmark is an AI-powered work activity logger designed for professionals who need to track their daily accomplishments and generate polished reports effortlessly. It transforms the tedious task of remembering and documenting work into a seamless, even enjoyable experience.

### 1.4 Core Value Proposition
Most professionals struggle to remember what they accomplished when report time arrives. Jobmark solves this by making daily logging effortless (under 30 seconds) and leveraging AI to transform raw notes into professional, manager-ready reports with one click.

### 1.5 Target User
Primary: Knowledge workers in their first 1-3 years of employment who need to prove their value through regular reporting. This includes software developers, analysts, consultants, designers, and project coordinators.

Secondary: Any professional who wants to maintain a personal record of accomplishments for performance reviews, resume building, or self-reflection.

### 1.6 Key Differentiator
Unlike TODO apps that focus on what you will do, Jobmark focuses on what you have done. It is not a task manager — it is a reverse TODO, an accomplishment journal with AI superpowers.

---

## 2. Problem Statement

### 2.1 The Pain Point
When the end of the month arrives and a report is due, professionals face a common struggle: "What did I actually accomplish?" They scramble through emails, chat logs, and memory to piece together their contributions. This results in incomplete reports that undersell their work, stress and time wasted reconstructing the past, missed accomplishments that could have demonstrated value, and a negative perception from managers due to weak reporting.

### 2.2 Why Existing Solutions Fail
Note-taking apps like Notion and Obsidian are too open-ended and require too much structure from the user. TODO apps like Todoist and Things focus on future tasks, not past accomplishments. Time trackers like Toggl focus on hours, not achievements. Spreadsheets require manual effort and provide no intelligence.

### 2.3 The Opportunity
A purpose-built tool that makes logging accomplishments as easy as sending a text message, then uses AI to transform those logs into professional reports, fills a gap in the productivity tool landscape.

---

## 3. Product Principles

### 3.1 Radical Simplicity
Every feature must justify its existence. If it adds friction without proportional value, it does not ship. The primary action (logging an activity) must be completable in under 30 seconds.

### 3.2 AI-First Design
AI is not a feature — it is the foundation. The product assumes AI will handle summarization, enhancement, and insight generation. User input should be minimal; AI output should be polished.

### 3.3 Psychological Engagement
The product should leverage behavioral psychology to encourage consistent use. This includes streak tracking, visual progress indicators, and celebratory micro-interactions. The goal is to make logging feel rewarding, not obligatory.

### 3.4 Premium Aesthetic
The UI/UX must feel premium, inspired by Apple's design language. This means generous whitespace, refined typography, subtle animations, and an overall sense of polish that makes the product a joy to use.

### 3.5 Mobile-First Optimization
While the product is a web application, it must be fully optimized for mobile use. Many users will log activities from their phone during commutes or breaks.

---

## 4. Feature Specifications

### 4.1 Authentication

#### 4.1.1 Google OAuth
Jobmark uses Google OAuth as the sole authentication method. This provides one-click sign-in with zero friction, eliminates password management, leverages trusted Google security, and retrieves user profile information (name, email, avatar) automatically.

#### 4.1.2 Session Management
Sessions persist for 30 days with secure token refresh. Users remain logged in across browser sessions unless they explicitly sign out.

#### 4.1.3 Account Deletion
Users can delete their account from settings. This action is irreversible and removes all associated data including activities, projects, and reports.

---

### 4.2 Quick Capture

This is the most critical feature. The entire product's success depends on making this interaction effortless and satisfying.

#### 4.2.1 Input Behavior
The quick capture component is prominently displayed at the top of the dashboard. It consists of an expandable textarea that grows as the user types. The minimum character count is 10 to prevent empty or meaningless entries. The maximum character count is 1000 to encourage conciseness while allowing detail.

#### 4.2.2 Project Association
An optional project dropdown appears below the textarea. The dropdown defaults to the most recently used project for convenience. Users can select "No Project" for unassociated entries. Project selection is remembered for the next entry.

#### 4.2.3 Date Override
By default, entries are logged for the current date. A hidden date picker can be revealed for logging past activities. This accommodates users who forgot to log something yesterday or earlier in the week.

#### 4.2.4 Keyboard Shortcuts
Command/Control + Enter saves the entry. Escape clears the input and resets focus. Tab moves between input and project selector.

#### 4.2.5 AI Enhancement
A button labeled "Enhance with AI" appears when the user has entered text. Clicking this sends the text to the AI for professional polishing. The AI improves grammar, expands abbreviations, adds professional language, and maintains the original meaning. The user sees the enhanced version and can Accept, Edit, or Revert to the original.

#### 4.2.6 Save Confirmation
Upon successful save, the input clears and a subtle success animation plays. A toast notification confirms "Activity logged" with an Undo option for 5 seconds.

---

### 4.3 Activity Log (Timeline View)

#### 4.3.1 Display Structure
Activities are displayed in a vertical timeline grouped by date. Dates are shown in descending order with today at the top. Each date section shows the day name, full date, and activity count.

#### 4.3.2 Activity Card
Each activity displays the full content text, associated project (if any) with color indicator, timestamp of when it was logged, and edit and delete action buttons on hover or tap.

#### 4.3.3 Pagination
The timeline uses infinite scroll loading. Initially, 20 activities load. As the user scrolls, additional batches of 20 load automatically. A loading indicator appears during fetch operations.

#### 4.3.4 Empty State
When no activities exist, a friendly empty state message appears with a prompt to log the first activity. The message is encouraging, not guilt-inducing.

#### 4.3.5 Edit Functionality
Clicking edit opens an inline editor with the same interface as quick capture. Users can modify the content, change the project, or adjust the date. Save and Cancel buttons appear during edit mode.

#### 4.3.6 Delete Functionality
Clicking delete shows a confirmation dialog. Upon confirmation, the activity is soft-deleted. A toast notification appears with an Undo option for 5 seconds. After 5 seconds, the deletion becomes permanent.

---

### 4.4 Project Management

#### 4.4.1 Project Purpose
Projects provide lightweight organization for activities. They are not a full project management system — just a way to group related work for filtering and reporting.

#### 4.4.2 Project Fields
Each project has a name (required, maximum 50 characters), a color selected from a preset palette of 8 colors, an optional description (maximum 200 characters), and a status of either Active or Archived.

#### 4.4.3 Project List View
The projects page displays all active projects with their name, color, entry count, and last activity timestamp. Each project has actions for View Logs, Generate Report, Edit, and Archive.

#### 4.4.4 Create Project
A modal form collects the project name, color selection, and optional description. The color defaults to a random selection from the palette.

#### 4.4.5 Edit Project
The same modal form allows editing name, color, and description. Changes apply immediately to all associated activities.

#### 4.4.6 Archive Project
Archiving removes a project from the active list but preserves all data. Archived projects appear in a collapsed "Archived" section. Archived projects can be restored to active status. Activities associated with archived projects remain visible in the timeline.

#### 4.4.7 Delete Project
Deleting a project permanently removes it. Activities associated with the deleted project become "No Project" entries. A confirmation dialog warns about this behavior.

#### 4.4.8 View Logs
Clicking "View Logs" on a project navigates to the activity timeline filtered to show only that project's entries.

---

### 4.5 Filtering and Search

#### 4.5.1 Project Filter
A dropdown on the activity timeline allows filtering by project. Options include All Projects, each individual project, and No Project (unassociated entries).

#### 4.5.2 Date Navigation
A date picker allows jumping to a specific date. Quick navigation buttons provide access to Today, Yesterday, This Week, and This Month.

#### 4.5.3 Global Search
A search input accessible via Command/Control + K opens a search modal. Search queries against activity content using full-text search. Results display with the search term highlighted. Clicking a result navigates to that activity in the timeline.

---

### 4.6 AI Report Generation

This is the killer feature that transforms raw activity logs into polished professional reports.

#### 4.6.1 Report Configuration

Time Period Options include This Week (Monday to current day), This Month (1st to current day), Last Month (full previous month), and Custom Range (user-selected start and end dates).

Project Filter Options include All Projects, a specific single project, or multiple selected projects.

Report Style Options include Executive Summary for concise high-level overview ideal for managers, Detailed Report for comprehensive categorized breakdown, and Bullet Points for quick list format for personal reference.

Tone Options include Professional for formal business language, Casual for conversational and friendly, and Technical for detailed with technical terminology.

#### 4.6.2 Generation Process
When the user clicks "Generate with AI," the system collects all activities matching the filter criteria, formats them into a structured prompt, sends the prompt to OpenRouter API (using a free AI model), and receives and displays the generated report.

#### 4.6.3 AI Prompt Structure
The AI receives a system prompt instructing it to act as a professional report writer. The prompt includes the selected style and tone, guidelines for grouping related activities intelligently, highlighting impact and achievements, using action verbs, and quantifying results when possible. The activity data is provided in a structured format with dates, content, and project associations.

#### 4.6.4 Report Preview
The generated report displays in a formatted preview. Users can read through and verify the content.

#### 4.6.5 Report Editing
A button allows switching to edit mode. The report becomes editable markdown. Users can modify any part of the generated content. Changes are preserved when exporting.

#### 4.6.6 Regeneration
A "Regenerate" button creates a new version using the same parameters. This is useful if the first generation was not satisfactory. The AI does not see the previous output — it generates fresh.

#### 4.6.7 Export Options
Copy to Clipboard places the report as plain text on the clipboard. A toast confirms "Copied to clipboard." Markdown Download generates a .md file download named "jobmark-report-[date].md." PDF Download generates a styled PDF document with proper formatting and branding.

---

### 4.7 Saved Reports Library

#### 4.7.1 Automatic Saving
Every generated report is automatically saved to the user's library. The saved report includes the generated content, generation parameters (date range, project, style, tone), and timestamp of generation.

#### 4.7.2 Library View
The reports page displays all saved reports in reverse chronological order. Each report shows its title (auto-generated based on date range), generation timestamp, parameters used, and action buttons.

#### 4.7.3 Report Actions
View opens the report in read-only preview mode. Edit opens the report in editable mode and saves changes. Export provides the same export options as during generation. Delete removes the report permanently after confirmation.

#### 4.7.4 Report Naming
Reports are auto-named based on the date range (for example, "December 2024 Monthly Report" or "Week of Dec 16-22 Report"). Users can rename reports by editing.

---

### 4.8 Analytics Dashboard

The analytics dashboard provides insights into work patterns and serves as a psychological engagement tool.

#### 4.8.1 Summary Statistics
Three primary metrics display prominently: total activities logged in the selected period, number of active days (days with at least one log), and current streak (consecutive days with logging).

#### 4.8.2 Streak System
The streak counts consecutive days with at least one logged activity. Weekends can optionally be excluded from streak calculation (configurable in settings). Streak milestones (7, 14, 30, 60, 90 days) trigger celebration animations. A fire emoji appears next to active streaks. Streaks reset to zero after a missed day (or missed weekday if weekends excluded).

#### 4.8.3 Activity Heatmap
A GitHub-style contribution heatmap displays logging activity. The heatmap shows the past 12 weeks. Each cell represents a day. Color intensity indicates activity count: empty is 0, light is 1-2, medium is 3-4, dark is 5 or more. Hovering/tapping a cell shows the exact count and date.

#### 4.8.4 Project Breakdown
A horizontal bar chart shows the distribution of activities across projects. Each project displays as a colored bar proportional to its percentage. Percentages are shown numerically. Clicking a project bar filters to that project's activities.

#### 4.8.5 Time Period Selection
Analytics can be viewed for This Week, This Month, Last Month, This Year, or All Time. The default view is This Month.

#### 4.8.6 AI Insights
An AI-generated insight panel provides personalized observations. Insights are generated on-demand when the user visits the analytics page. Example insights include identifying the most productive day of the week, noting project focus distribution, observing logging patterns, and providing encouragement based on progress. A "Generate New Insight" button refreshes the AI analysis.

#### 4.8.7 Trend Indicators
Where applicable, metrics show trend arrows comparing to the previous period. For example, "47 activities (up 12% from last month)."

---

### 4.9 Settings

#### 4.9.1 Profile Settings
Users can view their Google account email (read-only), update their display name, and view their profile avatar (sourced from Google).

#### 4.9.2 Preferences
Weekend Streak Toggle determines whether weekends count toward streak calculation when enabled or are excluded from streak breaks when disabled. The default is enabled.

Default Project sets the pre-selected project for new entries. The default is "None (ask each time)."

#### 4.9.3 Data Management
Export All Data downloads a JSON file containing all user data including activities, projects, and reports. Delete Account permanently removes the account and all associated data after confirmation and re-authentication.

---

### 4.10 Notifications and Feedback

#### 4.10.1 Toast Notifications
All user actions receive immediate feedback via toast notifications. Toasts appear in the bottom-right corner (bottom-center on mobile). Success toasts auto-dismiss after 3 seconds. Error toasts persist until dismissed. Undo actions are available for 5 seconds where applicable.

#### 4.10.2 Loading States
All async operations show appropriate loading indicators. Skeleton loaders appear for content that is loading. Buttons show loading spinners when processing. The UI remains interactive where possible during loads.

#### 4.10.3 Error Handling
Network errors display friendly messages with retry options. Validation errors appear inline near the relevant field. Critical errors (auth failure, etc.) redirect appropriately.

---

## 5. Technical Architecture

### 5.1 Technology Stack

Frontend Framework: Next.js 14+ with App Router
UI Library: React 18+
Styling: Tailwind CSS
Component Library: shadcn/ui with custom theming
Animations: Framer Motion
Database: Neon (Serverless PostgreSQL)
ORM: Prisma
Authentication: NextAuth.js (Auth.js) with Google Provider
AI Integration: OpenRouter API (free models)
Form Handling: React Hook Form with Zod validation
Date Utilities: date-fns
PDF Generation: @react-pdf/renderer
Deployment: Vercel

### 5.2 Project Structure

The source directory contains an app directory using Next.js App Router conventions. Within app, an auth route group contains login pages and auth layout. A dashboard route group contains the main dashboard page, calendar page, reports pages, projects pages, analytics page, and settings page along with a dashboard layout. An api directory contains auth routes with NextAuth catch-all handler, plus additional API routes as needed.

A components directory contains ui components from shadcn, activity components for cards, forms, lists, and quick capture, report components for generator and preview, analytics components for charts and insights, and layout components for sidebar, header, and navigation.

A lib directory contains a db subdirectory with Prisma client initialization, an auth configuration file, utilities, and OpenRouter client.

An actions directory contains server actions for activities, projects, and reports.

A prisma directory contains the schema file and migrations.

A types directory contains TypeScript type definitions.

### 5.3 Database Schema

The User model contains an id as the primary key, email as unique string, name as optional string, image as optional string, and timestamps for creation and updates. It has relations to Activity, Project, and Report.

The Project model contains an id as primary key, userId as foreign key to User with cascade delete, name as string, color as string defaulting to a purple hex value, description as optional string, archived as boolean defaulting to false, and timestamps. It has a relation to Activity.

The Activity model contains an id as primary key, userId as foreign key to User with cascade delete, projectId as optional foreign key to Project with set null on delete, content as text, logDate as date defaulting to current date, and timestamps. It has indexes on userId and logDate descending, and on projectId.

The Report model contains an id as primary key, userId as foreign key to User with cascade delete, title as string, content as text, dateRangeStart and dateRangeEnd as dates, projectFilter as optional string for storing project IDs or "all", style as string, tone as string, and timestamps. It has an index on userId.

### 5.4 API Routes and Server Actions

Authentication is handled via NextAuth at /api/auth/[...nextauth].

Activity Server Actions include createActivity for adding a new activity log, updateActivity for modifying an existing activity, deleteActivity for removing an activity, getActivities for fetching paginated activities with optional filters, searchActivities for full-text search, and enhanceActivityContent for AI enhancement of text.

Project Server Actions include createProject, updateProject, archiveProject, deleteProject, and getProjects.

Report Server Actions include generateReport for AI-powered report generation, saveReport, updateReport, deleteReport, getReports, and exportReportPDF.

Analytics Server Actions include getAnalytics for fetching stats for a period, getStreak for calculating current streak, and generateInsight for AI-powered pattern analysis.

### 5.5 OpenRouter Integration

A createOpenRouterClient function initializes the client with the API key from environment variables. The base URL points to the OpenRouter API. Model selection prioritizes free models such as mistralai/mistral-7b-instruct:free or meta-llama/llama-3.2-3b-instruct:free.

Prompt Templates exist for report generation and activity enhancement. The report generation template instructs the AI to act as a professional report writer, specifying the style and tone, providing formatting guidelines, listing the activities, and requesting markdown output. The activity enhancement template instructs the AI to polish the text professionally while preserving original meaning.

---

## 6. User Interface Specifications

### 6.1 Design System

Color Palette: Primary color is Indigo (similar to #6366f1). Secondary color is Slate for neutral grays. Accent color is Emerald for success states. Warning color is Amber. Error color is Rose. The background is near-white (#fafafa) with pure white cards.

Typography: The font family is Inter or system sans-serif. Headings use semi-bold weight at sizes 2xl, xl, and lg. Body text uses regular weight at base and sm sizes. Line height is relaxed for body text.

Spacing: Base unit is 4px. Common spacings are 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), and 8 (32px). Cards use 6 (24px) padding. Generous whitespace is used between sections.

Borders: Border radius is lg (8px) for cards and md (6px) for buttons and inputs. Border color is slate-200 at 1px.

Shadows: Cards use shadow-sm. Elevated elements use shadow-md. Modals use shadow-lg.

### 6.2 Animation Guidelines

Page Transitions: Fade in with subtle upward motion taking 200ms with ease-out easing.

Card Animations: Stagger children by 50ms on list render. Hover lifts card with shadow increase.

Micro-interactions: Button press scales to 0.98. Success checkmarks animate in with draw effect. Toast slides in from bottom-right.

Loading States: Skeleton pulse animation at 1.5 seconds. Spinner rotation is continuous. Button loading shows spinner replacing text.

### 6.3 Responsive Breakpoints

Mobile is 0-639px (single column, bottom navigation). Tablet is 640-1023px (sidebar collapses to icons). Desktop is 1024px and up (full sidebar, optimal layout).

### 6.4 Mobile Optimizations

Touch targets are minimum 44x44px. Quick capture remains fixed at the top and is always accessible. Navigation moves to bottom tab bar on mobile. Swipe gestures enable edit/delete on activity cards. The keyboard avoidance pattern adjusts layout when the keyboard opens.

---

## 7. User Flows

### 7.1 First-Time User Flow

User lands on the marketing homepage. User clicks "Get Started" or "Sign in with Google." Google OAuth consent screen appears. Upon successful auth, user is redirected to the dashboard. An empty state welcomes the user and prompts them to log their first activity. User enters their first activity and saves. A celebration animation plays. The activity appears in the timeline.

### 7.2 Daily Logging Flow

User opens Jobmark (already authenticated). Dashboard loads with quick capture focused. User types what they accomplished. User optionally selects a project. User presses Cmd+Enter or clicks Save. Success feedback appears and the input clears. The new activity appears at the top of today's section.

### 7.3 Report Generation Flow

User navigates to Reports and clicks "New Report." User selects time period (e.g., "This Month"). User optionally filters by project. User selects report style and tone. User clicks "Generate with AI." Loading state shows while AI processes. Generated report appears in preview. User reviews and optionally edits. User exports via Copy, Markdown, or PDF. Report is automatically saved to the library.

### 7.4 Analytics Review Flow

User navigates to Analytics. Current period stats load (activities, days, streak). Heatmap and project breakdown render. User views their progress and patterns. User clicks "Generate Insight" for AI analysis. AI provides personalized observations. User feels motivated by visible progress.

---

## 8. Success Metrics

### 8.1 Engagement Metrics

Daily Active Users (DAU) represents users who log at least one activity per day. Weekly Active Users (WAU) represents users who log at least one activity per week. The DAU/WAU ratio indicates stickiness. The target is greater than 0.6.

Average Activities Per User Per Day should target 2-3 activities.

Streak Distribution measures the percentage of users with streaks of 7 days or more. The target is greater than 30%.

### 8.2 Feature Adoption Metrics

Report Generation Rate measures the percentage of users who generate at least one report per month. The target is greater than 50%.

AI Enhancement Usage measures the percentage of activities that use AI enhancement. The target is greater than 20%.

Project Usage measures the percentage of activities associated with a project. The target is greater than 60%.

### 8.3 Retention Metrics

Day 1 Retention represents users who return the day after signup. The target is greater than 40%. Day 7 Retention represents users who return within 7 days. The target is greater than 25%. Day 30 Retention represents users who return within 30 days. The target is greater than 15%.

### 8.4 Quality Metrics

Time to First Activity measures how long from signup to first log. The target is less than 2 minutes. Average Session Duration should target 3-5 minutes.

---

## 9. Development Roadmap

### 9.1 Phase 1: MVP (Weeks 1-2)

Week 1 covers foundation work. Days 1-2 focus on project setup, Prisma schema, Neon DB connection, and NextAuth with Google OAuth. Days 3-4 focus on the quick capture component and activity CRUD operations via server actions. Days 5-7 focus on the dashboard UI, activity timeline, and date grouping.

Week 2 covers core features. Days 1-2 focus on project CRUD and the project list view. Days 3-4 focus on AI report generation with OpenRouter integration. Day 5 focuses on report export including copy and markdown download. Days 6-7 focus on the saved reports library, global search, and polish.

### 9.2 Phase 2: Analytics and Enhancement (Weeks 3-4)

Week 3 covers analytics. Days 1-2 focus on analytics dashboard stats and the streak system. Days 3-4 focus on the activity heatmap component. Day 5 focuses on project breakdown charts. Days 6-7 focus on AI insights generation.

Week 4 covers polish. Days 1-2 focus on AI activity enhancement. Days 3-4 focus on PDF export, mobile optimization, and responsive fixes. Day 5 focuses on settings page and data export. Days 6-7 focus on the landing page, final testing, and deployment.

### 9.3 Phase 3: Future Enhancements (Post-Launch)

PWA capabilities enable offline support and installable app features. Advanced analytics adds year-over-year comparisons and predictive insights. Template reports offer pre-built report formats for common use cases. Reminder system provides optional gentle nudges to log activities. Integrations with Slack and calendar apps are considered. Team features would allow shared projects and team reports.

---

## 10. Out of Scope (Explicitly Excluded)

Tags and Labels are excluded because projects plus search provide sufficient organization without added complexity.

Auto-generated Weekly Summaries are excluded because on-demand reports are preferred over automated outputs.

Team and Collaboration Features are excluded from MVP because the focus is on personal use first.

Calendar Integration is excluded because it adds scope and can be revisited post-launch.

Slack or Email Integration is excluded as nice-to-have but not core functionality.

Multiple Authentication Providers are excluded because Google OAuth is sufficient for launch.

Offline Mode is excluded from MVP and may be considered for PWA phase.

Custom Report Templates are excluded because AI generation with style options is sufficient.

---

## 11. Risks and Mitigations

Risk: AI API costs exceed budget.
Mitigation: Use OpenRouter free tier models. Implement rate limiting per user. Cache common report patterns.

Risk: Users do not form logging habit.
Mitigation: Strong psychological engagement features including streaks, heatmap, and celebrations. Consider optional reminder notifications in a future phase.

Risk: Report quality is inconsistent.
Mitigation: Careful prompt engineering. Allow regeneration. Enable user editing. Iterate on prompts based on feedback.

Risk: Mobile experience is subpar.
Mitigation: Mobile-first development approach. Extensive testing on real devices. Touch-optimized interactions.

Risk: Data privacy concerns.
Mitigation: Clear privacy policy. Data export functionality. Account deletion option. No data sharing with third parties.

---

## 12. Launch Checklist

Pre-Launch requirements include completing all MVP features, mobile responsiveness testing, error handling and edge cases, loading states for all async operations, empty states for all views, SEO and meta tags for the landing page, privacy policy and terms of service, analytics integration (such as Vercel Analytics or Plausible), and error monitoring (such as Sentry).

Launch Day activities include deploying to production on Vercel, verifying Google OAuth in production, testing the complete user flow, monitoring for errors, and soft launch to gather initial feedback.

Post-Launch activities include monitoring engagement metrics, gathering user feedback, iterating on AI prompts based on report quality, and prioritizing Phase 2 features based on usage data.

---

## 13. Appendix

### 13.1 Keyboard Shortcuts

Cmd/Ctrl + Enter saves the current entry.
Cmd/Ctrl + K opens global search.
Escape closes modals and cancels edits.

### 13.2 Environment Variables

DATABASE_URL is the Neon PostgreSQL connection string.
NEXTAUTH_SECRET is a random string for session encryption.
NEXTAUTH_URL is the application URL.
GOOGLE_CLIENT_ID is the OAuth client ID.
GOOGLE_CLIENT_SECRET is the OAuth client secret.
OPENROUTER_API_KEY is the API key for AI services.

### 13.3 Third-Party Services

Neon provides the database at neon.tech.
Google Cloud Console provides OAuth at console.cloud.google.com.
OpenRouter provides AI API access at openrouter.ai.
Vercel provides hosting at vercel.com.

---

End of Product Specification Document