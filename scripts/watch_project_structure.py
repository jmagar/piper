import os
import time
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import datetime
from pathlib import Path
import fnmatch

class ProjectStructureHandler(FileSystemEventHandler):
    """
    Handler for file system events to update PROJECT-STRUCTURE.md
    """
    def __init__(self, watch_path: str, output_file: str, ignore_patterns: list[str]):
        """
        Initialize the handler with watch path and output file path
        
        Args:
            watch_path: Directory to watch for changes
            output_file: Path to the PROJECT-STRUCTURE.md file
            ignore_patterns: List of patterns to ignore (e.g., ['.git/*', '*.pyc'])
        """
        self.watch_path = Path(watch_path)
        self.output_file = Path(output_file)
        self.ignore_patterns = ignore_patterns
        super().__init__()

    def on_any_event(self, event):
        """
        Handle any file system event by updating the project structure
        
        Args:
            event: FileSystemEvent object containing event details
        """
        # Ignore the PROJECT-STRUCTURE.md file itself to avoid infinite loops
        if Path(event.src_path) == self.output_file:
            return
            
        # Wait a brief moment to ensure file operations are complete
        time.sleep(0.1)
        self.update_structure()

    def should_ignore(self, path: str) -> bool:
        """
        Check if a path should be ignored based on ignore patterns
        
        Args:
            path: Path to check
            
        Returns:
            bool: True if path should be ignored, False otherwise
        """
        for pattern in self.ignore_patterns:
            if fnmatch.fnmatch(path, pattern):
                return True
        return False

    def generate_tree(self, startpath: Path, prefix: str = '') -> str:
        """
        Generate a tree-like structure of the directory
        
        Args:
            startpath: Path to start generating tree from
            prefix: Prefix for the current line (used for recursion)
            
        Returns:
            str: Tree-like structure of the directory
        """
        tree = []
        
        try:
            for entry in sorted(startpath.iterdir()):
                relative_path = entry.relative_to(self.watch_path)
                
                if self.should_ignore(str(relative_path)):
                    continue

                if entry.is_file():
                    tree.append(f"{prefix}├── {entry.name}")
                elif entry.is_dir():
                    tree.append(f"{prefix}├── {entry.name}/")
                    tree.extend(self.generate_tree(entry, prefix + "│   "))
                    
        except PermissionError as e:
            tree.append(f"{prefix}├── Error accessing {startpath}: Permission denied")
            
        return tree

    def update_structure(self):
        """Update the PROJECT-STRUCTURE.md file with the current project structure"""
        try:
            tree = self.generate_tree(self.watch_path)
            
            content = [
                "# Project Structure",
                "",
                f"Last updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "",
                "```",
                str(self.watch_path.name) + "/",
                *tree,
                "```"
            ]
            
            self.output_file.write_text('\n'.join(content), encoding='utf-8')
            print(f"Updated {self.output_file} at {datetime.datetime.now()}")
            
        except Exception as e:
            print(f"Error updating project structure: {e}")

def load_cursor_config() -> list[str]:
    """
    Load ignore patterns from cursor configuration file
    
    Returns:
        list[str]: List of ignore patterns from cursor config
    """
    try:
        config_path = Path('.cursor/config.json')
        if not config_path.exists():
            config_path = Path('../.cursor/config.json')
        
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
                return config.get('rules', {}).get('ignore', [])
        return []
    except Exception as e:
        print(f"Error loading cursor config: {e}")
        return []

def watch_directory(path: str, cooldown: int = 60, ignore_patterns: list[str] = None):
    """
    Start watching a directory for changes
    
    Args:
        path: Directory to watch
        cooldown: Minimum time (in seconds) between updates
        ignore_patterns: List of patterns to ignore
    """
    cursor_ignore_patterns = load_cursor_config()
    
    default_patterns = [
        # Python specific
        '*.pyc',
        '__pycache__/*',
        '*.pyo',
        '*.pyd',
        '.Python',
        '.mypy_cache/*',
        '.venv/*',
        'venv/*',
        '.uv/*',
        
        # Tool specific
        '.cursor/*',
        '.repomix/*',
        '.turbo/*',
        
        # Environment and context
        '.env',
        '.env.*',
        'CONTEXT.md',
        
        # Cache and logs
        '**/*cache*/**',
        '**/*cache*',
        '**/.*cache*/**',
        '**/.*cache*',
        '*log*',
        '*.log',
        
        # IDE specific
        '.idea/*',
        '.vscode/*',
        '*.swp',
        '*.swo',
        
        # OS specific
        '.DS_Store',
        'Thumbs.db',
    ]
    
    # Combine cursor patterns with defaults and any custom patterns
    all_patterns = list(set(
        cursor_ignore_patterns +
        default_patterns +
        (ignore_patterns or [])
    ))

    watch_path = Path(path).resolve()
    output_file = watch_path / 'PROJECT-STRUCTURE.md'
    
    handler = ProjectStructureHandler(watch_path, output_file, all_patterns)
    observer = Observer()
    
    try:
        # Create initial structure
        handler.update_structure()
        
        # Start watching for changes
        observer.schedule(handler, str(watch_path), recursive=True)
        observer.start()
        
        print(f"Watching {watch_path} for changes...")
        print(f"Project structure will be updated in {output_file}")
        
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        observer.stop()
        print("\nStopped watching directory")
    
    observer.join()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        directory = sys.argv[1]
    else:
        directory = "."
        
    watch_directory(directory)
