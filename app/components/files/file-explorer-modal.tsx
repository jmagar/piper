"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; // Assuming shadcn/ui dialog
import { FileExplorer } from './file-explorer';

interface FileExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelectForMention: (filePath: string) => Promise<void>;
}

export function FileExplorerModal({
  isOpen,
  onClose,
  onFileSelectForMention,
}: FileExplorerModalProps) {

  // This handler will be passed to FileExplorer's onFileSelectForMention prop.
  // When a file is "attached" from FileExplorer, it calls this,
  // which in turn calls the prop from useAgentCommand and closes the modal.
  const handleFileSelectedAndProcess = async (filePath: string) => {
    try {
      await onFileSelectForMention(filePath); // This will trigger insertMention in useAgentCommand
      onClose(); // Close the modal only after successful processing
    } catch (error) {
      console.error('Failed to process file selection:', error);
      // Keep modal open on error so user can try again
      // Error feedback is handled by the async callback itself
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Select a File or Folder to Mention</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-auto p-6 pt-2"> {/* Added padding here, removed from DialogContent */}
          <FileExplorer onFileSelectForMention={handleFileSelectedAndProcess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
