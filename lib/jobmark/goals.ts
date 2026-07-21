/**
 * Goals domain functions
 */
'use server';

import { prisma } from '@/lib/db';
import { JobmarkActor, assertActor, NotFoundError, ValidationError } from './index';
import { z } from 'zod';

const goalCreateSchema = z.object({
  title: z.string().min(1).max(200),
  deadline: z.string().datetime().optional().nullable(),
  why: z.string().max(500).optional().nullable(),
});

const goalUpdateSchema = goalCreateSchema.partial();

export type GoalInput = z.infer<typeof goalCreateSchema>;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

export type GoalDTO = {
  id: string;
  title: string;
  deadline: string | null;
  why: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listGoals(
  actor: JobmarkActor,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ goals: GoalDTO[]; nextCursor: string | null }> {
  assertActor(actor);

  const { limit = 100, cursor } = options;

  const goals = await prisma.goal.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  let nextCursor: string | null = null;
  if (goals.length > limit) {
    const next = goals.pop();
    nextCursor = next!.id;
  }

  return { goals: goals.map(toGoalDTO), nextCursor };
}

export async function getGoal(actor: JobmarkActor, goalId: string): Promise<GoalDTO> {
  assertActor(actor);

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: actor.userId },
  });

  if (!goal) throw new NotFoundError('Goal');

  return toGoalDTO(goal);
}

export async function createGoal(actor: JobmarkActor, input: GoalInput): Promise<GoalDTO> {
  assertActor(actor);

  const result = goalCreateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const goal = await prisma.goal.create({
    data: {
      userId: actor.userId,
      title: result.data.title,
      deadline: result.data.deadline ? new Date(result.data.deadline) : null,
      why: result.data.why,
    },
  });

  return toGoalDTO(goal);
}

export async function updateGoal(
  actor: JobmarkActor,
  goalId: string,
  input: GoalUpdateInput
): Promise<GoalDTO> {
  assertActor(actor);

  const result = goalUpdateSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: actor.userId },
  });

  if (!goal) throw new NotFoundError('Goal');

  const data: any = { ...result.data };
  if (data.deadline) data.deadline = new Date(data.deadline);

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data,
  });

  return toGoalDTO(updated);
}

export async function deleteGoal(actor: JobmarkActor, goalId: string): Promise<void> {
  assertActor(actor);

  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: actor.userId },
  });

  if (!goal) throw new NotFoundError('Goal');

  await prisma.goal.delete({ where: { id: goalId } });
}

function toGoalDTO(goal: any): GoalDTO {
  return {
    id: goal.id,
    title: goal.title,
    deadline: goal.deadline?.toISOString() ?? null,
    why: goal.why,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}