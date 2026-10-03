import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { WorkItem, Comment, ActivityLog, WorkItemStatus, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { ConflictModal } from '../components/ConflictModal';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  UserCheck,
  Clock,
  History,
  MessageSquare,
  Trash2,
  Edit,
  AlertCircle,
  ShieldAlert,
  Send,
} from 'lucide-react';

export const WorkItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // State for Conflict Modal (409)
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');

  // State for Edit Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('');

  // State for Comment Form
  const [commentText, setCommentText] = useState('');

  // General Error State
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Work Item Details
  const {
    data: item,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<WorkItem>({
    queryKey: ['work-item', id],
    queryFn: async () => {
      const res = await api.get(`/work-items/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // 2. Fetch Users for assignment
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Handle errors (especially 409 Conflict)
  const handleError = (err: any) => {
    if (err.code === 'VERSION_CONFLICT' || err.status === 409) {
      setConflictMessage(err.message || 'This work item was modified by another user.');
      setIsConflictOpen(true);
    } else {
      setActionError(err.message || 'An error occurred while executing the operation.');
    }
  };

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: WorkItemStatus) => {
      setActionError(null);
      const res = await api.patch(`/work-items/${id}/status`, {
        status: newStatus,
        version: item!.version,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: handleError,
  });

  // Assignment mutation
  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      setActionError(null);
      const res = await api.post(`/work-items/${id}/assign`, {
        assigneeId,
        version: item!.version,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: handleError,
  });

  // Edit item mutation
  const editMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string }) => {
      setActionError(null);
      const res = await api.patch(`/work-items/${id}`, {
        ...payload,
        version: item!.version,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', id] });
      setIsEditOpen(false);
    },
    onError: handleError,
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      setActionError(null);
      const res = await api.delete(`/work-items/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      navigate('/work-items');
    },
    onError: handleError,
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/work-items/${id}/comments`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item', id] });
      setCommentText('');
    },
    onError: handleError,
  });

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-neutral-400">Loading work item details...</div>;
  }

  if (isError || !item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {(error as any)?.message || 'Work item not found or you do not have permission to access it.'}
        </div>
        <Link to="/work-items" className="inline-flex items-center text-xs font-medium text-neutral-900 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Work Items
        </Link>
      </div>
    );
  }

  // Calculate allowed workflow status transitions for current item status
  const allowedStatusMap: Record<WorkItemStatus, WorkItemStatus[]> = {
    OPEN: ['IN_PROGRESS'],
    IN_PROGRESS: ['BLOCKED', 'RESOLVED', 'OPEN'],
    BLOCKED: ['IN_PROGRESS'],
    RESOLVED: ['CLOSED', 'IN_PROGRESS'],
    CLOSED: [],
  };
  const availableStatuses = allowedStatusMap[item.status] || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link to="/work-items" className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Work Items
        </Link>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Main Header Container */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
              <span className="text-xs font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                v{item.version}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">{item.title}</h1>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Assign to me / Unassign */}
            {item.assigneeId !== currentUser?.id ? (
              <button
                onClick={() => assignMutation.mutate(currentUser!.id)}
                disabled={assignMutation.isPending}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                Assign to me
              </button>
            ) : (
              <button
                onClick={() => assignMutation.mutate(null)}
                disabled={assignMutation.isPending}
                className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Unassign me
              </button>
            )}

            {/* Edit modal trigger */}
            <button
              onClick={() => {
                setEditTitle(item.title);
                setEditDesc(item.description);
                setEditPriority(item.priority);
                setIsEditOpen(true);
              }}
              className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-50 inline-flex items-center"
            >
              <Edit className="w-3.5 h-3.5 mr-1 text-neutral-500" /> Edit
            </button>

            {/* Archive button */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to archive this operational work item?')) {
                  archiveMutation.mutate();
                }
              }}
              className="px-3 py-1.5 border border-red-200 rounded text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Archive
            </button>
          </div>
        </div>

        {/* Workflow Status Quick Actions */}
        {availableStatuses.length > 0 && (
          <div className="pt-3 border-t border-neutral-100 flex items-center space-x-2 text-xs">
            <span className="font-medium text-neutral-500">Advance Workflow:</span>
            {availableStatuses.map((st) => (
              <button
                key={st}
                onClick={() => statusMutation.mutate(st)}
                disabled={statusMutation.isPending}
                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded text-xs transition-colors"
              >
                → Move to {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100 text-xs">
          <div>
            <span className="block text-neutral-400 font-medium">Team</span>
            <span className="font-semibold text-neutral-800">{item.team?.name}</span>
          </div>
          <div>
            <span className="block text-neutral-400 font-medium">Current Assignee</span>
            <span className="font-semibold text-neutral-800">{item.assignee ? item.assignee.name : 'Unassigned'}</span>
          </div>
          <div>
            <span className="block text-neutral-400 font-medium">Created By</span>
            <span className="font-semibold text-neutral-800">{item.createdBy?.name}</span>
          </div>
          <div>
            <span className="block text-neutral-400 font-medium">Last Updated</span>
            <span className="font-semibold text-neutral-800">{new Date(item.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Description & Context</h3>
        <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">{item.description}</p>
      </div>

      {/* Comments Section */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs space-y-6">
        <div className="flex items-center space-x-2 border-b border-neutral-200 pb-3">
          <MessageSquare className="w-4 h-4 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-900">
            Comments ({item.comments?.length || 0})
          </h3>
        </div>

        {/* Add Comment Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (commentText.trim()) commentMutation.mutate(commentText);
          }}
          className="space-y-3"
        >
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add operational notes or investigation updates..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commentMutation.isPending || !commentText.trim()}
              className="inline-flex items-center px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Post Comment
            </button>
          </div>
        </form>

        {/* Comment Thread */}
        <div className="space-y-4">
          {!item.comments || item.comments.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No comments posted yet.</p>
          ) : (
            item.comments.map((c) => (
              <div key={c.id} className="p-3.5 bg-neutral-50/80 rounded-md border border-neutral-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-900">{c.user?.name}</span>
                  <span className="text-neutral-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-neutral-800 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity History Timeline */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-200 pb-3">
          <History className="w-4 h-4 text-neutral-600" />
          <h3 className="text-sm font-semibold text-neutral-900">Activity History</h3>
        </div>

        <div className="space-y-3">
          {!item.activityLogs || item.activityLogs.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No activity recorded.</p>
          ) : (
            item.activityLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-neutral-900">{log.user?.name || 'System'}</span>{' '}
                  <span className="text-neutral-600">
                    {log.action === 'STATUS_CHANGED' && `changed status from ${log.oldValue} to ${log.newValue}`}
                    {log.action === 'ASSIGNED' && `assigned work item to ${log.newValue}`}
                    {log.action === 'UNASSIGNED' && `unassigned work item`}
                    {log.action === 'REASSIGNED' && `reassigned work item to ${log.newValue}`}
                    {log.action === 'PRIORITY_CHANGED' && `changed priority to ${log.newValue}`}
                    {log.action === 'WORK_CREATED' && `created this operational work item`}
                    {log.action === 'WORK_UPDATED' && `updated ${log.field}`}
                    {log.action === 'COMMENT_ADDED' && `added a comment`}
                  </span>
                  <span className="text-neutral-400 ml-2">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conflict Modal (409) */}
      <ConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onRefresh={() => refetch()}
        message={conflictMessage}
      />

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Work Item">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate({
              title: editTitle,
              description: editDesc,
              priority: editPriority,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs bg-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
