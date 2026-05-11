import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'dev', '--workspace', 'server']],
  ['npm', ['run', 'dev', '--workspace', 'client']],
];

const children = commands.map(([cmd, args]) => {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', code => {
    if (code && code !== 0) {
      for (const other of children) {
        if (other !== child) other.kill('SIGTERM');
      }
      process.exit(code);
    }
  });
  return child;
});

process.on('SIGINT', () => {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
});
