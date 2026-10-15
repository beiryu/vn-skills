/**
 * EMVCo TLV (tag-length-value) helpers used by VietQR.
 * Tag: 2 chars, length: 2 decimal digits (00-99), value: `length` chars.
 */
export interface TlvNode {
  tag: string;
  value: string;
  /** Present when the value itself is a TLV template (tags 38, 62, 64 in VietQR). */
  children?: TlvNode[];
}

export function tlvEncode(tag: string, value: string): string {
  if (tag.length !== 2) throw new Error(`TLV tag must be 2 characters, got "${tag}"`);
  if (value.length > 99) throw new Error(`TLV value for tag ${tag} exceeds 99 characters`);
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
}

export interface TlvDecodeResult {
  ok: boolean;
  nodes: TlvNode[];
  error?: string;
}

export function tlvDecode(
  payload: string,
  templateTags: ReadonlySet<string> = new Set(),
): TlvDecodeResult {
  const nodes: TlvNode[] = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) {
      return { ok: false, nodes, error: `Truncated TLV header at offset ${i}` };
    }
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(lenStr)) {
      return {
        ok: false,
        nodes,
        error: `Invalid TLV length "${lenStr}" for tag ${tag} at offset ${i}`,
      };
    }
    const len = Number(lenStr);
    const value = payload.slice(i + 4, i + 4 + len);
    if (value.length !== len) {
      return {
        ok: false,
        nodes,
        error: `Tag ${tag} declares length ${len} but only ${value.length} chars remain`,
      };
    }
    const node: TlvNode = { tag, value };
    if (templateTags.has(tag)) {
      const sub = tlvDecode(value);
      if (!sub.ok) return { ok: false, nodes, error: `Inside tag ${tag}: ${sub.error}` };
      node.children = sub.nodes;
    }
    nodes.push(node);
    i += 4 + len;
  }
  return { ok: true, nodes };
}

export function tlvFind(nodes: TlvNode[] | undefined, tag: string): TlvNode | undefined {
  return nodes?.find((n) => n.tag === tag);
}
