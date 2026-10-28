export const VIETQR_APP_URI = 'ui://vn-skills/vietqr';
export const MCP_APP_MIME = 'text/html;profile=mcp-app';

// Self-contained view: no network origins. Speaks the MCP Apps postMessage (JSON-RPC) protocol directly.
export const VIETQR_APP_HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VietQR</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0; padding: 12px; }
  .card { max-width: 360px; margin: 0 auto; border: 1px solid #8884; border-radius: 12px; padding: 16px; }
  img { display: block; width: 100%; max-width: 256px; margin: 0 auto 12px; image-rendering: pixelated; background: #fff; }
  dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
  dt { opacity: 0.7; }
  dd { margin: 0; word-break: break-all; }
  .actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  button { padding: 6px 10px; border-radius: 6px; border: 1px solid #8886; background: transparent; color: inherit; cursor: pointer; }
  #empty { text-align: center; opacity: 0.7; }
</style>
</head>
<body>
<div class="card" id="card" hidden>
  <img id="qr" alt="VietQR" hidden>
  <dl>
    <dt>Bank</dt><dd id="bank"></dd>
    <dt>Account</dt><dd id="account"></dd>
    <dt>Amount</dt><dd id="amount"></dd>
    <dt>Note</dt><dd id="note"></dd>
  </dl>
  <div class="actions">
    <button type="button" id="copy-account">Copy account</button>
    <button type="button" id="copy-payload">Copy payload</button>
  </div>
</div>
<p id="empty">Waiting for VietQR result…</p>
<script>
(function () {
  var data = null;
  var nextId = 1;
  function $(id) { return document.getElementById(id); }
  function send(msg) { window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, msg), '*'); }
  function formatVnd(n) { return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') + ' \\u20ab'; }
  function render(result) {
    var content = (result && result.content) || [];
    var text = null, img = null;
    for (var i = 0; i < content.length; i++) {
      if (content[i].type === 'text' && text === null) text = content[i].text;
      if (content[i].type === 'image' && img === null) img = content[i];
    }
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) { return; }
    if (!parsed || !parsed.ok) return;
    data = parsed;
    var bank = parsed.bank || {};
    $('bank').textContent = typeof bank === 'string' ? bank : (bank.shortName || bank.name || '') + (bank.bin ? ' (' + bank.bin + ')' : '');
    $('account').textContent = parsed.account || '';
    $('amount').textContent = typeof parsed.amount === 'number' ? formatVnd(parsed.amount) : '-';
    $('note').textContent = parsed.note || '-';
    var qr = $('qr');
    if (img) { qr.src = 'data:' + img.mimeType + ';base64,' + img.data; qr.hidden = false; } else { qr.hidden = true; }
    $('card').hidden = false;
    $('empty').hidden = true;
  }
  function copy(value) {
    if (value == null) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch(function () { fallback(value); });
    } else { fallback(value); }
  }
  function fallback(value) {
    var t = document.createElement('textarea');
    t.value = value; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t);
  }
  $('copy-account').addEventListener('click', function () { if (data) copy(data.account); });
  $('copy-payload').addEventListener('click', function () { if (data) copy(data.payload); });
  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (!m || m.jsonrpc !== '2.0') return;
    if (m.method === 'ui/notifications/tool-result') render(m.params);
    else if (m.method === 'ping' && m.id !== undefined) send({ id: m.id, result: {} });
  });
  var initId = nextId++;
  window.addEventListener('message', function (ev) {
    var m = ev.data;
    if (m && m.jsonrpc === '2.0' && m.id === initId && m.result) send({ method: 'ui/notifications/initialized', params: {} });
  });
  send({
    id: initId,
    method: 'ui/initialize',
    params: {
      appInfo: { name: 'vn-skills-vietqr', version: '1.0.0' },
      appCapabilities: {},
      protocolVersion: '2026-01-26'
    }
  });
})();
</script>
</body>
</html>
`;
