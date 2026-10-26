# Install the vn-skills MCP server

vn-skills is an offline toolkit, not a payment gateway.

## Requirements

- Node.js 22+
- No accounts, API keys or environment variables. The server is offline.

## Setup

Add this to the MCP client config (runs over stdio):

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

## Check that it works

- The server prints `vn-skills MCP server running on stdio` to stderr.
- It lists 29 tools, grouped by skill (`vietqr`, `vn-address`, …).

Example prompt: _"tạo QR chuyển 500k vào VCB số tài khoản 0011001234567"_ calls the `vietqr_build` tool.

## Docker alternative

```bash
docker build -t vn-skills-mcp .
```

Then point the client at `docker run -i --rm vn-skills-mcp`:

```json
{
  "mcpServers": {
    "vn-skills": { "command": "docker", "args": ["run", "-i", "--rm", "vn-skills-mcp"] }
  }
}
```
