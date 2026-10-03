import { prisma } from '../utils/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';

export class CommentService {
  public static async addComment(user: AuthUser, workItemId: string, content: string) {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem || workItem.deletedAt) {
      throw NotFoundError('Work item not found');
    }

    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          workItemId,
          userId: user.id,
          content: content.trim(),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          workItemId,
          userId: user.id,
          action: 'COMMENT_ADDED',
          metadata: JSON.stringify({ commentId: comment.id, snippet: content.slice(0, 50) }),
        },
      });

      return comment;
    });
  }

  public static async getComments(workItemId: string) {
    const comments = await prisma.comment.findMany({
      where: { workItemId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return comments;
  }

  public static async updateComment(user: AuthUser, commentId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw NotFoundError('Comment not found');

    if (user.role !== 'ADMIN' && comment.userId !== user.id) {
      throw ForbiddenError('You can only edit your own comments');
    }

    return prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  public static async deleteComment(user: AuthUser, commentId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw NotFoundError('Comment not found');

    if (user.role !== 'ADMIN' && comment.userId !== user.id) {
      throw ForbiddenError('You can only delete your own comments');
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }
}
