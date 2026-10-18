# @vn-skills/mcp

MCP server (stdio) exposing the [vn-skills](https://github.com/beiryu/vn-skills) functions as tools.

```bash
claude mcp add vn-skills -- npx -y @vn-skills/mcp
```

```json
{ "mcpServers": { "vn-skills": { "command": "npx", "args": ["-y", "@vn-skills/mcp"] } } }
```

Tools: `vietqr_build`, `vietqr_parse`, `vietqr_banks`, `vn_address_parse`, `vn_address_convert`, `vn_address_search_wards`,
`vn_tax_id_validate`, `vn_money_to_words`, `vn_lunar_from_solar`, `vn_lunar_to_solar`, `vn_lunar_holidays`,
`vn_einvoice_validate`, `vn_einvoice_totals`, `vn_einvoice_mock_issue`, `vn_name`.
