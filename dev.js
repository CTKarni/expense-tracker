import { spawn } from 'child_process';

console.log('🚀 Starting OmniLedger (Vite Frontend + SQLite API Backend)...');

// Start the SQLite API Backend server
const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

// Start the Vite development frontend server
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const killAll = () => {
  server.kill();
  vite.kill();
};

// Handle process termination cleanly
process.on('exit', killAll);
process.on('SIGINT', () => {
  killAll();
  process.exit();
});
process.on('SIGTERM', () => {
  killAll();
  process.exit();
});
