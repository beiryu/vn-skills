# @vn-skills/cli

`vn-skills` command line used by the [vn-skills](https://github.com/beiryu/vn-skills) Agent Skills. Prints JSON when
stdout is not a terminal (or with `--json`).

```bash
npx -y @vn-skills/cli vietqr build --bank VCB --account 0011001234567 --amount 500000 --note "don 123" --out qr.png
npx -y @vn-skills/cli vietqr parse "<payload>"
npx -y @vn-skills/cli address convert "12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM"
npx -y @vn-skills/cli taxid validate 0100233488-001
npx -y @vn-skills/cli money words 1200000
npx -y @vn-skills/cli lunar from-solar 29/01/2025
npx -y @vn-skills/cli einvoice totals invoice.json
```

Install skills into an agent (`--agent claude|cursor|codex`, `--global` for the home directory, `--force`, `--dry-run`):

```bash
npx -y @vn-skills/cli install <skill|all> --agent claude
```

Run `npx -y @vn-skills/cli --help` for all commands.
