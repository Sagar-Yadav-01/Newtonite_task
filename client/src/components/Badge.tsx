import React from 'react';
import { WorkItemStatus, WorkItemPriority } from '../types';

export const StatusBadge: React.FC<{ status: WorkItemStatus; className?: string }> = ({ status, className = '' }) => {
  const styles: Record<WorkItemStatus, { bg: string; text: string; label: string }> = {
    OPEN: { bg: 'bg-neutral-100 border-neutral-300', text: 'text-neutral-700', label: 'Open' },
    IN_PROGRESS: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'In Progress' },
    BLOCKED: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', label: 'Blocked' },
    RESOLVED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Resolved' },
    CLOSED: { bg: 'bg-neutral-200 border-neutral-300', text: 'text-neutral-600', label: 'Closed' },
  };

  const style = styles[status] || styles.OPEN;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style.bg} ${style.text} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
      {style.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: WorkItemPriority; className?: string }> = ({ priority, className = '' }) => {
  const styles: Record<WorkItemPriority, { bg: string; text: string; label: string }> = {
    LOW: { bg: 'bg-neutral-100 border-neutral-200', text: 'text-neutral-600', label: 'Low' },
    MEDIUM: { bg: 'bg-neutral-100 border-neutral-300', text: 'text-neutral-800', label: 'Medium' },
    HIGH: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'High' },
    URGENT: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Urgent' },
  };

  const style = styles[priority] || styles.MEDIUM;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
};
