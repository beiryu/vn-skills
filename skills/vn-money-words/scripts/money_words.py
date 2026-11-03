#!/usr/bin/env python3
"""Offline VND amount <-> Vietnamese words. Port of packages/core/src/money (stdlib only, no network)."""
import argparse
import json
import re
import sys
import unicodedata

MAX_MONEY_DIGITS = 1000
DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
UNIT_WORDS = {
    "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4,
    "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9,
}
SCALE_BASE = {"nghìn": 1, "ngàn": 1, "triệu": 2}
NUMBER_WORDS = {"không", "mười", "mươi", "trăm", "lẻ", "linh", "tỷ"} | set(UNIT_WORDS) | set(SCALE_BASE)
THOUSAND = {"nghìn": "nghìn", "nghin": "nghìn", "ngàn": "ngàn", "ngan": "ngàn"}
ODD = {"lẻ": "lẻ", "le": "lẻ", "linh": "linh"}


class Fail(Exception):
    def __init__(self, code, message, hint=None):
        super().__init__(message)
        self.code, self.message, self.hint = code, message, hint


def error_json(e):
    err = {"code": e.code, "message": e.message, "hint": e.hint}
    return {"ok": False, "error": err}


def too_long():
    return Fail(
        "INVALID_AMOUNT",
        f"Amount has more than {MAX_MONEY_DIGITS} digits",
        f"Amounts are limited to {MAX_MONEY_DIGITS} digits.",
    )


def read_group(n, full, odd):
    hundreds, tens, units = n // 100, (n % 100) // 10, n % 10
    parts = []
    if hundreds > 0 or full:
        parts.append(f"{DIGITS[hundreds]} trăm")
    if tens == 0:
        if units > 0:
            if hundreds > 0 or full:
                parts.append(odd)
            parts.append(DIGITS[units])
    elif tens == 1:
        parts.append("mười")
        if units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(DIGITS[units])
    else:
        parts.append(f"{DIGITS[tens]} mươi")
        if units == 1:
            parts.append("mốt")
        elif units == 4:
            parts.append("tư")
        elif units == 5:
            parts.append("lăm")
        elif units > 0:
            parts.append(DIGITS[units])
    return " ".join(parts)


def scale_word(i, thousand):
    base = ["", thousand, "triệu", "tỷ"]
    if i < 4:
        return base[i]
    ty_count, rem = i // 3, i % 3
    return " ".join(w for w in [base[rem]] + ["tỷ"] * ty_count if w)


def money_to_words(amount, thousand="nghìn", odd="lẻ", unit="đồng"):
    s = re.sub(r"[\s_]", "", str(amount).strip())
    if re.fullmatch(r"-?\d{1,3}(\.\d{3})+", s, re.ASCII):
        cleaned = s.replace(".", "")
    elif re.fullmatch(r"-?\d{1,3}(,\d{3})+", s, re.ASCII):
        cleaned = s.replace(",", "")
    else:
        cleaned = s
    if not re.fullmatch(r"-?\d+", cleaned, re.ASCII):
        raise Fail(
            "INVALID_AMOUNT",
            f'"{amount}" is not an integer amount',
            "Use digits only, e.g. 1200000 or 1.200.000.",
        )
    if len(cleaned.replace("-", "")) > MAX_MONEY_DIGITS:
        raise too_long()
    big = int(cleaned)
    negative = big < 0
    big = abs(big)
    if big == 0:
        words = DIGITS[0]
    else:
        groups = []
        n = big
        while n > 0:
            groups.append(n % 1000)
            n //= 1000
        parts = []
        for i in range(len(groups) - 1, -1, -1):
            g = groups[i]
            if g == 0:
                continue
            text = read_group(g, i != len(groups) - 1, odd)
            scale = scale_word(i, thousand)
            parts.append(f"{text} {scale}" if scale else text)
        words = " ".join(parts)
    if unit:
        words += f" {unit}"
    if negative:
        words = f"âm {words}"
    return {"ok": True, "amount": ("-" if negative else "") + str(big), "words": words}


class BadWord(Exception):
    pass


def parse_group(t):
    def at(i):
        return t[i] if i < len(t) else t[-1]

    def bad(i):
        raise BadWord(at(i))

    def digit(w):
        if w == "không":
            return 0
        if w is None or w in ("mốt", "tư", "lăm"):
            return None
        return UNIT_WORDS.get(w)

    def unit(i):
        w = t[i] if i < len(t) else None
        if w not in UNIT_WORDS:
            bad(i)
        return UNIT_WORDS[w]

    def tok(i):
        return t[i] if i < len(t) else None

    i = 0
    hundreds = None
    if tok(1) == "trăm":
        hundreds = digit(tok(0))
        if hundreds is None:
            bad(0)
        i = 2
    value = (hundreds or 0) * 100
    if i == len(t):
        if hundreds:
            return value
        bad(i - 1)
    if hundreds is not None and tok(i) in ("lẻ", "linh"):
        if i + 2 != len(t):
            bad(i + 2)
        return value + unit(i + 1)
    if tok(i) == "mười":
        value += 10
        if i + 1 == len(t):
            return value
        if i + 2 != len(t):
            bad(i + 2)
        return value + unit(i + 1)
    d = digit(tok(i))
    if d is not None and d >= 2 and tok(i + 1) == "mươi":
        value += d * 10
        if i + 2 == len(t):
            return value
        if i + 3 != len(t):
            bad(i + 3)
        return value + unit(i + 2)
    if hundreds is None and i + 1 == len(t):
        return unit(i)
    bad(i)


def words_to_number(text):
    tokens = [x for x in re.split(r"[\s,]+", unicodedata.normalize("NFC", text).lower()) if x]
    if not tokens:
        raise Fail("EMPTY", "Text is empty")

    def invalid(w):
        return Fail("INVALID_WORDS", f'Unexpected word "{w}"', "Use words as produced by moneyToWords.")

    pos = 0
    negative = tokens[0] == "âm"
    if negative:
        pos = 1
    end = pos
    while end < len(tokens) and tokens[end] in NUMBER_WORDS:
        end += 1
    if end == pos:
        raise invalid(tokens[pos] if pos < len(tokens) else "âm")
    num = tokens[pos:end]

    total = 0
    try:
        if not (len(num) == 1 and num[0] == "không"):
            prev = float("inf")
            i = 0
            while i < len(num):
                start = i
                while i < len(num) and num[i] not in SCALE_BASE and num[i] != "tỷ":
                    i += 1
                if i == start:
                    raise BadWord(num[i])
                group = parse_group(num[start:i])
                rem = 0
                k = 0
                if i < len(num) and num[i] in SCALE_BASE:
                    rem = SCALE_BASE[num[i]]
                    i += 1
                while i < len(num) and num[i] == "tỷ":
                    k += 1
                    i += 1
                index = 3 * k + rem
                if index >= prev or (index == 0 and i < len(num)):
                    raise BadWord(num[start])
                prev = index
                if group > 0 and len(str(group)) + 3 * index > MAX_MONEY_DIGITS:
                    raise too_long()
                total += group * 1000**index
    except BadWord as e:
        raise invalid(str(e))

    rest = tokens[end:]
    bad = next((w for j, w in enumerate(rest) if j > 0 and w in NUMBER_WORDS), None)
    if rest and (bad is not None or rest[0] == "âm"):
        raise invalid(rest[0])
    chan = False
    if rest and rest[-1] == "chẵn":
        chan = True
        rest.pop()
    digits = str(total)
    if len(digits) > MAX_MONEY_DIGITS:
        raise too_long()
    return {
        "ok": True,
        "value": digits,
        "negative": negative,
        "unit": " ".join(rest) if rest else None,
        "chan": chan,
    }


def main(argv):
    p = argparse.ArgumentParser(description="Vietnamese money words (offline)")
    sub = p.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("words")
    w.add_argument("amount")
    w.add_argument("--thousand", default="nghìn")
    w.add_argument("--odd", default="lẻ")
    w.add_argument("--plain", action="store_true")
    q = sub.add_parser("parse")
    q.add_argument("text")
    a = p.parse_args(argv)
    try:
        if a.cmd == "words":
            if a.thousand not in THOUSAND:
                raise Fail("INVALID_OPTION", f'Unknown --thousand "{a.thousand}"', "Use nghin or ngan.")
            if a.odd not in ODD:
                raise Fail("INVALID_OPTION", f'Unknown --odd "{a.odd}"', "Use le or linh.")
            out = money_to_words(
                a.amount, THOUSAND[a.thousand], ODD[a.odd], "" if a.plain else "đồng"
            )
        else:
            out = words_to_number(a.text)
        code = 0
    except Fail as e:
        out, code = error_json(e), 1
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
