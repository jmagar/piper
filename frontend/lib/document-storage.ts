/**
 * Document storage utility for saving markdown and code documents to Qdrant
 * This allows for semantic search and AI access to the documents
 */

export interface DocumentMetadata {
  id: string;
  title: string;
  type: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
  path?: string;
  parentId?: string;
  isFolder?: boolean;
}

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
}

export interface DocumentCreateRequest {
  title: string;
  content: string;
  type: string;
  tags?: string[];
  path?: string;
  parentId?: string;
  isFolder?: boolean;
}

export interface DocumentUpdateRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
  parentId?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    type?: string[];
    tags?: string[];
    ownerId?: string;
    path?: string;
    parentId?: string;
  };
}

export interface FileExplorerNode {
  id: string;
  title: string;
  type: string;
  isFolder: boolean;
  path: string;
  parentId?: string;
  children?: FileExplorerNode[];
  updatedAt: Date;
  tags?: string[];
}

/**
 * Saves a document to Qdrant storage
 */
export async function saveDocument(document: DocumentCreateRequest): Promise<Document> {
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save document');
  }

  return response.json();
}

/**
 * Updates an existing document in Qdrant storage
 */
export async function updateDocument(document: DocumentUpdateRequest): Promise<Document> {
  const response = await fetch(`/api/documents/${document.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update document');
  }

  return response.json();
}

/**
 * Retrieves a document from Qdrant storage by ID
 */
export async function getDocument(id: string): Promise<Document> {
  const response = await fetch(`/api/documents/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get document');
  }

  return response.json();
}

/**
 * Deletes a document from Qdrant storage
 */
export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete document');
  }
}

/**
 * Lists all documents, optionally filtered by type, tags, or path
 */
export async function listDocuments(options?: {
  type?: string;
  tags?: string[];
  path?: string;
  parentId?: string;
  isFolder?: boolean;
}): Promise<DocumentMetadata[]> {
  let url = '/api/documents';
  const params = new URLSearchParams();
  
  if (options) {
    if (options.type) params.append('type', options.type);
    if (options.tags) options.tags.forEach(tag => params.append('tags', tag));
    if (options.path) params.append('path', options.path);
    if (options.parentId) params.append('parentId', options.parentId);
    if (options.isFolder !== undefined) params.append('isFolder', options.isFolder.toString());
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list documents');
  }

  return response.json();
}

/**
 * Performs semantic search on documents
 */
export async function searchDocuments(options: SearchOptions): Promise<Document[]> {
  const response = await fetch('/api/documents/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search documents');
  }

  return response.json();
}

/**
 * Gets a file explorer tree structure
 */
export async function getFileExplorerTree(): Promise<FileExplorerNode[]> {
  const response = await fetch('/api/documents/tree');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get file explorer tree');
  }

  return response.json();
}

/**
 * Downloads a document as a file
 */
export function downloadDocument(document: Document): void {
  // Determine file extension based on document type
  let extension = '.md';
  switch (document.metadata.type) {
    case 'json':
      extension = '.json';
      break;
    case 'yaml':
    case 'yml':
      extension = '.yaml';
      break;
    case 'javascript':
    case 'js':
      extension = '.js';
      break;
    case 'typescript':
    case 'ts':
      extension = '.ts';
      break;
    case 'python':
    case 'py':
      extension = '.py';
      break;
    case 'html':
      extension = '.html';
      break;
    case 'css':
      extension = '.css';
      break;
    default:
      extension = '.md';
  }

  const filename = `${document.metadata.title}${extension}`;
  const blob = new Blob([document.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 