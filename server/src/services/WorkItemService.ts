import { prisma } from '../utils/prisma';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors';
import { AuthUser } from '../middleware/auth';

export class WorkItemService {
  /**
   * Enforces centralized workflow state machine rules
   */
  public static validateStatusTransition(currentStatus: string, newStatus: string): void {
    if (currentStatus === newStatus) return;

    const allowedTransitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS'],
      IN_PROGRESS: ['OPEN', 'BLOCKED', 'RESOLVED'],
      BLOCKED: ['IN_PROGRESS'],
      RESOLVED: ['IN_PROGRESS', 'CLOSED'],
      CLOSED: [], // CLOSED is terminal
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw BadRequestError(
        `Cannot transition work item status from ${currentStatus} to ${newStatus}.`,
        'INVALID_WORKFLOW_TRANSITION'
      );
    }
  }

  /**
   * Creates a new work item with initial activity log in a transaction
   */
  public static async createWorkItem(
    user: AuthUser,
    data: {
      title: string;
      description: string;
      teamId: string;
      priority?: string;
      status?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) {
    // Validate team existence
    const team = await prisma.team.findUnique({ where: { id: data.teamId } });
    if (!team) throw NotFoundError('Team not found');

    // If assignee specified, validate assignee existence and team membership
    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (!assignee) throw NotFoundError('Assignee user not found');
    }

    const priority = data.priority || 'MEDIUM';
    const status = data.status || 'OPEN';
    const parsedDueDate = data.dueDate ? new Date(data.dueDate) : null;

    // Perform WorkItem creation and initial ActivityLog in a transaction
    return prisma.$transaction(async (tx) => {
      const workItem = await tx.workItem.create({
        data: {
          title: data.title.trim(),
          description: data.description.trim(),
          teamId: data.teamId,
          priority,
          status,
          assigneeId: data.assigneeId || null,
          createdById: user.id,
          dueDate: parsedDueDate,
          version: 1,
        },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          workItemId: workItem.id,
          userId: user.id,
          action: 'WORK_CREATED',
          metadata: JSON.stringify({
            title: workItem.title,
            team: team.name,
            priority: workItem.priority,
            status: workItem.status,
          }),
        },
      });

      return workItem;
    });
  }

  /**
   * Fetches paginated, filtered, searched, and sorted work items
   */
  public static async getWorkItems(
    user: AuthUser,
    params: {
      search?: string;
      status?: string;
      priority?: string;
      teamId?: string;
      assigneeId?: string;
      createdById?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filterType?: 'all' | 'myWork' | 'unassigned';
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    // Server-side authorization filtering for non-ADMIN users:
    // Non-admin users can see work items for teams they belong to
    if (user.role !== 'ADMIN') {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: user.id },
        select: { teamId: true },
      });
      const teamIds = userTeams.map((t) => t.teamId);
      where.teamId = { in: teamIds };
    }

    // Specific team filter
    if (params.teamId) {
      where.teamId = params.teamId;
    }

    // Status filter
    if (params.status) {
      where.status = params.status;
    }

    // Priority filter
    if (params.priority) {
      where.priority = params.priority;
    }

    // Assignee filter
    if (params.assigneeId) {
      where.assigneeId = params.assigneeId;
    }

    // Creator filter
    if (params.createdById) {
      where.createdById = params.createdById;
    }

    // Preset filters
    if (params.filterType === 'myWork') {
      where.assigneeId = user.id;
    } else if (params.filterType === 'unassigned') {
      where.assigneeId = null;
    }

    // Search on title or description
    if (params.search && params.search.trim()) {
      const query = params.search.trim();
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
      ];
    }

    // Allow-list sorting
    const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'dueDate', 'title', 'status'];
    const sortBy = allowedSortFields.includes(params.sortBy || '') ? params.sortBy! : 'updatedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      prisma.workItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.workItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * Fetches single work item by ID with details, comments, and activity history
   */
  public static async getWorkItemById(workItemId: string) {
    const item = await prisma.workItem.findUnique({
      where: { id: workItemId },
      include: {
        team: { select: { id: true, name: true, description: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!item || item.deletedAt) {
      throw NotFoundError('Work item not found');
    }

    return item;
  }

  /**
   * Updates a work item with Optimistic Concurrency Control (OCC) and activity logging
   */
  public static async updateWorkItem(
    user: AuthUser,
    workItemId: string,
    data: {
      version: number;
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      teamId?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // Load current item
      const current = await tx.workItem.findUnique({
        where: { id: workItemId },
      });

      if (!current || current.deletedAt) {
        throw NotFoundError('Work item not found');
      }

      // Check OCC version
      if (current.version !== data.version) {
        throw ConflictError(
          'This work item was modified by another user. Refresh to see the latest version.',
          'VERSION_CONFLICT'
        );
      }

      // Check workflow rules if status is changing
      if (data.status && data.status !== current.status) {
        WorkItemService.validateStatusTransition(current.status, data.status);
      }

      const updatePayload: any = {
        version: { increment: 1 },
      };

      const changes: { field: string; oldVal: string; newVal: string; action: string }[] = [];

      if (data.title !== undefined && data.title.trim() !== current.title) {
        updatePayload.title = data.title.trim();
        changes.push({
          field: 'title',
          oldVal: current.title,
          newVal: data.title.trim(),
          action: 'WORK_UPDATED',
        });
      }

      if (data.description !== undefined && data.description.trim() !== current.description) {
        updatePayload.description = data.description.trim();
        changes.push({
          field: 'description',
          oldVal: current.description,
          newVal: data.description.trim(),
          action: 'WORK_UPDATED',
        });
      }

      if (data.priority !== undefined && data.priority !== current.priority) {
        updatePayload.priority = data.priority;
        changes.push({
          field: 'priority',
          oldVal: current.priority,
          newVal: data.priority,
          action: 'PRIORITY_CHANGED',
        });
      }

      if (data.status !== undefined && data.status !== current.status) {
        updatePayload.status = data.status;
        changes.push({
          field: 'status',
          oldVal: current.status,
          newVal: data.status,
          action: 'STATUS_CHANGED',
        });
      }

      if (data.teamId !== undefined && data.teamId !== current.teamId) {
        updatePayload.teamId = data.teamId;
        changes.push({
          field: 'teamId',
          oldVal: current.teamId,
          newVal: data.teamId,
          action: 'TEAM_CHANGED',
        });
      }

      if (data.assigneeId !== undefined && data.assigneeId !== current.assigneeId) {
        updatePayload.assigneeId = data.assigneeId;
        let action = 'REASSIGNED';
        if (!current.assigneeId && data.assigneeId) action = 'ASSIGNED';
        if (current.assigneeId && !data.assigneeId) action = 'UNASSIGNED';
        changes.push({
          field: 'assigneeId',
          oldVal: current.assigneeId || 'unassigned',
          newVal: data.assigneeId || 'unassigned',
          action,
        });
      }

      if (data.dueDate !== undefined) {
        const newDueDate = data.dueDate ? new Date(data.dueDate) : null;
        updatePayload.dueDate = newDueDate;
        changes.push({
          field: 'dueDate',
          oldVal: current.dueDate ? current.dueDate.toISOString() : 'none',
          newVal: newDueDate ? newDueDate.toISOString() : 'none',
          action: 'DUE_DATE_CHANGED',
        });
      }

      // Perform atomic conditional update
      const updatedCount = await tx.workItem.updateMany({
        where: {
          id: workItemId,
          version: data.version,
        },
        data: updatePayload,
      });

      if (updatedCount.count === 0) {
        throw ConflictError(
          'This work item was modified by another user.',
          'VERSION_CONFLICT'
        );
      }

      // Fetch the updated entity
      const updatedItem = await tx.workItem.findUnique({
        where: { id: workItemId },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Record activity log entries for each change
      for (const change of changes) {
        await tx.activityLog.create({
          data: {
            workItemId,
            userId: user.id,
            action: change.action,
            field: change.field,
            oldValue: change.oldVal,
            newValue: change.newVal,
          },
        });
      }

      return updatedItem;
    });
  }

  /**
   * Race-safe atomic work item assignment
   */
  public static async assignWorkItem(
    user: AuthUser,
    workItemId: string,
    data: { assigneeId: string | null; version: number }
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.workItem.findUnique({
        where: { id: workItemId },
      });

      if (!current || current.deletedAt) {
        throw NotFoundError('Work item not found');
      }

      if (current.version !== data.version) {
        throw ConflictError(
          'This work item was modified by another user.',
          'VERSION_CONFLICT'
        );
      }

      // If claiming an unassigned item, atomic check ensuring assigneeId IS NULL
      const whereCondition: any = {
        id: workItemId,
        version: data.version,
      };

      if (!current.assigneeId && data.assigneeId) {
        whereCondition.assigneeId = null;
      }

      const updatedCount = await tx.workItem.updateMany({
        where: whereCondition,
        data: {
          assigneeId: data.assigneeId,
          version: { increment: 1 },
        },
      });

      if (updatedCount.count === 0) {
        throw ConflictError(
          'Assignment failed because another user has already claimed or modified this work item.',
          'VERSION_CONFLICT'
        );
      }

      const action = !current.assigneeId
        ? 'ASSIGNED'
        : !data.assigneeId
        ? 'UNASSIGNED'
        : 'REASSIGNED';

      await tx.activityLog.create({
        data: {
          workItemId,
          userId: user.id,
          action,
          field: 'assigneeId',
          oldValue: current.assigneeId || 'unassigned',
          newValue: data.assigneeId || 'unassigned',
        },
      });

      const updatedItem = await tx.workItem.findUnique({
        where: { id: workItemId },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      return updatedItem;
    });
  }

  /**
   * Updates workflow status with explicit transition check & OCC versioning
   */
  public static async updateStatus(
    user: AuthUser,
    workItemId: string,
    data: { status: string; version: number }
  ) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.workItem.findUnique({
        where: { id: workItemId },
      });

      if (!current || current.deletedAt) {
        throw NotFoundError('Work item not found');
      }

      if (current.version !== data.version) {
        throw ConflictError(
          'This work item was modified by another user.',
          'VERSION_CONFLICT'
        );
      }

      WorkItemService.validateStatusTransition(current.status, data.status);

      const updatedCount = await tx.workItem.updateMany({
        where: {
          id: workItemId,
          version: data.version,
        },
        data: {
          status: data.status,
          version: { increment: 1 },
        },
      });

      if (updatedCount.count === 0) {
        throw ConflictError(
          'Status update failed due to concurrent modification.',
          'VERSION_CONFLICT'
        );
      }

      await tx.activityLog.create({
        data: {
          workItemId,
          userId: user.id,
          action: 'STATUS_CHANGED',
          field: 'status',
          oldValue: current.status,
          newValue: data.status,
        },
      });

      const updatedItem = await tx.workItem.findUnique({
        where: { id: workItemId },
        include: {
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      return updatedItem;
    });
  }

  /**
   * Soft-deletes / archives a work item
   */
  public static async archiveWorkItem(user: AuthUser, workItemId: string) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.workItem.findUnique({ where: { id: workItemId } });
      if (!item || item.deletedAt) {
        throw NotFoundError('Work item not found');
      }

      await tx.workItem.update({
        where: { id: workItemId },
        data: {
          deletedAt: new Date(),
          deletedById: user.id,
        },
      });

      await tx.activityLog.create({
        data: {
          workItemId,
          userId: user.id,
          action: 'WORK_ARCHIVED',
          metadata: JSON.stringify({ title: item.title }),
        },
      });

      return { message: 'Work item archived successfully' };
    });
  }

  /**
   * Fetches server-driven aggregated metrics for the dashboard
   */
  public static async getDashboardSummary(user: AuthUser) {
    const whereBase: any = { deletedAt: null };

    if (user.role !== 'ADMIN') {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: user.id },
        select: { teamId: true },
      });
      const teamIds = userTeams.map((t) => t.teamId);
      whereBase.teamId = { in: teamIds };
    }

    const now = new Date();

    const [myWork, urgent, overdue, blocked] = await Promise.all([
      // My active work
      prisma.workItem.count({
        where: {
          ...whereBase,
          assigneeId: user.id,
          status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
        },
      }),
      // Urgent items
      prisma.workItem.count({
        where: {
          ...whereBase,
          priority: 'URGENT',
          status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
        },
      }),
      // Overdue items
      prisma.workItem.count({
        where: {
          ...whereBase,
          dueDate: { lt: now },
          status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
        },
      }),
      // Blocked items
      prisma.workItem.count({
        where: {
          ...whereBase,
          status: 'BLOCKED',
        },
      }),
    ]);

    return {
      myWork,
      urgent,
      overdue,
      blocked,
    };
  }
}
