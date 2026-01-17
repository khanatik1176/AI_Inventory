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
    ]

    for st in strategies:
        try:
            t = page.extract_tables(table_settings=st) or []
            if t:
                candidates.extend(t)
        except Exception:
            pass

    return candidates


def _find_header_like_row(rows):
    best_i = None
    best_score = -1

    for i, r in enumerate(rows[:20]):
        row = [_norm(c) for c in r]
        joined = " ".join(row)

        score = 0
        for key in ["MODEL", "TYPE", "RP", "MRP", "COLOR", "COLOUR", "FEATURE", "WARRANTY", "MOP"]:
            if key in joined:
                score += 1

        if score > best_score and ("TYPE" in joined) and ("RP" in joined or "MRP" in joined):
            best_score = score
            best_i = i

    return best_i


def _make_stable_headers(raw_headers):
    cleaned = []
    for i, h in enumerate(raw_headers):
        h = _clean_cell(h)
        if not h or h in {"-", "_"}:
            h = f"COL_{i+1}"
        if len(h) > 60:
            h = h[:60]
        cleaned.append(h)

    seen = {}
    out = []
    for h in cleaned:
        if h not in seen:
            seen[h] = 1
            out.append(h)
        else:
            seen[h] += 1
            out.append(f"{h}_{seen[h]}")
    
    return out


def _idx(headers, *names):
    for n in names:
        n = _norm(n)
        for i, h in enumerate(headers):
            if _norm(h) == n or n in _norm(h):
                return i
    return None


def _looks_like_data_row(model, ptype, rp, mrp) -> bool:
    if not model or len(model) < 2:
        return False
    if not ptype:
        return False

    def is_num(x):
        x = _clean_cell(x).replace(",", "")
        return bool(re.fullmatch(r"\d+(\.\d+)?", x))

    return is_num(rp) or is_num(mrp)


def parse_pdf(pdf_file) -> tuple[pd.DataFrame, list[str]]:
    all_rows = []
    last_headers = None
    seen_rows = set()

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
                    if last_headers is None:
                        continue
                    headers = last_headers
                    data_rows = cleaned
                else:
                    headers = _make_stable_headers(cleaned[header_idx])
                    last_headers = headers
                    data_rows = cleaned[header_idx + 1 :]

                type_idx = _idx(headers, "TYPE")
                rp_idx = _idx(headers, "RP", "R.P", "R/P")
                mrp_idx = _idx(headers, "MRP", "M.R.P", "M/RP")
                color_idx = _idx(headers, "COLOR", "COLOUR")

                if type_idx is None or (rp_idx is None and mrp_idx is None):
                    continue

                for r in data_rows:
                    if not any(_clean_cell(x) for x in r):
                        continue
                    if _is_footer_row(r):
                        break

                    if len(r) < len(headers):
                        r = r + [""] * (len(headers) - len(r))
                    elif len(r) > len(headers):
                        r = r[: len(headers)]

                    row_dict = {headers[i]: _clean_cell(r[i]) for i in range(len(headers))}

                    ptype = row_dict.get(headers[type_idx], "")
                    rp = row_dict.get(headers[rp_idx], "") if rp_idx is not None else ""
                    mrp = row_dict.get(headers[mrp_idx], "") if mrp_idx is not None else ""
                    color = row_dict.get(headers[color_idx], "") if color_idx is not None else ""

                    left_end = color_idx if color_idx is not None else type_idx
                    model_parts = r[:left_end] if left_end else r[:type_idx]
                    model = _clean_cell(" ".join([x for x in model_parts if _clean_cell(x)]))

                    if not _looks_like_data_row(model, ptype, rp, mrp):
                        continue

                    # ✅ Create unique row identifier to avoid duplicates
                    row_key = f"{model}|{ptype}|{rp}|{mrp}"
                    if row_key in seen_rows:
                        continue
                    seen_rows.add(row_key)

                    # ✅ Build clean row with only valid columns
                    clean_row = {
                        "MODEL": model,
                        "TYPE": ptype,
                        "RP": rp,
                        "MRP": mrp,
                        "COLOR": color,
                    }

                    # ✅ Add extra fields (skip junk columns)
                    for k, v in row_dict.items():
                        norm_k = _norm(k)
                        
                        # Skip model columns
                        if norm_k in {"MODEL", "TYPE", "COLOR", "COLOUR", "RP", "MRP"}:
                            continue
                        
                        # Skip serial numbers
                        if norm_k in {"SL NO", "SNO", "S. NO", "S.NO"}:
                            continue
                        
                        # Skip photo columns
                        if "PHOTO" in norm_k:
                            continue
                        
                        # Skip auto-generated columns
                        if norm_k.startswith("COL_"):
                            continue
                        
                        # Skip fragmented columns (broken headers)
                        if len(k) < 3 or k in {"MOD", "EL", "St", "ock", "ble", "Avaia"}:
                            continue
                        
                        # Only add if value exists
                        if v and v.strip():
                            clean_row[k] = v

                    all_rows.append(clean_row)

    df = pd.DataFrame(all_rows)
    
    # ✅ Drop any columns that are all NaN
    df = df.dropna(axis=1, how='all')
    
    return df, list(df.columns)