import { prisma } from '../utils/prisma';
import { ForbiddenError } from '../utils/errors';
import { AuthUser } from './auth';

export async function isUserInTeam(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
  });
  return !!membership;
}

export async function requireTeamMemberOrAdmin(user: AuthUser, teamId: string): Promise<void> {
  if (user.role === 'ADMIN') return;
  const inTeam = await isUserInTeam(user.id, teamId);
  if (!inTeam) {
    throw ForbiddenError("You don't have permission to perform this action for this team.");
  }
}

export async function requireAdmin(user: AuthUser): Promise<void> {
  if (user.role !== 'ADMIN') {
    throw ForbiddenError('Admin access required for this operation.');
  }
}

export async function authorizeWorkItemAccess(user: AuthUser, workItemId: string): Promise<{ teamId: string }> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    select: { teamId: true, deletedAt: true },
  });

  if (!workItem || workItem.deletedAt) {
    throw ForbiddenError('Work item does not exist or has been deleted.');
  }

  if (user.role === 'ADMIN') {
    return { teamId: workItem.teamId };
  }

  const inTeam = await isUserInTeam(user.id, workItem.teamId);
  if (!inTeam) {
    throw ForbiddenError("You don't have permission to perform this action.");
  }

  return { teamId: workItem.teamId };
}
