import { createServer as createHttpServer, type IncomingMessage } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerBanks, VERSION, type Bank } from '@vn-skills/core';
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
  rest: boolean;
  publicUrl?: string;
}

function parseHttpArgs(argv: string[]): HttpOptions | null {
  if (!argv.includes('--http')) return null;
  const opts: HttpOptions = { port: 3000, host: '127.0.0.1', allowOrigins: [], rest: false };
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
    else if (arg === '--rest') opts.rest = true;
    else if (arg === '--public-url') opts.publicUrl = next();
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

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const server = createServer();
  const client = new Client({ name: 'vn-skills-rest', version: VERSION });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  try {
    return await fn(client);
  } finally {
    await client.close();
    await server.close();
  }
}

function stripSchemaKey(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripSchemaKey);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => k !== '$schema')
        .map(([k, x]) => [k, stripSchemaKey(x)]),
    );
  }
  return v;
}

async function buildOpenApi(serverUrl: string) {
  const { tools } = await withClient((c) => c.listTools());
  const paths: Record<string, unknown> = {};
  for (const t of tools) {
    paths[`/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.title ?? t.name,
        description: t.description ?? '',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: stripSchemaKey(t.inputSchema) } },
        },
        responses: {
          '200': { description: 'Tool result', content: { 'application/json': { schema: {} } } },
          '400': { description: 'Invalid input or tool error' },
          '404': { description: 'Unknown tool' },
        },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: 'vn-skills', version: VERSION },
    servers: [{ url: serverUrl }],
    paths,
  };
}

/** Schema Object fields Swagger 2.0 allows; any other JSON Schema keyword makes the document invalid. */
const SWAGGER2_SCHEMA_KEYS = new Set([
  '$ref',
  'format',
  'title',
  'description',
  'default',
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'maxProperties',
  'minProperties',
  'required',
  'enum',
  'type',
  'items',
  'allOf',
  'properties',
  'additionalProperties',
  'discriminator',
  'readOnly',
  'example',
]);

/**
 * Turns a JSON Schema (draft 2020-12, as zod emits it) into a Swagger 2.0 Schema Object: keeps only
 * the keywords 2.0 knows, maps `const` to `enum` and numeric `exclusiveMinimum`/`exclusiveMaximum`
 * to `minimum`/`maximum` plus `true`, and drops `type`/`properties`/... from unions 2.0 cannot express.
 */
function downgradeSchema(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(downgradeSchema);
  if (!v || typeof v !== 'object') return v;
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const isUnion = Array.isArray(obj.anyOf) || Array.isArray(obj.oneOf) || Array.isArray(obj.type);
  for (const [k, x] of Object.entries(obj)) {
    if (k === 'const') {
      if (!('enum' in obj)) out.enum = [x];
      continue;
    }
    if (k.startsWith('x-')) {
      out[k] = x;
      continue;
    }
    if (!SWAGGER2_SCHEMA_KEYS.has(k)) continue;
    if (k === 'exclusiveMinimum' || k === 'exclusiveMaximum') {
      if (typeof x === 'number') {
        out[k === 'exclusiveMinimum' ? 'minimum' : 'maximum'] = x;
        out[k] = true;
      } else if (typeof x === 'boolean') out[k] = x;
      continue;
    }
    if (k === 'properties' && x && typeof x === 'object' && !Array.isArray(x)) {
      out[k] = Object.fromEntries(Object.entries(x).map(([n, y]) => [n, downgradeSchema(y)]));
    } else if (k === 'items' && Array.isArray(x)) {
      out[k] = {}; // tuple items have no 2.0 form
    } else if (k === 'additionalProperties' && typeof x === 'boolean') {
      out[k] = x;
    } else {
      out[k] = downgradeSchema(x);
    }
  }
  if (isUnion) {
    // keep only keys valid without a type
    for (const k of ['type', 'properties', 'required', 'items', 'enum', 'default']) delete out[k];
  }
  return out;
}

async function buildSwagger(serverUrl: string) {
  const { tools } = await withClient((c) => c.listTools());
  const url = new URL(serverUrl);
  const paths: Record<string, unknown> = {};
  for (const t of tools) {
    paths[`/tools/${t.name}`] = {
      post: {
        operationId: t.name,
        summary: t.title ?? t.name,
        description: t.description ?? '',
        parameters: [
          { in: 'body', name: 'body', required: true, schema: downgradeSchema(t.inputSchema) },
        ],
        responses: {
          '200': { description: 'Tool result', schema: {} },
          '400': { description: 'Invalid input or tool error' },
          '404': { description: 'Unknown tool' },
        },
      },
    };
  }
  return {
    swagger: '2.0',
    info: { title: 'vn-skills', version: VERSION },
    schemes: [url.protocol.replace(':', '')],
    host: url.host,
    basePath: url.pathname.replace(/\/+$/, '') || '/',
    consumes: ['application/json'],
    produces: ['application/json'],
    paths,
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
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
    const path = (req.url ?? '').split('?')[0] ?? '';
    if (
      opts.rest &&
      (path === '/openapi.json' || path === '/swagger.json' || path.startsWith('/tools/'))
    ) {
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      const fail = (status: number, code: string, message: string) =>
        send(status, { ok: false, error: { code, message } });
      const handle = async () => {
        if (path === '/openapi.json' || path === '/swagger.json') {
          if (req.method !== 'GET') return fail(405, 'METHOD_NOT_ALLOWED', 'Use GET');
          const port = req.socket.localPort ?? opts.port;
          const host = opts.host.includes(':') ? `[${opts.host}]` : opts.host;
          const base = opts.publicUrl ?? `http://${host}:${port}`;
          return send(
            200,
            await (path === '/openapi.json' ? buildOpenApi(base) : buildSwagger(base)),
          );
        }
        if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST');
        const name = decodeURIComponent(path.slice('/tools/'.length));
        let args: unknown;
        try {
          const raw = await readBody(req);
          args = raw.trim() === '' ? {} : JSON.parse(raw);
        } catch {
          return fail(400, 'INVALID_JSON', 'Request body is not valid JSON');
        }
        if (args === null || typeof args !== 'object' || Array.isArray(args)) {
          return fail(400, 'INVALID_INPUT', 'Request body must be a JSON object');
        }
        const result = await withClient(async (c) => {
          const { tools } = await c.listTools();
          if (!tools.some((t) => t.name === name)) return null;
          return (await c.callTool({ name, arguments: args as Record<string, unknown> })) as {
            isError?: boolean;
            content?: Array<{ type: string; text?: string }>;
          };
        });
        if (result === null) return fail(404, 'UNKNOWN_TOOL', `Unknown tool: ${name}`);
        const text = result.content?.find((c) => c.type === 'text')?.text ?? 'null';
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          body = { ok: false, error: { code: 'TOOL_ERROR', message: text } };
        }
        const failed =
          result.isError === true ||
          (body !== null && typeof body === 'object' && (body as { ok?: unknown }).ok === false);
        return send(failed ? 400 : 200, body);
      };
      handle().catch(() => {
        if (!res.headersSent) fail(500, 'INTERNAL', 'Internal server error');
      });
      return;
    }
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
