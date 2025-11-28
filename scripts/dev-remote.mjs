import { networkInterfaces } from 'os';
import { spawn } from 'child_process';

const port = process.env.PORT || process.env.VITE_PORT || 5173;
const networkInfo = networkInterfaces();

const ips = Object.values(networkInfo)
  .flatMap((iface) => iface ?? [])
  .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
  .map((entry) => entry.address);

const displayIp = ips[0] || 'localhost';

if (ips.length === 0) {
  console.log('No external IPv4 address detected. Using localhost.');
}

console.log('Starting Vite dev server accessible from your local network...');
console.log(`Primary URL: http://${displayIp}:${port}`);
if (ips.length > 1) {
  console.log('Additional local addresses:');
  ips.slice(1).forEach((addr) => console.log(`- http://${addr}:${port}`));
}

const viteProcess = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', String(port)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

viteProcess.on('exit', (code) => {
  process.exit(code ?? 0);
});
