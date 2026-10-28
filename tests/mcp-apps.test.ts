import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVER = resolve(__dirname, '..', 'packages', 'mcp', 'dist', 'index.js');
const URI = 'ui://vn-skills/vietqr';
const MCP_APP_MIME = 'text/html;profile=mcp-app';

describe('MCP Apps: VietQR card', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ name: 'test', version: '0.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER] }));
  });
  afterAll(async () => {
    await client.close();
  });

  it('resources/list includes the ui:// resource with the MCP Apps mime type', async () => {
    const { resources } = await client.listResources();
    const r = resources.find((x) => x.uri === URI);
    expect(r, 'ui://vn-skills/vietqr listed').toBeDefined();
    expect(r?.mimeType).toBe(MCP_APP_MIME);
  });

  it('resources/read returns self-contained HTML', async () => {
    const res = await client.readResource({ uri: URI });
    expect(res.contents).toHaveLength(1);
    const c = res.contents[0];
    expect(c?.uri).toBe(URI);
    expect(c?.mimeType).toBe(MCP_APP_MIME);
    const html = 'text' in c! ? c.text : '';
    expect(html.length).toBeGreaterThan(0);
    expect(html.toLowerCase()).toContain('<html');
    // no network references in src/href/url()/@import/import
    expect(html).not.toMatch(/<script[^>]*\ssrc\s*=/i);
    expect(html).not.toMatch(/<link[^>]*\shref\s*=\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/<img[^>]*\ssrc\s*=\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/url\(\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/\b(?:src|href)\s*=\s*["']?https?:\/\//i);
  });

  it('tools/list links only vietqr_build to the view via _meta.ui.resourceUri', async () => {
    const { tools } = await client.listTools();
    const build = tools.find((t) => t.name === 'vietqr_build');
    const meta = build?._meta as { ui?: { resourceUri?: string } } | undefined;
    expect(meta?.ui?.resourceUri).toBe(URI);
    for (const t of tools.filter((x) => x.name !== 'vietqr_build')) {
      expect(JSON.stringify(t._meta ?? {}), `${t.name} _meta`).not.toContain('ui://');
    }
  });
});
