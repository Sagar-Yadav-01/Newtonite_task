import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['LEAD', 'MEMBER']).optional().default('MEMBER'),
});

export const workItemStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED']);
export const workItemPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createWorkItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  teamId: z.string().uuid('Invalid team ID'),
  priority: workItemPriorityEnum.optional().default('MEDIUM'),
  status: workItemStatusEnum.optional().default('OPEN'),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().nullable().optional()),
});

export const updateWorkItemSchema = z.object({
  version: z.number().int().min(1, 'Version number is required for OCC check'),
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  priority: workItemPriorityEnum.optional(),
  status: workItemStatusEnum.optional(),
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const assignWorkItemSchema = z.object({
  version: z.number().int().min(1, 'Version number is required for assignment'),
  assigneeId: z.string().uuid().nullable(),
});

export const updateStatusSchema = z.object({
  version: z.number().int().min(1, 'Version number is required for status change'),
  status: workItemStatusEnum,
});

export const queryWorkItemsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  teamId: z.string().optional(),
  assigneeId: z.string().optional(),
  createdById: z.string().optional(),
  dueDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .transform((val) => (val ? Math.min(100, val) : 20)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate', 'title', 'status']).optional().default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  filterType: z.enum(['all', 'myWork', 'unassigned']).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
});
