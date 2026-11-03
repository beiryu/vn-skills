#!/usr/bin/env python3
"""Offline Vietnamese tax ID (mã số thuế) validation. Port of packages/core/src/taxid (stdlib only, no network)."""
import argparse
import json
import re
import sys

WEIGHTS = [31, 29, 23, 19, 17, 13, 7, 5, 3]


class Fail(Exception):
    def __init__(self, code, message, hint=None):
        super().__init__(message)
        self.code, self.message, self.hint = code, message, hint


def error_json(e):
    err = {"code": e.code, "message": e.message, "hint": e.hint}
    return {"ok": False, "error": err}


def check_digit(first9):
    s = sum(int(c) * w for c, w in zip(first9, WEIGHTS))
    c = 10 - (s % 11)
    return None if c == 10 else c


def validate(inp):
    if inp is None or inp.strip() == "":
        raise Fail(
            "EMPTY",
            "Tax ID is empty",
            "Provide a 10-digit tax ID, a 13-digit branch tax ID (10-3 with a dash, e.g. 0100233488-001), or a 12-digit personal ID.",
        )
    digits = re.sub(r"[\s.\-–_]", "", inp.strip())
    if not re.fullmatch(r"\d+", digits, re.ASCII):
        raise Fail(
            "INVALID_FORMAT",
            f'Tax ID "{inp}" contains non-digit characters',
            "Only digits, spaces, dots, dashes and underscores are accepted.",
        )
    dashed = re.fullmatch(r"\s*(\d[\d\s.]*)[-–_]\s*(\d+)\s*", inp, re.ASCII)
    if dashed:
        root = re.sub(r"[\s.]", "", dashed.group(1))
        suffix = dashed.group(2)
        if len(root) != 10 or len(suffix) != 3:
            raise Fail(
                "INVALID_LENGTH",
                f"Branch tax IDs must be 10 digits, a dash, then 3 digits (got {len(root)}-{len(suffix)})",
                "Example: 0100233488-001",
            )
    if len(digits) == 12:
        return {
            "ok": True,
            "valid": True,
            "normalized": digits,
            "formatted": digits,
            "kind": "personal-id",
            "checksumValid": None,
            "warnings": [
                "A 12-digit number is treated as a personal identification number (CCCD) used as an individual tax ID from 01/07/2025. Only the length was checked."
            ],
        }
    if len(digits) not in (10, 13):
        raise Fail(
            "INVALID_LENGTH",
            f"Tax ID must have 10 or 13 digits, got {len(digits)}",
            "Enterprise IDs have 10 digits; branches have 10 + 3 digits (e.g. 0100233488-001).",
        )
    root = digits[:10]
    if root[2:9] == "0000000":
        raise Fail("INVALID_SEQUENCE", "Sequence digits 3-9 cannot all be zero")
    expected = check_digit(root[:9])
    actual = int(root[9])
    if expected is None or expected != actual:
        suffix = " (sequence cannot be valid)" if expected is None else f" {expected}"
        raise Fail(
            "INVALID_CHECKSUM",
            f"Check digit {actual} does not match the expected value{suffix}",
            "The 10th digit is a checksum of the first 9 digits (weights 31,29,23,19,17,13,7,5,3 mod 11). Re-check for typos.",
        )
    out = {"ok": True, "valid": True, "normalized": digits, "formatted": digits, "root": root, "prefix": root[:2], "checksumValid": True, "warnings": []}
    if len(digits) == 13:
        branch = digits[10:]
        if branch == "000":
            raise Fail("INVALID_BRANCH", "Branch suffix cannot be 000", "Branch suffixes start at 001.")
        out.update(kind="branch", formatted=f"{root}-{branch}", branch=branch)
    else:
        out["kind"] = "enterprise"
    return out


def check_digit_result(first9):
    if not re.fullmatch(r"\d{9}", first9, re.ASCII):
        raise Fail("INVALID_FORMAT", "Expected exactly 9 digits")
    c = check_digit(first9)
    return {"ok": True, "first9": first9, "checkDigit": c, "taxId": None if c is None else first9 + str(c)}


def main(argv):
    p = argparse.ArgumentParser(description="Vietnamese tax ID validation (offline)")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate").add_argument("mst")
    sub.add_parser("check-digit").add_argument("first9")
    a = p.parse_args(argv)
    try:
        out = validate(a.mst) if a.cmd == "validate" else check_digit_result(a.first9)
        code = 0
    except Fail as e:
        out, code = error_json(e), 1
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
