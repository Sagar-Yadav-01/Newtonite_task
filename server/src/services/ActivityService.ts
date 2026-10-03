import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export class ActivityService {
  public static async getActivityLogs(workItemId: string) {
    const workItem = await prisma.workItem.findUnique({ where: { id: workItemId } });
    if (!workItem) throw NotFoundError('Work item not found');

    const logs = await prisma.activityLog.findMany({
      where: { workItemId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }
}
