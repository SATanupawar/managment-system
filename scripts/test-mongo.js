const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) { /* ignore */ }

function loadUri() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', name);
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, 'utf8').split('\n').find((l) => l.startsWith('MONGODB_URI='));
    if (line) return line.slice('MONGODB_URI='.length).trim();
  }
  throw new Error('MONGODB_URI not found');
}

const uri = loadUri();
mongoose
  .connect(uri, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('MongoDB connected OK');
    process.exit(0);
  })
  .catch((e) => {
    console.error('MongoDB failed:', e.message);
    process.exit(1);
  });
