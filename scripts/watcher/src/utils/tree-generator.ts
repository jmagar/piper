import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import asciiTree from 'ascii-tree';
import config from '../config.js';
import logger from './logger.js';

/**
 * Generates an ASCII tree representation of a directory structure
 */
export class TreeGenerator {
  /**
   * Generate a tree structure for the specified directories
   * @param directories Directories to include in the tree
   * @returns An ASCII tree representation
   */
  async generateTree(directories: string[]): Promise<string> {
    try {
      const treeItems: Map<string, boolean> = new Map();
      
      for (const dir of directories) {
        // Add the root directory
        const normalizedDir = path.normalize(dir);
        treeItems.set(normalizedDir, true);
        
        // Find all files and directories
        const pattern = path.join(normalizedDir, '**', '*');
        const ignorePattern = config.ignorePatterns.map(p => `**/${p}/**`);
        
        const items = await glob(pattern, {
          ignore: ignorePattern,
          dot: false // Don't include hidden files
        });
        
        // Add each item to the tree
        for (const item of items) {
          try {
            const stats = await fs.stat(item);
            // Mark directories with a trailing slash
            treeItems.set(item, stats.isDirectory());
          } catch (err) {
            // Skip items that we can't stat
            logger.debug(`Skipping item in tree: ${item}`);
          }
        }
      }
      
      // Build the tree structure
      const treeData = await this.buildTreeData(treeItems);
      return asciiTree.generate(treeData);
    } catch (error) {
      logger.error('Error generating directory tree:', error);
      return 'Error generating directory tree';
    }
  }
  
  /**
   * Convert a flat list of paths into a nested tree structure for ascii-tree
   */
  private async buildTreeData(items: Map<string, boolean>): Promise<string> {
    // Sort items by path
    const sortedPaths = Array.from(items.entries())
      .sort(([pathA], [pathB]) => pathA.localeCompare(pathB));
    
    // Build the tree structure as a string
    let result = '';
    
    // Group by root directory
    const rootDirs = new Set<string>();
    for (const [itemPath] of sortedPaths) {
      const parts = itemPath.split(path.sep);
      rootDirs.add(parts[0] || '.');
    }
    
    for (const rootDir of rootDirs) {
      result += `${rootDir}\n`;
      
      // Add the rest of the tree
      for (const [itemPath, isDir] of sortedPaths) {
        if (!itemPath.startsWith(rootDir)) continue;
        
        if (itemPath === rootDir) continue; // Skip the root dir itself
        
        // Calculate the relative path and depth
        const relPath = itemPath.slice(rootDir.length + 1);
        if (!relPath) continue;
        
        const parts = relPath.split(path.sep);
        const indent = '#'.repeat(parts.length);
        const basename = parts[parts.length - 1];
        
        // Add a suffix for directories
        const displayName = isDir ? `${basename}/` : basename;
        
        result += `${indent} ${displayName}\n`;
      }
    }
    
    return result;
  }
}

export const treeGenerator = new TreeGenerator();
export default treeGenerator;