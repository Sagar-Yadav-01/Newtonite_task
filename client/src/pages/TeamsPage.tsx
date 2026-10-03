import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Team, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Users, Plus, Shield, UserPlus, AlertCircle } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Teams
  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api.get('/teams');
      return res.data;
    },
  });

  // Fetch All Users (for adding member)
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Create Team Mutation
  const createTeamMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      setErrorMsg(null);
      const res = await api.post('/teams', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateTeamOpen(false);
      setTeamName('');
      setTeamDesc('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create team');
    },
  });

  // Add Member Mutation
  const addMemberMutation = useMutation({
    mutationFn: async (payload: { teamId: string; userId: string }) => {
      setErrorMsg(null);
      const res = await api.post(`/teams/${payload.teamId}/members`, { userId: payload.userId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsAddMemberOpen(false);
      setSelectedUserId('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to add team member');
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Teams & Members</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Operational teams and resource membership control</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-md hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Team
          </button>
        )}
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-xs text-neutral-400">Loading operational teams...</div>
        ) : !teams || teams.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-neutral-500">No teams found.</div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">{team.name}</h3>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{team.description || 'No description provided.'}</p>
                </div>
                <div className="p-2 bg-neutral-100 rounded text-neutral-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className="text-neutral-500">{team._count?.workItems || 0} active work items</span>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      if (users && users.length > 0) setSelectedUserId(users[0].id);
                      setIsAddMemberOpen(true);
                    }}
                    className="inline-flex items-center font-medium text-neutral-900 hover:underline"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Member
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={isCreateTeamOpen} onClose={() => setIsCreateTeamOpen(false)} title="Create New Operational Team">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTeamMutation.mutate({ name: teamName, description: teamDesc });
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Team Name</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Infrastructure Engineering"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              placeholder="Operational responsibilities..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsCreateTeamOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTeamMutation.isPending}
              className="px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {createTeamMutation.isPending ? 'Creating Team...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title={`Add Member to ${selectedTeam?.name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedTeam && selectedUserId) {
              addMemberMutation.mutate({ teamId: selectedTeam.id, userId: selectedUserId });
            }
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Select User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-xs bg-white"
            >
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsAddMemberOpen(false)}
              className="px-4 py-2 border border-neutral-300 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="px-4 py-2 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {addMemberMutation.isPending ? 'Adding Member...' : 'Add Team Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
