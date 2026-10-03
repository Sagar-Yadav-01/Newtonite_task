import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardSummary, WorkItem } from '../types';
import { StatusBadge, PriorityBadge } from '../components/Badge';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, Plus, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Fetch server-driven summary counters
  const { data: summary, isLoading: isSummaryLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  // 2. Fetch "Needs Attention" items (Urgent or Blocked)
  const { data: urgentOrBlocked, isLoading: isAttentionLoading } = useQuery<{ items: WorkItem[] }>({
    queryKey: ['dashboard-attention'],
    queryFn: async () => {
      const res = await api.get('/work-items?pageSize=5&sortBy=updatedAt&sortOrder=desc');
      return res.data;
    },
  });

  // 3. Fetch "My Work" items assigned to current user
  const { data: myWorkItems, isLoading: isMyWorkLoading } = useQuery<{ items: WorkItem[] }>({
    queryKey: ['dashboard-my-work'],
    queryFn: async () => {
      const res = await api.get('/work-items?filterType=myWork&pageSize=5&sortBy=updatedAt&sortOrder=desc');
      return res.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Good day, {user?.name.split(' ')[0]}.
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">Here is what requires your operational attention.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/work-items"
            className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Work Item
          </Link>
        </div>
      </div>

      {/* Operational Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/work-items?filterType=myWork')}
          className="bg-white border border-neutral-200 rounded-lg p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>My Active Work</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-bold text-neutral-900">
              {isSummaryLoading ? '...' : summary?.myWork || 0}
            </span>
            <span className="ml-2 text-xs text-neutral-500">items</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/work-items?priority=URGENT')}
          className="bg-white border border-neutral-200 rounded-lg p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Urgent Operational</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-bold text-neutral-900">
              {isSummaryLoading ? '...' : summary?.urgent || 0}
            </span>
            <span className="ml-2 text-xs text-neutral-500">high priority</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/work-items?status=OPEN')}
          className="bg-white border border-neutral-200 rounded-lg p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Overdue Work</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-bold text-neutral-900">
              {isSummaryLoading ? '...' : summary?.overdue || 0}
            </span>
            <span className="ml-2 text-xs text-neutral-500">past due date</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/work-items?status=BLOCKED')}
          className="bg-white border border-neutral-200 rounded-lg p-4 cursor-pointer hover:border-neutral-300 transition-colors shadow-2xs"
        >
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Blocked Items</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-bold text-neutral-900">
              {isSummaryLoading ? '...' : summary?.blocked || 0}
            </span>
            <span className="ml-2 text-xs text-neutral-500">waiting</span>
          </div>
        </div>
      </div>

      {/* Section 1: Needs Attention */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Needs Attention</h2>
            <p className="text-xs text-neutral-500">Recent operational items requiring investigation or action</p>
          </div>
          <Link
            to="/work-items"
            className="text-xs font-medium text-neutral-700 hover:text-neutral-900 inline-flex items-center"
          >
            View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-100">
          {isAttentionLoading ? (
            <div className="p-6 text-center text-xs text-neutral-400">Loading operational items...</div>
          ) : !urgentOrBlocked?.items || urgentOrBlocked.items.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No active operational items requiring urgent attention.
            </div>
          ) : (
            urgentOrBlocked.items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/work-items/${item.id}`)}
                className="px-6 py-3.5 hover:bg-neutral-50/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <PriorityBadge priority={item.priority} />
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-medium text-neutral-900 truncate max-w-xs sm:max-w-md">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-neutral-500">
                  <span>{item.team?.name || 'Unassigned Team'}</span>
                  <span className="hidden sm:inline">
                    {item.assignee ? item.assignee.name : 'Unassigned'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: My Active Work Items */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">My Active Work</h2>
            <p className="text-xs text-neutral-500">Operational tasks assigned directly to you</p>
          </div>
          <Link
            to="/work-items?filterType=myWork"
            className="text-xs font-medium text-neutral-700 hover:text-neutral-900 inline-flex items-center"
          >
            View my work <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-neutral-100">
          {isMyWorkLoading ? (
            <div className="p-6 text-center text-xs text-neutral-400">Loading assigned tasks...</div>
          ) : !myWorkItems?.items || myWorkItems.items.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              You currently have no active work items assigned.
            </div>
          ) : (
            myWorkItems.items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/work-items/${item.id}`)}
                className="px-6 py-3.5 hover:bg-neutral-50/80 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-medium text-neutral-900 truncate max-w-xs sm:max-w-md">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-neutral-500">
                  <PriorityBadge priority={item.priority} />
                  <span>{item.team?.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
