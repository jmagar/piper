"use client"

// New multi-character prefixes
const FILE_PREFIX = "@file/"

import { useCallback, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

export interface AttachedFile {
  id: string; // Unique ID, can be the full path for now
  path: string; // Path relative to UPLOADS_DIR
  name: string; // Filename extracted from the path
  rawMention: string; // The full @files/... string
}

type UseAgentCommandProps = {
  value: string;
  onValueChangeAction: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
};

export function useAgentCommand({
  onValueChangeAction,
  textareaRef,
  value, // The current input value from props
}: UseAgentCommandProps) {
  // File and URL attachment states
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  // Refs
  const mentionStartPosRef = useRef<number | null>(null)

  // Utility function to reset mention states
  const resetMentionState = useCallback(() => {
    mentionStartPosRef.current = null
  }, [])

  // Generate a unique ID for attachments
  const generateId = useCallback(() => {
    try {
      return uuidv4();
    } catch {
      return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }
  }, []);

  // File submission handler
  const handleFileSubmit = useCallback((filePath: string, rawMention: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    const newFileAttachment: AttachedFile = { 
      id: generateId(), 
      path: filePath, 
      name: fileName, 
      rawMention 
    };
    setAttachedFiles(prev => prev.find(f => f.rawMention === rawMention) ? prev : [...prev, newFileAttachment]);
    
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      const currentVal = textareaRef.current.value;
      const textBefore = currentVal.substring(0, mentionStartPosRef.current);
      const textAfter = currentVal.substring(mentionStartPosRef.current + rawMention.length + (currentVal[mentionStartPosRef.current + rawMention.length] === ' ' ? 1 : 0));
      const newValue = (textBefore + textAfter).trimStart();
      onValueChangeAction(newValue);
      if (textareaRef.current) textareaRef.current.value = newValue;
      const newCursorPos = mentionStartPosRef.current;
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
    resetMentionState();
  }, [setAttachedFiles, onValueChangeAction, textareaRef, resetMentionState, generateId]);

  // Mention insertion utility
  const insertMention = useCallback((prefixToInsert: string, slugOrName: string, textToReplaceLength: number) => {
    if (!textareaRef.current || mentionStartPosRef.current === null) return;
    const currentVal = textareaRef.current.value;
    const mentionText = `${prefixToInsert}${slugOrName} `;
    const textBeforeMention = currentVal.substring(0, mentionStartPosRef.current);
    const textAfterMention = currentVal.substring(mentionStartPosRef.current + textToReplaceLength);
    const newValue = `${textBeforeMention}${mentionText}${textAfterMention}`;
    onValueChangeAction(newValue);
    if (textareaRef.current) textareaRef.current.value = newValue;
    const newCursorPos = mentionStartPosRef.current + mentionText.length;
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
    resetMentionState();
  }, [textareaRef, onValueChangeAction, resetMentionState]);

  // File mention selection from modal
  const handleFileMentionSelectedFromModal = useCallback((filePath: string) => {
    if (textareaRef.current && mentionStartPosRef.current !== null) {
      insertMention(FILE_PREFIX, filePath, filePath.length);
    } else {
      const newText = `${value.substring(0, mentionStartPosRef.current ?? 0)}${FILE_PREFIX}${filePath} ${value.substring(textareaRef.current?.selectionEnd ?? 0)}`.trimStart();
      onValueChangeAction(newText);
    }
    resetMentionState();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [insertMention, resetMentionState, textareaRef, onValueChangeAction, value]);

  return {
    attachedFiles,
    handleFileSubmit,
    handleFileMentionSelectedFromModal,
  };
}
