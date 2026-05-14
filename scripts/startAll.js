#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

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

const root = path.resolve(__dirname, '..');

console.log('Starting backend and frontend...');
// Start backend (uses root package.json "start" which cd into backend)
runCommand('npm', ['run', 'start'], root);
// Start frontend dev server
runCommand('npm', ['run', 'dev'], root);

// Keep process alive
process.stdin.resume();
