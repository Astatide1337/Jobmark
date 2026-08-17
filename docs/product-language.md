# Jobmark product language

This guide sets the words used in Jobmark's UI, documentation, and marketing copy.

## The promise

Jobmark helps people write down their work while it is fresh and use those notes later when a
review, update, project check-in, or next step matters.

The product should feel calm and practical. It helps people remember and find what they did. An
assistant can help with a record or draft when the user chooses to connect one, but saved notes stay
the source of truth.

## Voice

- Use basic words. Write for someone scanning the screen.
- Use short sentences. Keep one idea per sentence.
- Say what the user can do. Prefer verbs such as `write`, `save`, `find`, `group`, `review`,
  `share`, `connect`, or `export`.
- Say what a feature does before naming the technology behind it.
- Make it clear that the user's notes stay theirs.
- Use sentence case for labels, headings, buttons, and navigation.
- Do not use em dashes, idioms, metaphors, hype, or vague claims.
- Do not write as if the product is a coach, therapist, or manager.

## Canonical terms

| Use this        | Meaning                             | Avoid in user-facing copy                  |
| --------------- | ----------------------------------- | ------------------------------------------ |
| note            | One thing saved about work          | activity, entry, accomplishment            |
| record          | All of the user's notes             | career record on every screen              |
| project         | A group of related notes            | container, workspace when it means project |
| review draft    | A draft for a review                | report, narrative, career-ready output     |
| update          | A short message about progress      | manager-ready update                       |
| summary         | A short view of saved notes         | AI-generated output                        |
| AI assistant    | An outside assistant the user picks | AI app as the main product term            |
| conversation    | A call, meeting, or message         | touchpoint, outreach                       |
| focus session   | A guided breathing or focus period  | decompression ritual                       |
| block           | One part of a focus session         | module when the user does not need it      |
| private project | A project protected by a password   | vault without an explanation               |

Backend names, routes, database fields, MCP tool names, and API contracts can keep their existing
technical terminology. This guide applies to what people read and click.

## Product hierarchy

1. **Write**: save the work while it is fresh.
2. **Group**: put notes in projects so they are easy to find.
3. **Use**: build a review draft, write an update, or connect an assistant.
4. **Review**: look at notes and goals to decide what to do next.

## Marketing hierarchy

Public product copy should answer these questions in roughly this order:

1. What is Jobmark? Work notes that stay useful later.
2. What does using it look like? Save a note and group it with the right project.
3. What can the record become? A review draft, an update, an insight, or context for an assistant.
4. Why trust it? The record can be exported, assistants are optional, and private projects can be
   protected.
5. What should the visitor do next? Add a note.

Show product proof near the claim it supports. Prefer the actual product video, shared UI
components, and clearly labeled example data over invented browser windows or abstract feature art.

## Preferred actions

- `Add note`
- `Save note`
- `Edit note`
- `Create project`
- `Edit project`
- `Build review draft`
- `Save draft`
- `Add conversation`
- `Connect an assistant`
- `Disconnect assistant`
- `Export record`
- `Save changes`

## Claims and proof

- Describe capabilities that exist in the product today.
- If a capability is partial, describe the part that works instead of implying the complete version.
- Representative data in a product preview should be labeled as example data when it could be
  mistaken for a real user's data or a product-wide metric.
- Never invent customers, testimonials, usage counts, conversion rates, time savings, performance
  claims, integrations, pricing, or security guarantees.
- `Claude`, `ChatGPT`, and `Gemini` may be named where the product actually supports their MCP
  connection flow. Prefer `AI assistant` or `assistant` when the provider does not matter.

## Avoid

Avoid `unlock`, `elevate`, `supercharge`, `seamless`, `powerful`, `transform`, `career-ready`,
`next-level`, `leverage`, `meaningful`, `shape`, `tighten`, `make space`, `keep the record going`,
`another set of eyes`, and `ritual`.

Avoid `evidence` when `note` is enough. Avoid `story` and `narrative` when `review draft` or
`summary` is clearer. Avoid generic claims such as `AI-powered` when the important fact is that the
user can connect the assistant they already use.
