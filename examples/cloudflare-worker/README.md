# vn-skills MCP on Cloudflare Workers

A stateless, authless Worker that serves the vn-skills MCP tools over Streamable HTTP at `POST /mcp`. It creates a new server per request and makes no outbound requests. Every other path returns 404 JSON.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/beiryu/vn-skills/tree/main/examples/cloudflare-worker)

```bash
pnpm install
pnpm --filter @vn-skills/cloudflare-worker-example dev      # local
pnpm --filter @vn-skills/cloudflare-worker-example deploy   # publish
```

Add the resulting `https://<name>.workers.dev/mcp` URL to any client that supports Streamable HTTP (Copilot Studio, Dify, ChatGPT/Claude.ai connectors).

## Limitations

- The endpoint is public and has no authentication; do not expose private data through it.
- The free plan allows 10 ms CPU per request. Heavy calls may exceed it.
- `vietqr_build` with `image: true` renders a PNG through the `qrcode` package, which is only tested on Node. It is not verified under `nodejs_compat`; if it fails on Workers, use `image: false` and render the returned payload client-side.
