/**
 * File Type Definitions and Syntax Highlighting Support
 * 
 * This file provides utilities for handling different file types in the editor,
 * including syntax highlighting and file type detection.
 */

import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { json5 } from './extensions/json5-lang';
import { Extension } from '@codemirror/state';

/**
 * Interface for defining file types supported by the editor
 */
export interface FileType {
  /** Unique identifier for the file type */
  id: string;
  
  /** Human-readable name of the file type */
  name: string;
  
  /** File extensions associated with this type (without dot) */
  extensions: string[];
  
  /** MIME type for content */
  mimeType: string;
  
  /** Function to get language extension for syntax highlighting */
  getLanguage: () => Promise<Extension>;
  
  /** Icon identifier for display in the UI */
  icon: string;
  
  /** Default file extension when creating new files (with dot) */
  defaultExtension: string;
}

/**
 * Markdown file type definition
 */
export const markdownType: FileType = {
  id: 'markdown',
  name: 'Markdown',
  extensions: ['md', 'markdown', 'mdown', 'mkdn'],
  mimeType: 'text/markdown',
  getLanguage: async () => markdown(),
  icon: 'file-text',
  defaultExtension: '.md',
};

/**
 * JavaScript file type definition
 */
export const javascriptType: FileType = {
  id: 'javascript',
  name: 'JavaScript',
  extensions: ['js', 'mjs', 'cjs'],
  mimeType: 'application/javascript',
  getLanguage: async () => javascript({ jsx: false, typescript: false }),
  icon: 'file-code',
  defaultExtension: '.js',
};

/**
 * TypeScript file type definition
 */
export const typescriptType: FileType = {
  id: 'typescript',
  name: 'TypeScript',
  extensions: ['ts', 'tsx'],
  mimeType: 'application/typescript',
  getLanguage: async () => javascript({ jsx: true, typescript: true }),
  icon: 'file-code',
  defaultExtension: '.ts',
};

/**
 * JSON file type definition
 */
export const jsonType: FileType = {
  id: 'json',
  name: 'JSON',
  extensions: ['json'],
  mimeType: 'application/json',
  getLanguage: async () => json(),
  icon: 'brackets',
  defaultExtension: '.json',
};

/**
 * JSON5 file type definition
 */
export const json5Type: FileType = {
  id: 'json5',
  name: 'JSON5',
  extensions: ['json5'],
  mimeType: 'application/json5',
  getLanguage: async () => {
    // Use our custom JSON5 language extension for better syntax highlighting
    return json5();
  },
  icon: 'brackets',
  defaultExtension: '.json5',
};

/**
 * YAML file type definition
 */
export const yamlType: FileType = {
  id: 'yaml',
  name: 'YAML',
  extensions: ['yml', 'yaml'],
  mimeType: 'application/yaml',
  getLanguage: async () => yaml(),
  icon: 'file-code',
  defaultExtension: '.yml',
};

/**
 * Plain text file type definition
 */
export const plainTextType: FileType = {
  id: 'plaintext',
  name: 'Plain Text',
  extensions: ['txt', 'text'],
  mimeType: 'text/plain',
  getLanguage: async () => [] as any, // No specific language syntax
  icon: 'file',
  defaultExtension: '.txt',
};

/**
 * Map of all supported file types
 */
export const fileTypes: Record<string, FileType> = {
  [markdownType.id]: markdownType,
  [javascriptType.id]: javascriptType,
  [typescriptType.id]: typescriptType,
  [jsonType.id]: jsonType,
  [json5Type.id]: json5Type,
  [yamlType.id]: yamlType,
  [plainTextType.id]: plainTextType,
};

/**
 * Gets the appropriate file type based on filename or extension
 * @param filename The filename or file path to detect the type from
 * @returns The detected FileType or plainTextType as fallback
 */
export function getFileTypeFromFilename(filename: string): FileType {
  if (!filename) return plainTextType;
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  for (const type of Object.values(fileTypes)) {
    if (type.extensions.includes(extension)) {
      return type;
    }
  }
  
  return plainTextType;
}

/**
 * Gets a FileType by its ID
 * @param typeId The file type ID
 * @returns The FileType or plainTextType as fallback
 */
export function getFileTypeById(typeId: string): FileType {
  return fileTypes[typeId] || plainTextType;
}

/**
 * List of all file types for selection UI
 */
export const fileTypesList = Object.values(fileTypes); 