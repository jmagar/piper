import { ExtendedChatMessage } from '@/types/chat';
import { nanoid } from 'nanoid';

// Define role and status types locally since they're not exported from @/types/chat
type MessageRole = 'user' | 'assistant' | 'system';
type MessageStatus = 'sending' | 'streaming' | 'sent' | 'delivered' | 'error';

/**
 * Message validation result
 */
export interface MessageValidationResult {
  /** Whether the message is valid */
  isValid: boolean;
  /** Issues found with the message */
  issues: string[];
  /** Whether the issue is critical (fatal) or can be repaired */
  isCritical: boolean;
  /** Repaired message (if possible to repair) */
  repairedMessage?: ExtendedChatMessage;
}

/**
 * Validates a chat message structure
 * @param message The message to validate
 * @param repairIfPossible Whether to attempt repairs on invalid messages
 * @returns Validation result with potential repairs
 */
export function validateMessage(
  message: any,
  repairIfPossible = true
): MessageValidationResult {
  // Start with a clean result
  const result: MessageValidationResult = {
    isValid: true,
    issues: [],
    isCritical: false,
  };
  
  // If message is null or not an object, it's a critical issue
  if (!message || typeof message !== 'object') {
    return {
      isValid: false,
      issues: ['Message is null or not an object'],
      isCritical: true,
    };
  }
  
  // Check for required properties
  const requiredProps = ['id', 'role', 'content'];
  for (const prop of requiredProps) {
    if (!message[prop] && message[prop] !== '') {
      result.isValid = false;
      result.issues.push(`Missing required property: ${prop}`);
      
      // Missing id is critical, other props can be repaired
      if (prop === 'id') {
        result.isCritical = true;
      }
    }
  }
  
  // Validate role
  const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
  if (message.role && !validRoles.includes(message.role as MessageRole)) {
    result.isValid = false;
    result.issues.push(`Invalid role: ${message.role}`);
  }
  
  // Validate status
  const validStatuses: MessageStatus[] = ['sending', 'streaming', 'sent', 'delivered', 'error'];
  if (message.status && !validStatuses.includes(message.status as MessageStatus)) {
    result.isValid = false;
    result.issues.push(`Invalid status: ${message.status}`);
  }
  
  // Validate timestamps
  if (message.timestamp && !isValidTimestamp(message.timestamp)) {
    result.isValid = false;
    result.issues.push(`Invalid timestamp: ${message.timestamp}`);
  }
  
  // Validate metadata is an object
  if (message.metadata && typeof message.metadata !== 'object') {
    result.isValid = false;
    result.issues.push('Metadata must be an object');
  }
  
  // Repair message if needed
  if (!result.isValid && repairIfPossible && !result.isCritical) {
    result.repairedMessage = repairMessage(message, result.issues);
  }
  
  return result;
}

/**
 * Repairs an invalid message
 * @param message Original message with issues
 * @param issues List of detected issues
 * @returns Repaired message with defaults for missing/invalid properties
 */
function repairMessage(message: any, issues: string[]): ExtendedChatMessage {
  const now = new Date().toISOString();
  
  // First ensure we have all the required fields
  const repaired: ExtendedChatMessage = {
    // Start with existing properties (will be overwritten by explicit fields below for required props)
    ...message,
    // Required properties
    id: message.id || nanoid(),
    role: isValidRole(message.role) ? message.role : 'assistant',
    content: message.content ?? '',
    createdAt: message.createdAt || now,
    type: message.type || 'text',
    status: isValidStatus(message.status) ? message.status : 'delivered',
    metadata: {
      ...(message.metadata || {}),
      repaired: true,
      repairedAt: now
    }
  };
  
  // Ensure all other properties are set
  if (!repaired.createdAt) repaired.createdAt = now;
  if (!repaired.type) repaired.type = 'text';
  if (!repaired.status) repaired.status = 'delivered';
  if (!repaired.metadata) repaired.metadata = { repaired: true, repairedAt: now };
  
  return repaired;
}

/**
 * Validate if a string is a valid role
 */
function isValidRole(role: string): boolean {
  const validRoles: MessageRole[] = ['user', 'assistant', 'system'];
  return validRoles.includes(role as MessageRole);
}

/**
 * Validate if a string is a valid status
 */
function isValidStatus(status: string): boolean {
  const validStatuses: MessageStatus[] = ['sending', 'streaming', 'sent', 'delivered', 'error'];
  return validStatuses.includes(status as MessageStatus);
}

/**
 * Validate if a string is a valid ISO timestamp
 */
function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') return false;
  
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Compares messages between UI and server to find mismatches
 * @param uiMessages Messages from the UI state
 * @param serverMessages Messages from the server
 * @returns Analysis of mismatches and recommendations
 */
export function compareMessageSets(
  uiMessages: ExtendedChatMessage[],
  serverMessages: any[]
): {
  missingInUi: any[];
  missingOnServer: ExtendedChatMessage[];
  contentMismatches: Array<{ uiMessage: ExtendedChatMessage; serverMessage: any }>;
  summary: string;
} {
  // Convert to maps for easier comparison
  const uiMessagesMap = new Map(uiMessages.map(m => [m.id, m]));
  const serverMessagesMap = new Map(serverMessages.map(m => [m.id, m]));
  
  // Find messages missing in UI
  const missingInUi = serverMessages.filter(m => !uiMessagesMap.has(m.id));
  
  // Find messages missing on server
  const missingOnServer = uiMessages.filter(m => !serverMessagesMap.has(m.id));
  
  // Find content mismatches
  const contentMismatches: Array<{ uiMessage: ExtendedChatMessage; serverMessage: any }> = [];
  
  uiMessages.forEach(uiMessage => {
    const serverMessage = serverMessagesMap.get(uiMessage.id);
    if (serverMessage && serverMessage.content !== uiMessage.content) {
      contentMismatches.push({ uiMessage, serverMessage });
    }
  });
  
  // Create summary
  let summary = 'Message comparison complete. ';
  
  if (missingInUi.length === 0 && missingOnServer.length === 0 && contentMismatches.length === 0) {
    summary += 'All messages are in sync.';
  } else {
    summary += `Found ${missingInUi.length} messages missing in UI, `;
    summary += `${missingOnServer.length} missing on server, and `;
    summary += `${contentMismatches.length} content mismatches.`;
  }
  
  return {
    missingInUi,
    missingOnServer,
    contentMismatches,
    summary
  };
}

/**
 * Creates a repaired message set by merging UI and server messages
 * @param uiMessages Messages from the UI state
 * @param serverMessages Messages from the server
 * @returns Repaired message set with proper ordering
 */
export function createRepairedMessageSet(
  uiMessages: ExtendedChatMessage[],
  serverMessages: any[]
): ExtendedChatMessage[] {
  const comparison = compareMessageSets(uiMessages, serverMessages);
  
  // Start with UI messages
  const repairedSet = [...uiMessages];
  const existingIds = new Set(uiMessages.map(m => m.id));
  
  // Add messages missing in UI
  comparison.missingInUi.forEach(serverMessage => {
    // Convert server message format to UI format
    const missingMessage: ExtendedChatMessage = {
      id: serverMessage.id || nanoid(), // Ensure ID exists
      role: serverMessage.role || 'assistant',
      content: serverMessage.content || '',
      type: 'text', // Use default type
      status: 'delivered', // Use delivered instead of complete
      createdAt: serverMessage.created_at || new Date().toISOString(),
      conversationId: serverMessage.conversation_id,
      metadata: {
        timestamp: serverMessage.created_at || new Date().toISOString(), 
        threadId: serverMessage.thread_id,
        restoredFromServer: true,
        restoredAt: new Date().toISOString()
      }
    };
    
    repairedSet.push(missingMessage);
    existingIds.add(missingMessage.id);
  });
  
  // Fix content mismatches by preferring server version
  comparison.contentMismatches.forEach(({ uiMessage, serverMessage }) => {
    const messageIndex = repairedSet.findIndex(m => m.id === uiMessage.id);
    if (messageIndex !== -1 && repairedSet[messageIndex]) {
      const existingMetadata = repairedSet[messageIndex]?.metadata || {};
      
      repairedSet[messageIndex] = {
        ...repairedSet[messageIndex],
        content: serverMessage.content || '',
        type: repairedSet[messageIndex].type || 'text', // Ensure required type
        status: repairedSet[messageIndex].status || 'delivered', // Ensure required status
        createdAt: repairedSet[messageIndex].createdAt || new Date().toISOString(), // Ensure required createdAt
        metadata: {
          ...existingMetadata,
          contentRepaired: true,
          previousContent: uiMessage.content,
          repairedAt: new Date().toISOString()
        }
      };
    }
  });
  
  // Sort by timestamp
  return repairedSet.sort((a, b) => {
    const timeA = new Date(a.metadata?.timestamp || a.createdAt).getTime();
    const timeB = new Date(b.metadata?.timestamp || b.createdAt).getTime();
    return timeA - timeB;
  });
} 