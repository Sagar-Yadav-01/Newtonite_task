export type Role = 'ADMIN' | 'MEMBER';
export type WorkItemStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'RESOLVED' | 'CLOSED';
export type WorkItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
    workItems: number;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'LEAD' | 'MEMBER';
  createdAt: string;
  user?: User;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  teamId: string;
  assigneeId?: string | null;
  createdById: string;
  dueDate?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  team?: Team;
  assignee?: User | null;
  createdBy?: User;
  comments?: Comment[];
  activityLogs?: ActivityLog[];
}

export interface Comment {
  id: string;
  workItemId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ActivityLog {
  id: string;
  workItemId: string;
  userId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: string | null;
  createdAt: string;
  user?: User;
}

export interface DashboardSummary {
  myWork: number;
  urgent: number;
  overdue: number;
  blocked: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WorkItemsResponse {
  items: WorkItem[];
  pagination: Pagination;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}
