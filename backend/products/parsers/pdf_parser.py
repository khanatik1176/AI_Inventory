import re
import pandas as pd
import pdfplumber
from typing import Tuple, List, Dict, Any


KEYWORDS = ["model", "type", "rp", "mrp", "color"]


def _clean_cell(v: Any) -> str:
    if v is None:
        return ""
    s = str(v)
    s = s.replace("\u00a0", " ")  # nbsp
    s = s.replace("\n", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _normalize_header(h: str) -> str:
    h = _clean_cell(h)
    h = h.replace("S/L", "SL").replace("S\\L", "SL")
    # common spelling inconsistency found in PDFs
    h = h.replace("Avaiable", "Available")
    return h


def _header_score(cells: List[str]) -> int:
    text = " ".join([c.lower() for c in cells if c]).lower()
    return sum(1 for k in KEYWORDS if k in text)


def _is_header_row(cells: List[str]) -> bool:
    # must contain at least 3 of the keyword signals
    if _header_score(cells) < 3:
        return False

    # additionally must include a "MODEL" header explicitly (common in your PDFs)
    return any("model" in c.lower() for c in cells if c)


def _looks_like_brand_banner(cells: List[str]) -> bool:
    # Many pages start with "QCY BANGLADESH" or "HiFuture Bangladesh"
    joined = " ".join(cells).lower()
    return ("bangladesh" in joined and "distributor" in joined) or (
        len(cells) <= 2 and "bangladesh" in joined
    )


def parse_pdf(pdf_file) -> Tuple[pd.DataFrame, List[str]]:
    """
    Robust PDF table parser:
    - Uses pdfplumber.extract_tables() instead of extract_text()
    - Detects header row inside extracted tables
    - Supports multiple header sections across pages
    - Returns:
        df: DataFrame with extracted rows
        all_columns: list of union columns found
    """

    rows: List[Dict[str, str]] = []
    all_columns = set()

    with pdfplumber.open(pdf_file) as pdf:
        current_headers: List[str] = []

        for page in pdf.pages:
            tables = page.extract_tables() or []
            if not tables:
                continue

            for table in tables:
                # Table is a list of rows; each row is list of cells
                for raw_row in table:
                    cleaned_row = [_clean_cell(c) for c in (raw_row or [])]

                    # skip empty rows
                    if not any(cleaned_row):
                        continue

                    # skip brand/banner lines that appear inside tables
                    if _looks_like_brand_banner(cleaned_row):
                        continue

                    # detect header row
                    if _is_header_row(cleaned_row):
                        headers = [_normalize_header(h) for h in cleaned_row]
                        # remove empty headers and keep indices
                        idx_keep = [i for i, h in enumerate(headers) if h]
                        headers = [headers[i] for i in idx_keep]

                        current_headers = headers
                        all_columns.update(current_headers)
                        continue

                    # if no header found yet, can't map data
                    if not current_headers:
                        continue

                    # Align row length to header length:
                    # 1) drop cells where header was empty originally (handled by idx_keep logic above)
                    # But in case some tables produce extra leading empty cells, trim/pad.

                    data_cells = cleaned_row

                    # If more cells than headers: merge extras into last column
                    if len(data_cells) > len(current_headers):
                        data_cells = data_cells[: len(current_headers) - 1] + [
                            " ".join(data_cells[len(current_headers) - 1 :]).strip()
                        ]

                    # If fewer cells than headers: pad with empty
                    if len(data_cells) < len(current_headers):
                        data_cells = data_cells + [""] * (
                            len(current_headers) - len(data_cells)
                        )

                    row_dict = dict(zip(current_headers, data_cells))

                    # Must have MODEL-like value in this row (avoid footers / junk)
                    # header could be "MODEL" or "Model"
                    model_key = None
                    for k in row_dict.keys():
                        if k.lower() == "model":
                            model_key = k
                            break
                    if model_key and not row_dict.get(model_key, "").strip():
                        continue

                    rows.append(row_dict)

    df = pd.DataFrame(rows)
    if not df.empty:
        df.columns = [_normalize_header(c) for c in df.columns]

    return df, sorted(list(all_columns))
