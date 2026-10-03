import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  message?: string;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  message = 'This work item was updated by someone else.',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Version Conflict Detected">
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Stale Version Conflict (409)</p>
            <p className="mt-1 text-xs text-amber-700">
              {message} Your pending changes were rolled back to maintain operational consistency.
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Please refresh the work item to inspect the latest server version before re-applying your modifications.
        </p>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Item
          </button>
        </div>
      </div>
    </Modal>
  );
};
