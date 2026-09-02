import { spawn } from 'node:child_process';
import path from 'node:path';
import { createAffineBridgeMcpClient } from '@affine-fumadocs/publisher/bridge-client';
import { createSnapshotPoller } from '@affine-fumadocs/publisher/poller';

const workspaceId = process.env.AFFINE_WORKSPACE_ID?.trim();
if (!workspaceId) throw new Error('AFFINE_WORKSPACE_ID is required.');
const client = createAffineBridgeMcpClient({ endpoint: process.env.AFFINE_BRIDGE_MCP_URL, token: process.env.AFFINE_BRIDGE_MCP_TOKEN?.trim() });
const refresh = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/publish-from-affine.mjs'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
  child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`publish-from-affine exited with ${code}`)));
});
await createSnapshotPoller({
  client, workspaceId, refresh, pollSeconds: Number(process.env.PUBLISHER_POLL_SECONDS ?? 45),
  statePath: path.join(process.cwd(), '.affine-publisher', 'state.json'),
}).start();
