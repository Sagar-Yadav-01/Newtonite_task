import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { WorkItem, WorkItemsResponse, Team, User } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export const WorkItemsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter & Pagination parameters
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const teamId = searchParams.get('teamId') || '';
  const filterType = searchParams.get('filterType') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [createError, setCreateError] = useState<string | null>(null);

  // 1. Fetch Work Items
  const { data, isLoading, isError, error } = useQuery<WorkItemsResponse>({
    queryKey: ['work-items', { page, search, status, priority, teamId, filterType, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '15');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (teamId) params.set('teamId', teamId);
      if (filterType) params.set('filterType', filterType);
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);

      const res = await api.get(`/work-items?${params.toString()}`);
      return res.data;
    },
  });

  // 2. Fetch Teams for Filter dropdown and Create modal
  const { data: teams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get('/teams');
      return res.data;
    },
  });

  // 3. Create Work Item Mutation (with Idempotency Key protection)
  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; teamId: string; priority: string }) => {
      const idempotencyKey = `key_create_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const res = await api.post('/work-items', payload, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setCreateError(null);
      navigate(`/work-items/${data.id}`);
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create work item');
    },
  });

  const updateParam = (key: string, val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamId) {
      setCreateError('Please select a team.');
      return;
    }
    createMutation.mutate({
      title: newTitle,
      description: newDesc,
      teamId: newTeamId,
      priority: newPriority,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Work Items</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Centralized operational tasks and issue tracking</p>
        </div>
        <button
          onClick={() => {
            if (teams && teams.length > 0 && !newTeamId) setNewTeamId(teams[0].id);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Work Item
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => updateParam('search', e.target.value)}
              placeholder="Search by title or description..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => updateParam('filterType', e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 bg-white"
            >
              <option value="">All Ownership</option>
              <option value="myWork">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
            </select>

            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              value={priority}
              onChange={(e) => updateParam('priority', e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={teamId}
              onChange={(e) => updateParam('teamId', e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 bg-white"
            >
              <option value="">All Teams</option>
              {teams?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Work Items Table / Card Container */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400">Loading work items...</div>
        ) : isError ? (
          <div className="p-12 text-center text-xs text-red-600">
            {(error as any)?.message || 'Failed to load work items from server.'}
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-neutral-800">No work items found.</p>
            <p className="text-xs text-neutral-500">
              Try adjusting your search criteria, clearing active filters, or creating a new work item.
            </p>
            <button
              onClick={() => {
                setSearchParams({});
              }}
              className="px-3 py-1.5 border border-neutral-300 rounded text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-700 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-6 py-3 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/work-items/${item.id}`)}
                      className="hover:bg-neutral-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-3.5 font-medium text-neutral-900 max-w-sm truncate">
                        {item.title}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-neutral-700">
                        {item.team?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600">
                        {item.assignee ? item.assignee.name : <span className="text-neutral-400 italic">Unassigned</span>}
                      </td>
                      <td className="px-6 py-3.5 text-right text-neutral-400">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-neutral-100">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/work-items/${item.id}`)}
                  className="p-4 space-y-2 hover:bg-neutral-50 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 leading-snug">{item.title}</h3>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={item.status} />
                    <span className="text-xs text-neutral-500">• {item.team?.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>Assignee: {item.assignee ? item.assignee.name : 'Unassigned'}</span>
                    <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-3.5 bg-neutral-50/50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
              <div>
                Showing Page <span className="font-semibold text-neutral-900">{data.pagination.page}</span> of{' '}
                <span className="font-semibold text-neutral-900">{data.pagination.totalPages}</span> ({data.pagination.total} total items)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={data.pagination.page <= 1}
                  onClick={() => updateParam('page', (page - 1).toString())}
                  className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => updateParam('page', (page + 1).toString())}
                  className="p-1.5 border border-neutral-300 rounded hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Work Item Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Operational Work Item">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. EMEA Payment Gateway Timeout Investigation"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide background context, impact, and operational requirements..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Responsible Team</label>
              <select
                required
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Priority Level</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating Item...' : 'Create Work Item'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
