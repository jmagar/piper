'use client';

import React, { useState } from 'react';
import { useServerActions } from '../hooks/useServerActions';
import { Loader2, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MCPServerConfigFromUI } from '../utils/serverTypes';

export interface DeleteServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (serverId: string) => void;
  serverToDelete: MCPServerConfigFromUI | null;
}

export function DeleteServerModal({ isOpen, onClose, onConfirm, serverToDelete }: DeleteServerModalProps) {
  const actions = useServerActions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !serverToDelete) {
    return null;
  }

  const handleConfirm = async () => {
    if (!serverToDelete) return;
    setIsDeleting(true);
    setError(null);

    const result = await actions.deleteServer(serverToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      onConfirm(serverToDelete.id);
      onClose();
    } else {
      setError(result.error || 'Failed to delete server. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete MCP Server</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the server &quot;<strong>{serverToDelete.displayName || serverToDelete.name}</strong>&quot;? {serverToDelete.isEnvManaged ? <span className='block text-sm text-yellow-600 mt-2'>This server is managed by environment variables and cannot be deleted through this UI.</span> : ''}
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-red-500 px-1 py-2 text-center bg-red-50 border border-red-200 rounded-md">{error}</p>
        )}
        <DialogFooter className="mt-4 sm:justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isDeleting}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isDeleting || serverToDelete?.isEnvManaged}
            title={serverToDelete?.isEnvManaged ? "Cannot delete server managed by environment variables." : "Delete this server."}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
