import { existsSync } from 'node:fs';
import path from 'node:path';
import { startReadOnlyBridgePublisher } from '@affine-fumadocs/publisher/service';

const required = (name) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required in .env.publisher.`); return value; };
const command = [process.env.AFFINE_MCP_BIN, '/opt/homebrew/bin/affine-mcp', '/usr/local/bin/affine-mcp', 'affine-mcp'].find((item) => item === 'affine-mcp' || (item && existsSync(item)));
let service;
service = await startReadOnlyBridgePublisher({
  cwd: process.cwd(), runtimeDir: path.join(process.cwd(), '.affine-publisher'),
  bridgeUrl: process.env.AFFINE_BRIDGE_MCP_URL ?? 'http://127.0.0.1:3333/mcp', bridgeCommand: command,
  publisherCommand: process.execPath, publisherArgs: ['scripts/watch-affine.mjs'],
  bridgeEnvironment: { AFFINE_BASE_URL: process.env.AFFINE_BLOB_BASE_URL ?? 'http://localhost:3010', AFFINE_COOKIE: required('AFFINE_BLOB_COOKIE'), PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}` },
  onUnexpectedExit: (name, detail) => { console.error(`${name} exited: ${detail}`); process.exit(1); },
});
process.on('SIGINT', () => service.stop()); process.on('SIGTERM', () => service.stop());
