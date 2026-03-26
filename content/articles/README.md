# Articles Content Guide

This directory stores public SEO articles for Jobmark.

## Goals

- Publish public help and career-development content.
- Keep publishing maintainer-only (Git workflow, no in-app authoring).

## File Naming

- Use kebab-case file names: `your-article-slug.md`.
- File name must match the `slug` frontmatter value.

## Required Frontmatter

Every article must include this frontmatter block:

```md
---
title: Your title
description: One sentence summary used for SEO and cards.
slug: your-article-slug
publishedAt: 2026-03-05
updatedAt: 2026-03-05
category: help
tags:
  - tag-one
  - tag-two
author: Jobmark
draft: false
---
```

## Category Values

- `help`
- `career-development`

## Draft Workflow

- Use `draft: true` while preparing content.
- Drafts are shown in development and hidden in production.

## Optional Frontmatter (Editorial UX)

Use these fields to improve placement and in-article experience:

```md
featured: true # Prioritized as lead story on the index page
series: Performance Reviews
difficulty: starter # starter | intermediate | advanced
heroTone: strategy
ctaVariant: checklist
bestFor: Weekly updates
primaryAction: Open dashboard
primaryHref: /dashboard
secondaryAction: Build a summary
secondaryHref: /reports?tab=new
```

## Writing Guidelines

- Keep introductions short and practical.
- Use clear headings and scannable bullets.
- Include actionable examples.
- Link to relevant Jobmark pages when useful.
- Prefer one concrete next step inside Jobmark by the end of the article.
