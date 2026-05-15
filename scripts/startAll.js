#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

function runCommand(command, args, cwd) {
  const child = spawn(command, args, { stdio: 'inherit', shell: true, cwd });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${command} ${args.join(' ')} terminated with signal ${signal}`);
    } else {
      console.log(`${command} ${args.join(' ')} exited with code ${code}`);
    }
  });

  child.on('error', (err) => console.error(`Failed to start ${command}:`, err));
  return child;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('Starting backend and frontend...');
// Start backend
runCommand('npm', ['run', 'start'], root);
// Start frontend dev server
runCommand('npm', ['run', 'dev'], root);

// Keep process alive
process.stdin.resume();
