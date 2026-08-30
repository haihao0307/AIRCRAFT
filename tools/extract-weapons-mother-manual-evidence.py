#!/usr/bin/env python3
"""Find page-numbered evidence phrases in a locally supplied technical manual."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("terms", nargs="+")
    parser.add_argument("--context", type=int, default=220)
    args = parser.parse_args()
    reader = PdfReader(str(args.pdf.resolve()))
    hits = []
    compiled = [(term, re.compile(re.escape(term), re.IGNORECASE)) for term in args.terms]
    for page_index, page in enumerate(reader.pages):
        text = normalized(page.extract_text() or "")
        for term, pattern in compiled:
            for match in pattern.finditer(text):
                start = max(0, match.start() - args.context)
                end = min(len(text), match.end() + args.context)
                hits.append(
                    {
                        "term": term,
                        "pdfPageIndex": page_index,
                        "printedPageCandidate": page_index + 1,
                        "context": text[start:end],
                    }
                )
                break
    print(
        json.dumps(
            {
                "source": str(args.pdf.resolve()),
                "pageCount": len(reader.pages),
                "terms": args.terms,
                "hits": hits,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
