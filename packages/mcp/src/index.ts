import { createServer as createHttpServer } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { readFileSync } from 'node:fs';
import { registerBanks, type Bank } from '@vn-skills/core';
import { createServer } from './server.js';

function loadBanksArg(argv: string[]): void {
  const i = argv.indexOf('--banks');
  if (i < 0) return;
  const file = argv[i + 1];
  if (file === undefined) throw new Error('--banks requires a file');
  const r = registerBanks(JSON.parse(readFileSync(file, 'utf8')) as Bank[]);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
}

interface HttpOptions {
  port: number;
  host: string;
  allowOrigins: string[];
}

function parseHttpArgs(argv: string[]): HttpOptions | null {
  if (!argv.includes('--http')) return null;
  const opts: HttpOptions = { port: 3000, host: '127.0.0.1', allowOrigins: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} requires a value`);
      return v;
    };
    if (arg === '--port') {
      const port = Number(next());
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid --port');
      opts.port = port;
    } else if (arg === '--host') opts.host = next();
    else if (arg === '--allow-origin') opts.allowOrigins.push(next());
  }
  return opts;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

function startHttp(opts: HttpOptions) {
  const http = createHttpServer((req, res) => {
    const reply = (status: number, message: string) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message }, id: null }));
    };
    const origin = req.headers.origin;
    if (origin && !isLocalOrigin(origin) && !opts.allowOrigins.includes(origin)) {
      return reply(403, 'Forbidden origin');
    }
    const path = (req.url ?? '').split('?')[0];
    if (path !== '/mcp') return reply(404, 'Not found');

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    server
      .connect(transport)
      .then(() => transport.handleRequest(req, res))
      .catch(() => {
        if (!res.headersSent) reply(500, 'Internal server error');
      });
  });
  http.listen(opts.port, opts.host, () => {
    const { port } = http.address() as { port: number };
    const host = opts.host.includes(':') ? `[${opts.host}]` : opts.host;
    process.stderr.write(`vn-skills MCP server listening on http://${host}:${port}/mcp\n`);
  });
}

async function main() {
  loadBanksArg(process.argv.slice(2));
  const http = parseHttpArgs(process.argv.slice(2));
  if (http) return startHttp(http);
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('vn-skills MCP server running on stdio\n');
}

main().catch((err) => {
  process.stderr.write(
    `vn-skills-mcp failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
