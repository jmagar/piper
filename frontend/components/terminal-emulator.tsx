"use client"

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import '@xterm/xterm/css/xterm.css';

// Monokai color scheme
const MONOKAI_THEME = {
    foreground: '#F8F8F2',
    background: '#272822',
    black: '#272822',
    brightBlack: '#75715E',
    red: '#F92672',
    brightRed: '#F92672',
    green: '#A6E22E',
    brightGreen: '#A6E22E',
    yellow: '#F4BF75',
    brightYellow: '#F4BF75',
    blue: '#66D9EF',
    brightBlue: '#66D9EF',
    magenta: '#AE81FF',
    brightMagenta: '#AE81FF',
    cyan: '#A1EFE4',
    brightCyan: '#A1EFE4',
    white: '#F8F8F2',
    brightWhite: '#F9F8F5',
    cursor: '#F8F8F2'
};

export function TerminalEmulator() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<any>(null);

    useEffect(() => {
        let terminal: any;
        let socket: any;

        const initializeTerminal = async () => {
            if (typeof window === 'undefined' || !terminalRef.current) return;

            // Dynamically import modules
            const [
                { Terminal },
                { FitAddon },
                { WebLinksAddon },
                { WebglAddon },
                { io }
            ] = await Promise.all([
                import('@xterm/xterm'),
                import('@xterm/addon-fit'),
                import('@xterm/addon-web-links'),
                import('@xterm/addon-webgl'),
                import('socket.io-client')
            ]);

            // Initialize terminal
            terminal = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: 'Geist Mono, monospace',
                theme: MONOKAI_THEME,
                allowTransparency: true,
            });

            // Initialize addons
            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();

            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);

            // Try to load WebGL addon
            try {
                const webglAddon = new WebglAddon();
                terminal.loadAddon(webglAddon);
            } catch (err) {
                console.warn('WebGL addon could not be loaded', err);
            }

            // Open terminal in the container
            terminal.open(terminalRef.current);
            fitAddon.fit();

            // Connect to WebSocket server
            socket = io('http://localhost:4100', {
                path: '/ws/terminal'
            });

            // Write initial message
            terminal.writeln('Connected to terminal. Project directory: ~/code/pooper');
            terminal.writeln('Type "help" for available commands.');
            terminal.write('\r\n$ ');

            // Handle terminal input
            terminal.onData((data: string) => {
                socket.emit('input', data);
            });

            // Handle terminal resize
            terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
                socket.emit('resize', { cols, rows });
            });

            // Handle server output
            socket.on('output', (data: string) => {
                terminal.write(data);
            });

            // Handle window resize
            const handleResize = () => {
                fitAddon.fit();
            };
            window.addEventListener('resize', handleResize);

            // Store terminal instance
            terminalInstance.current = terminal;

            return () => {
                window.removeEventListener('resize', handleResize);
            };
        };

        initializeTerminal();

        return () => {
            if (terminal) {
                terminal.dispose();
            }
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    return (
        <div className="w-full h-full bg-[#272822] rounded-lg">
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    );
} 