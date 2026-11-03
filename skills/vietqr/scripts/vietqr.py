#!/usr/bin/env python3
"""VietQR build/parse/bank lookup. Python 3.11, standard library only, no network.

Mirrors packages/core/src/vietqr (build.ts, parse.ts, banks.ts, crc16.ts).
Prints the same JSON shape as the Node CLI: {"ok": true, ...} or {"ok": false, "error": {...}}.
"""

import argparse
import json
import os
import re
import sys
import unicodedata

GUID = "A000000727"
MAX_NOTE = 25
HERE = os.path.dirname(os.path.abspath(__file__))

ALIASES = {
    "vietcombank": "970436", "vcb": "970436", "techcombank": "970407", "tcb": "970407",
    "mbbank": "970422", "mb": "970422", "mbb": "970422", "vietinbank": "970415",
    "ctg": "970415", "bidv": "970418", "bid": "970418", "agribank": "970405",
    "agri": "970405", "vpbank": "970432", "vpb": "970432", "acb": "970416",
    "tpbank": "970423", "tpb": "970423", "sacombank": "970403", "stb": "970403",
    "vib": "970441", "shb": "970443", "hdbank": "970437", "hdb": "970437",
    "ocb": "970448", "msb": "970426", "eximbank": "970431", "eib": "970431",
    "seabank": "970440", "lpbank": "970449", "lpb": "970449", "lienvietpostbank": "970449",
    "namabank": "970428", "abbank": "970425", "bacabank": "970409", "pvcombank": "970412",
    "vietabank": "970427", "scb": "970429", "cake": "546034", "ubank": "546035",
    "timo": "963388", "vietbank": "970433", "kienlongbank": "970452", "vccb": "970454",
    "bvbank": "970454", "banviet": "970454", "dongabank": "970406", "baovietbank": "970438",
    "pgbank": "970430", "ncb": "970419", "shinhan": "970424", "woori": "970457",
    "hsbc": "458761", "standardchartered": "970410", "publicbank": "970439", "uob": "970458",
    "cimb": "422589", "hongleong": "970442", "ibk": "970455", "vrb": "970421",
    "gpbank": "970408", "oceanbank": "970414", "mbv": "970414", "cbbank": "970444",
    "saigonbank": "970400", "coopbank": "970446",
}


class Fail(Exception):
    def __init__(self, code, message, hint=None):
        super().__init__(message)
        self.code, self.message, self.hint = code, message, hint


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


def emit_error(code, message, hint=None):
    err = {"code": code, "message": message}
    if hint:
        err["hint"] = hint
    emit({"ok": False, "error": err})


def remove_diacritics(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not 0x300 <= ord(c) <= 0x36F)
    return s.replace("đ", "d").replace("Đ", "D")


def compact_key(s):
    return re.sub(r"[^a-z0-9]", "", remove_diacritics(s).lower())


def crc16(text):
    crc = 0xFFFF
    for b in text.encode("utf-8"):
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return format(crc, "04X")


def tlv(tag, value):
    if len(value) > 99:
        raise Fail("INVALID_PAYLOAD", f"TLV value for tag {tag} exceeds 99 characters")
    return f"{tag}{len(value):02d}{value}"


def tlv_decode(payload, templates=()):
    nodes, i = [], 0
    while i < len(payload):
        if i + 4 > len(payload):
            return None, f"Truncated TLV header at offset {i}"
        tag, ln = payload[i : i + 2], payload[i + 2 : i + 4]
        if not re.fullmatch(r"[0-9]{2}", ln):
            return None, f'Invalid TLV length "{ln}" for tag {tag} at offset {i}'
        n = int(ln)
        value = payload[i + 4 : i + 4 + n]
        if len(value) != n:
            return None, f"Tag {tag} declares length {n} but only {len(value)} chars remain"
        node = {"tag": tag, "value": value}
        if tag in templates:
            sub, err = tlv_decode(value)
            if sub is None:
                return None, f"Inside tag {tag}: {err}"
            node["children"] = sub
        nodes.append(node)
        i += 4 + n
    return nodes, None


def tlv_find(nodes, tag):
    for n in nodes or []:
        if n["tag"] == tag:
            return n
    return None


def tlv_value(nodes, tag):
    n = tlv_find(nodes, tag)
    return n["value"] if n else None


def load_banks():
    with open(os.path.join(HERE, "banks.json"), encoding="utf-8") as f:
        return json.load(f)


def find_bank(banks, query):
    q = (query or "").strip()
    if not q:
        return None
    by_bin = {b["bin"]: b for b in banks}
    if re.fullmatch(r"[0-9]{6}", q):
        return by_bin.get(q)
    key = compact_key(q)
    if not key:
        return None
    if key in ALIASES:
        return by_bin.get(ALIASES[key])
    for b in banks:
        if b["code"].lower() == q.lower():
            return b
    for b in banks:
        if compact_key(b["shortName"]) == key:
            return b
        if any(compact_key(k) == key for k in b.get("keywords", [])):
            return b
    if re.fullmatch(r"[a-z]{6}[a-z0-9]{2}([a-z0-9]{3})?", q, re.I):
        bic = q[:8].upper()
        for b in banks:
            if b.get("swift") and b["swift"][:8].upper() == bic:
                return b
    sub = [b for b in banks if key in compact_key(b["shortName"]) or key in compact_key(b["name"])]
    return next((b for b in sub if not b.get("deprecated")), sub[0] if sub else None)


def search_banks(banks, query=""):
    key = compact_key(query)
    if not key:
        return list(banks)
    exact = find_bank(banks, query)
    rest = [
        b
        for b in banks
        if b is not exact
        and (
            key in b["bin"]
            or key in compact_key(b["code"])
            or key in b.get("swift", "").lower()
            or key in compact_key(b["shortName"])
            or key in compact_key(b["name"])
            or any(key in compact_key(k) for k in b.get("keywords", []))
        )
    ]
    return ([exact] if exact else []) + rest


def sanitize_note(note):
    s = re.sub(r"[^A-Za-z0-9 ]+", " ", remove_diacritics(note))
    return re.sub(r"\s+", " ", s).strip()


def parse_amount_string(text):
    s = re.sub(r"(?:đồng|dong|vnđ|vnd|đ|d)$", "", text.strip(), flags=re.I)
    s = re.sub(r"[\s_]", "", s)
    if re.fullmatch(r"[0-9]+", s):
        return s
    if re.fullmatch(r"[0-9]{1,3}([.,][0-9]{3})+", s):
        return re.sub(r"[.,]", "", s)
    return None


def build(banks, bank_q, account_in, amount_in, note_in, card, static):
    warnings = []
    bank = find_bank(banks, bank_q or "")
    if not bank:
        raise Fail(
            "BANK_NOT_FOUND",
            f'Unknown bank "{bank_q}"',
            "Pass a 6-digit NAPAS BIN (e.g. 970436), a bank code (VCB) or a bank name. "
            "Run `banks <query>` to list banks.",
        )
    if bank.get("vietqr") == "none":
        warnings.append(f"{bank['shortName']} is listed as not supporting VietQR transfers.")
    if bank.get("deprecated"):
        warnings.append(f"{bank['shortName']} is marked deprecated/merged in the bank list.")

    trimmed = (account_in or "").strip()
    account = re.sub(r"\s+", "", trimmed)
    if not re.fullmatch(r"[A-Za-z0-9]{1,19}", account):
        raise Fail(
            "INVALID_ACCOUNT",
            f'Account "{account_in}" must be 1-19 letters/digits',
            "Remove spaces and punctuation from the account number.",
        )
    if account != trimmed:
        warnings.append(
            f'Spaces removed from account "{trimmed}" -> "{account}"; check the account number.'
        )

    amount = None
    if amount_in is not None and amount_in.strip() != "":
        raw = parse_amount_string(amount_in)
        if raw is None:
            raise Fail(
                "INVALID_AMOUNT",
                f'Amount "{amount_in}" must be a positive integer in VND',
                "VND has no decimals; pass e.g. 500000.",
            )
        amount = int(raw)
        if "," in amount_in:
            warnings.append(
                f'Amount "{amount_in}" was read as {amount} VND; in Vietnamese \',\' is the decimal '
                "mark. Pass plain digits to avoid ambiguity."
            )
        if amount <= 0:
            raise Fail("INVALID_AMOUNT", "Amount must be greater than 0")
        if len(str(amount)) > 13:
            raise Fail("INVALID_AMOUNT", "Amount exceeds 13 digits allowed by EMVCo")

    note = None
    raw_note = (note_in or "").strip()
    if raw_note:
        note = sanitize_note(raw_note)
        if note != raw_note:
            warnings.append("Note was sanitized (diacritics/punctuation removed).")
        if len(note) > MAX_NOTE:
            note = note[:MAX_NOTE].strip()
            warnings.append(f"Note truncated to {MAX_NOTE} characters.")
        if not note:
            note = None

    dynamic = False if static else (amount is not None or note is not None)
    service = "QRIBFTTC" if card else "QRIBFTTA"
    beneficiary = tlv("00", bank["bin"]) + tlv("01", account)
    merchant = tlv("00", GUID) + tlv("01", beneficiary) + tlv("02", service)
    payload = tlv("00", "01") + tlv("01", "12" if dynamic else "11") + tlv("38", merchant)
    payload += tlv("53", "704")
    if amount is not None:
        payload += tlv("54", str(amount))
    payload += tlv("58", "VN")
    if note is not None:
        payload += tlv("62", tlv("08", note))
    payload += "6304"
    crc = crc16(payload)
    payload += crc
    out = {
        "ok": True,
        "payload": payload,
        "bank": {k: bank[k] for k in ("bin", "code", "shortName", "name")},
        "account": account,
        "amount": amount,
        "note": note,
        "dynamic": dynamic,
        "crc": crc,
        "warnings": warnings,
    }
    return {k: v for k, v in out.items() if v is not None}


def parse(banks, text):
    payload = (text or "").strip()
    if len(payload) < 8:
        raise Fail("INVALID_PAYLOAD", "Payload too short to be an EMVCo QR")
    fields, err = tlv_decode(payload, {"38", "62", "64"})
    if fields is None:
        raise Fail("INVALID_TLV", err or "Malformed TLV", "Check that the string was copied completely.")
    warnings = []
    crc_node = tlv_find(fields, "63")
    crc = crc_node["value"] if crc_node else ""
    if fields[-1]["tag"] == "63" and payload[-8:-4] == "6304":
        idx = len(payload) - 8
    else:
        idx = payload.rfind("6304")
    expected = crc16(payload[: idx + 4]) if idx >= 0 else ""
    crc_valid = len(crc) == 4 and crc.upper() == expected
    if not crc_node:
        warnings.append("Missing CRC (tag 63).")
    elif not crc_valid:
        upper = (
            idx >= 0
            and len(crc) == 4
            and crc16(payload[: idx + 4].upper()) == crc.upper()
        )
        warnings.append(
            f"Payload appears to have been lower-cased in transit: the CRC {crc} matches the "
            "upper-cased payload. Use the original payload."
            if upper
            else f"CRC mismatch: payload has {crc}, expected {expected}."
        )
    if fields[-1]["tag"] != "63":
        warnings.append("CRC tag 63 is not the last field.")

    fmt = tlv_value(fields, "00")
    if fmt != "01":
        warnings.append(f'Unexpected payload format indicator "{fmt or ""}" (expected 01).')
    dynamic = tlv_value(fields, "01") == "12"

    merchant = tlv_find(fields, "38")
    children = merchant.get("children") if merchant else None
    guid = tlv_value(children, "00")
    is_vietqr = guid == GUID
    if merchant and not is_vietqr and guid is not None and guid.upper() == GUID:
        warnings.append(f'Tag 38 GUID "{guid}" is lower-cased; NAPAS GUID is {GUID}.')
    elif merchant and not is_vietqr:
        warnings.append(f'Tag 38 GUID is "{guid or ""}", not NAPAS {GUID}.')
    if not merchant:
        warnings.append("Missing merchant account information (tag 38).")

    beneficiary = tlv_value(children, "01")
    bin_, account = None, None
    if beneficiary is not None:
        b, berr = tlv_decode(beneficiary)
        if b is not None:
            bin_, account = tlv_value(b, "00"), tlv_value(b, "01")
        else:
            warnings.append(f"Malformed beneficiary template: {berr}")
    service = tlv_value(children, "02")
    bank = find_bank(banks, bin_) if bin_ else None
    if bin_ and not bank:
        warnings.append(f"BIN {bin_} not found in bank list.")

    amount_raw = tlv_value(fields, "54")
    amount = None
    if amount_raw is not None and re.fullmatch(r"[0-9]+(\.[0-9]+)?", amount_raw):
        f = float(amount_raw)
        amount = int(f) if f == int(f) else f
    if amount_raw is not None and amount is None:
        warnings.append(f'Amount "{amount_raw}" is not numeric.')
    currency = tlv_value(fields, "53")
    if currency and currency != "704":
        warnings.append(f"Currency {currency} is not VND (704).")
    country = tlv_value(fields, "58")
    note = tlv_value((tlv_find(fields, "62") or {}).get("children"), "08")

    out = {
        "ok": True,
        "isVietQR": is_vietqr,
        "crcValid": crc_valid,
        "bin": bin_,
        "bank": {k: bank[k] for k in ("bin", "code", "shortName", "name")} if bank else None,
        "account": account,
        "service": service,
        "amount": amount,
        "currency": currency,
        "country": country,
        "note": note,
        "dynamic": dynamic,
        "crc": crc,
        "expectedCrc": expected,
        "warnings": warnings,
        "fields": fields,
    }
    return {k: v for k, v in out.items() if v is not None}


def main(argv):
    p = argparse.ArgumentParser(prog="vietqr.py", description="VietQR build/parse/banks (offline).")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--bank", "-b", required=True)
    b.add_argument("--account", "-a", required=True)
    b.add_argument("--amount", "-m")
    b.add_argument("--note", "-n")
    b.add_argument("--service", choices=["QRIBFTTA", "QRIBFTTC"], default="QRIBFTTA")
    b.add_argument("--static", action="store_true", help="force static QR")
    b.add_argument("--out", "-o")
    pa = sub.add_parser("parse")
    pa.add_argument("payload")
    bk = sub.add_parser("banks")
    bk.add_argument("query", nargs="?", default="")
    try:
        args = p.parse_args(argv)
    except SystemExit as e:
        return int(e.code or 0)
    try:
        banks = load_banks()
        if args.cmd == "build":
            if args.out:
                raise Fail(
                    "UNSUPPORTED",
                    "Image output (--out) is not available in the Python fallback",
                    "Image output needs the Node CLI: npx -y @vn-skills/cli vietqr build ... --out qr.png",
                )
            emit(build(banks, args.bank, args.account, args.amount, args.note,
                       args.service == "QRIBFTTC", args.static))
        elif args.cmd == "parse":
            emit(parse(banks, args.payload))
        else:
            found = search_banks(banks, args.query)
            emit({"ok": True, "count": len(found), "banks": found})
    except Fail as e:
        emit_error(e.code, e.message, e.hint)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
