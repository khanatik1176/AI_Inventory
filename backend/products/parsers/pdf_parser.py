import re
import pandas as pd
import pdfplumber


def _clean_cell(x):
    if x is None:
        return ""
    s = str(x)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _norm(s: str) -> str:
    s = _clean_cell(s).upper()
    s = s.replace("S/L", "SL").replace("S\\L", "SL")
    s = s.replace("MODEL NO.", "MODEL NO")
    s = s.replace("MODEL#", "MODEL")
    return s


def _is_footer_row(row) -> bool:
    joined = " ".join(_clean_cell(c).lower() for c in row)
    return ("official distributor" in joined) or ("price list" in joined)


def _extract_tables(page):
    """
    Try multiple strategies because different PDFs behave differently.
    """
    candidates = []

    strategies = [
        {
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "intersection_tolerance": 5,
            "snap_tolerance": 3,
            "join_tolerance": 3,
            "edge_min_length": 10,
            "min_words_vertical": 1,
            "min_words_horizontal": 1,
            "text_tolerance": 2,
        },
        {
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
            "text_tolerance": 2,
            "intersection_tolerance": 5,
        },
        # extra fallback: text + bigger tolerance
        {
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
            "text_tolerance": 6,
            "intersection_tolerance": 8,
        },
    ]

    for st in strategies:
        try:
            t = page.extract_tables(table_settings=st) or []
            if t:
                candidates.extend(t)
        except Exception:
            pass

    return candidates


def _find_header_like_row(table_rows):
    """
    We don’t rely on perfect header cells because SoundPEATS header is split.
    We detect a header-like row by presence of TYPE/RP/MRP/COLOR (or close variants).
    """
    best_i = None
    best_score = -1

    for i, r in enumerate(table_rows[:15]):  # header usually near top
        row = [_norm(c) for c in r]
        joined = " ".join(row)

        score = 0
        for key in ["TYPE", "RP", "MRP", "COLOR", "COLOUR", "MODEL", "MOD", "EL"]:
            if key in joined:
                score += 1

        # must have at least TYPE + RP/MRP in some form
        if score > best_score and (("TYPE" in joined) and ("RP" in joined or "MRP" in joined)):
            best_score = score
            best_i = i

    return best_i


def _index_of(col_tokens, *needles):
    """
    Find column index by matching cell tokens.
    """
    for n in needles:
        n = _norm(n)
        for i, c in enumerate(col_tokens):
            if c == n or n in c:
                return i
    return None


def _looks_like_data_row(model, ptype, rp, mrp) -> bool:
    # must have a model-ish string and at least one price
    if not model or len(model) < 2:
        return False
    if not ptype:
        return False

    # avoid obvious junk headers repeating
    bad = (model.upper() in ["MODEL", "MOD", "EL", "MODEL PHOTOS"])
    if bad:
        return False

    # price sanity: at least one numeric
    def is_num(x):
        x = _clean_cell(x).replace(",", "")
        return bool(re.fullmatch(r"\d+(\.\d+)?", x))

    return is_num(rp) or is_num(mrp)


def parse_pdf(pdf_file) -> tuple[pd.DataFrame, list[str]]:
    """
    Returns:
      df: rows extracted across all pages
      all_columns: union of all columns found
    """
    all_rows = []
    all_cols = set()

    pdf_file.seek(0)
    with pdfplumber.open(pdf_file) as pdf:
        for page in pdf.pages:
            tables = _extract_tables(page)
            if not tables:
                continue

            for table in tables:
                if not table or len(table) < 2:
                    continue

                cleaned = [[_clean_cell(c) for c in r] for r in table]
                header_idx = _find_header_like_row(cleaned)

                if header_idx is None:
                    continue

                header_row = cleaned[header_idx]
                header_tokens = [_norm(c) for c in header_row]

                # Find important columns by position
                type_idx = _index_of(header_tokens, "TYPE")
                rp_idx = _index_of(header_tokens, "RP", "R.P", "R/P")
                mrp_idx = _index_of(header_tokens, "MRP", "M.R.P", "M/RP")
                color_idx = _index_of(header_tokens, "COLOR", "COLOUR")

                if type_idx is None or (rp_idx is None and mrp_idx is None):
                    continue

                # Build our canonical schema
                canonical_cols = ["MODEL", "TYPE", "RP", "MRP", "COLOR"]
                all_cols.update(canonical_cols)

                data_rows = cleaned[header_idx + 1 :]

                for r in data_rows:
                    if not any(_clean_cell(x) for x in r):
                        continue
                    if _is_footer_row(r):
                        break

                    # pad row length
                    if len(r) < len(header_tokens):
                        r = r + [""] * (len(header_tokens) - len(r))
                    elif len(r) > len(header_tokens):
                        r = r[: len(header_tokens)]

                    # Extract by index
                    ptype = _clean_cell(r[type_idx]) if type_idx is not None else ""
                    rp = _clean_cell(r[rp_idx]) if rp_idx is not None else ""
                    mrp = _clean_cell(r[mrp_idx]) if mrp_idx is not None else ""
                    color = _clean_cell(r[color_idx]) if color_idx is not None else ""

                    # Model often spans multiple cells BEFORE color/type in SoundPEATS table
                    left_end = color_idx if color_idx is not None else type_idx
                    if left_end is None:
                        left_end = type_idx

                    # usually first col is SL, model starts from col 1
                    model_parts = r[1:left_end] if left_end and left_end > 1 else r[:left_end]
                    model = _clean_cell(" ".join([x for x in model_parts if _clean_cell(x)]))

                    if not _looks_like_data_row(model, ptype, rp, mrp):
                        continue

                    all_rows.append({
                        "MODEL": model,
                        "TYPE": ptype,
                        "RP": rp,
                        "MRP": mrp,
                        "COLOR": color,
                    })

    df = pd.DataFrame(all_rows)
    return df, sorted(list(all_cols))
