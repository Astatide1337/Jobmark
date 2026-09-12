import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { interactionsListTool } from '@/lib/mcp/tools/interactions';
import type { McpActor } from '@/lib/mcp/actor';
import { listInteractions } from './interactions';

const integrationEnabled = process.env.INTEGRATION_TESTS === '1';

describe.skipIf(!integrationEnabled)('PostgreSQL interaction pagination', () => {
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const contactId = randomUUID();
  const secondContactId = randomUUID();
  const tieContactId = randomUUID();
  const foreignContactId = randomUUID();
  const rowIds = ['A', 'B', 'C', 'D', 'E'].map(label => `${userId}-${label}`);
  const secondContactRowId = `${userId}-second-contact`;
  const tieRowIds = [`${userId}-tie-a`, `${userId}-tie-b`];
  const actor: McpActor = {
    userId,
    source: 'mcp',
    connectionId: 'pagination-test',
    clientId: 'pagination-test',
    scopes: ['jobmark:read'],
    vaultUnlocked: false,
    vaultUnlockedUntil: null,
    requestId: randomUUID(),
  };

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: userId, email: `pagination-${userId}@example.test` },
        { id: otherUserId, email: `pagination-${otherUserId}@example.test` },
      ],
    });
    await prisma.contact.createMany({
      data: [
        { id: contactId, userId, fullName: 'Pagination contact' },
        { id: secondContactId, userId, fullName: 'Second pagination contact' },
        { id: tieContactId, userId, fullName: 'Tied pagination contact' },
        { id: foreignContactId, userId: otherUserId, fullName: 'Other user contact' },
      ],
    });
    await prisma.interactionLog.createMany({
      data: [
        ...rowIds.map((id, index) => ({
          id,
          userId,
          contactId,
          summary: String.fromCharCode(65 + index),
          occurredAt: new Date(Date.UTC(2026, 8, 1, 12 - index)),
        })),
        {
          id: secondContactRowId,
          userId,
          contactId: secondContactId,
          summary: 'Second contact',
          occurredAt: new Date('2026-09-01T12:30:00.000Z'),
        },
        ...tieRowIds.map(id => ({
          id,
          userId,
          contactId: tieContactId,
          summary: id,
          occurredAt: new Date('2026-09-01T11:30:00.000Z'),
        })),
        {
          id: `${otherUserId}-foreign`,
          userId: otherUserId,
          contactId: foreignContactId,
          summary: 'Other user',
          occurredAt: new Date('2026-09-01T13:00:00.000Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await prisma.$disconnect();
  });

  it.each([1, 2, 5, 6])('returns every matching row exactly once with limit %i', async limit => {
    const seen: string[] = [];
    let cursor: string | undefined;
    let finished = false;

    for (let pageNumber = 0; pageNumber <= rowIds.length; pageNumber++) {
      const page = await listInteractions(actor, { contactId, limit, cursor });
      expect(page.interactions.length).toBeLessThanOrEqual(limit);
      seen.push(...page.interactions.map(interaction => interaction.id));
      if (page.nextCursor === null) {
        finished = true;
        break;
      }
      cursor = page.nextCursor;
    }

    expect(finished).toBe(true);
    expect(seen).toEqual(rowIds);
    expect(new Set(seen).size).toBe(rowIds.length);
  });

  it('uses the last returned row as the cursor and ends after the final page', async () => {
    const first = await listInteractions(actor, { contactId, limit: 2 });
    expect(first.nextCursor).toBe(rowIds[1]);
    const second = await listInteractions(actor, {
      contactId,
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.interactions.map(row => row.id)).toEqual([rowIds[2], rowIds[3]]);
    expect(second.nextCursor).toBe(rowIds[3]);
    const last = await listInteractions(actor, {
      contactId,
      limit: 2,
      cursor: second.nextCursor ?? undefined,
    });
    expect(last.interactions.map(row => row.id)).toEqual([rowIds[4]]);
    expect(last.nextCursor).toBeNull();
  });

  it('preserves contact filtering and user isolation', async () => {
    const allContacts = await listInteractions(actor, { limit: 100 });
    expect(allContacts.interactions.map(row => row.id)).toEqual([
      secondContactRowId,
      rowIds[0],
      tieRowIds[1],
      tieRowIds[0],
      ...rowIds.slice(1),
    ]);
    const foreignContact = await listInteractions(actor, { contactId: foreignContactId });
    expect(foreignContact).toEqual({ interactions: [], nextCursor: null });
    const pastEnd = await listInteractions(actor, { contactId, cursor: rowIds[4], limit: 2 });
    expect(pastEnd).toEqual({ interactions: [], nextCursor: null });
  });

  it('uses the ID as a stable tie-breaker for equal timestamps', async () => {
    const first = await listInteractions(actor, { contactId: tieContactId, limit: 1 });
    expect(first.interactions.map(row => row.id)).toEqual([tieRowIds[1]]);
    expect(first.nextCursor).toBe(tieRowIds[1]);

    const last = await listInteractions(actor, {
      contactId: tieContactId,
      limit: 1,
      cursor: first.nextCursor ?? undefined,
    });
    expect(last.interactions.map(row => row.id)).toEqual([tieRowIds[0]]);
    expect(last.nextCursor).toBeNull();
  });

  it('passes the continuation cursor through the real MCP tool handler', async () => {
    const first = await interactionsListTool.execute(actor, { contactId, limit: 2 });
    expect(first.structuredContent).toMatchObject({
      interactions: [{ id: rowIds[0] }, { id: rowIds[1] }],
      nextCursor: rowIds[1],
    });
    const second = await interactionsListTool.execute(actor, {
      contactId,
      limit: 2,
      cursor: first.structuredContent?.nextCursor,
    });
    expect(second.structuredContent).toMatchObject({
      interactions: [{ id: rowIds[2] }, { id: rowIds[3] }],
      nextCursor: rowIds[3],
    });
  });
});
