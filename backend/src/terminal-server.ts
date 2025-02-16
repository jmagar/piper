import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as pty from 'node-pty';
import { format } from 'date-fns';

export function setupTerminalServer(httpServer: HttpServer, projectRoot: string) {
    const io = new Server(httpServer, {
        path: '/ws/terminal',
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:4100'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log(`[${format(new Date(), 'yyyy/MM/dd HH:mm:ss')}] New terminal connection`);

        // Create PTY process
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: projectRoot,
            env: {
                ...process.env,
                PROJECT_ROOT: projectRoot
            }
        });

        // Handle incoming data
        socket.on('input', (data: string) => {
            ptyProcess.write(data);
        });

        // Handle terminal resize
        socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
            ptyProcess.resize(cols, rows);
        });

        // Handle PTY output
        ptyProcess.onData((data: string) => {
            socket.emit('output', data);
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`[${format(new Date(), 'yyyy/MM/dd HH:mm:ss')}] Terminal disconnected`);
            ptyProcess.kill();
        });

        // Set up command restrictions and custom commands
        ptyProcess.write('function cd() {\n');
        ptyProcess.write('  if [[ "$1" == /* || "$1" == ~* ]]; then\n');
        ptyProcess.write(`    if [[ "$(realpath "$1")" == "${projectRoot}"* ]]; then\n`);
        ptyProcess.write('      builtin cd "$1"\n');
        ptyProcess.write('    else\n');
        ptyProcess.write('      echo "Access denied: Can only access project directory"\n');
        ptyProcess.write('    fi\n');
        ptyProcess.write('  else\n');
        ptyProcess.write('    builtin cd "$1"\n');
        ptyProcess.write('  fi\n');
        ptyProcess.write('}\n');

        // Set up help command
        ptyProcess.write('function help() {\n');
        ptyProcess.write('  echo "Available commands:"\n');
        ptyProcess.write('  echo "  cd [dir]     - Change directory (restricted to project)"\n');
        ptyProcess.write('  echo "  ls           - List directory contents"\n');
        ptyProcess.write('  echo "  pwd          - Print working directory"\n');
        ptyProcess.write('  echo "  git          - Git version control"\n');
        ptyProcess.write('  echo "  pnpm         - Package manager commands"\n');
        ptyProcess.write('  echo "  clear        - Clear the terminal"\n');
        ptyProcess.write('  echo "  help         - Show this help message"\n');
        ptyProcess.write('}\n');

        // Initial directory setup
        ptyProcess.write(`cd "${projectRoot}"\n`);
        ptyProcess.write('clear\n');
    });

    return io;
} 