import { prisma } from '../utils/prisma';
import { ConflictError, NotFoundError, BadRequestError } from '../utils/errors';

export class TeamService {
  static async createTeam(data: { name: string; description?: string }, creatorId?: string) {
    const existing = await prisma.team.findUnique({
      where: { name: data.name.trim() },
    });

    if (existing) {
      throw ConflictError('Team with this name already exists');
    }

    const team = await prisma.team.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
      },
    });

    // If a creatorId is passed, add them as team lead
    if (creatorId) {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: creatorId,
          role: 'LEAD',
        },
      });
    }

    return team;
  }

  static async getAllTeams() {
    return prisma.team.findMany({
      include: {
        _count: {
          select: { members: true, workItems: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getTeamById(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: { workItems: true },
        },
      },
    });

    if (!team) {
      throw NotFoundError('Team not found');
    }

    return team;
  }

  static async updateTeam(teamId: string, data: { name?: string; description?: string }) {
    if (data.name) {
      const existing = await prisma.team.findFirst({
        where: { name: data.name.trim(), NOT: { id: teamId } },
      });
      if (existing) {
        throw ConflictError('Another team already uses this name');
      }
    }

    return prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
      },
    });
  }

  static async addMember(teamId: string, userId: string, role = 'MEMBER') {
    // Check team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw NotFoundError('Team not found');

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw NotFoundError('User not found');

    // Check membership
    const existing = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (existing) {
      throw ConflictError('User is already a member of this team');
    }

    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  static async removeMember(teamId: string, userId: string) {
    const existing = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!existing) {
      throw NotFoundError('User is not a member of this team');
    }

    await prisma.teamMember.delete({
      where: {
        id: existing.id,
      },
    });

    return { message: 'Member removed successfully' };
  }

  static async getTeamMembers(teamId: string) {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return members;
  }
}
