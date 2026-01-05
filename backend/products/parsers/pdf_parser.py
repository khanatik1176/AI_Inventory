import pdfplumber
import pandas as pd

EXPECTED_COLUMNS = [
    "Product Name",
    "Brand Name",
    "Product Type",
    "Retail Price",
    "Sale Price",
    "Model Number",
    "Color",
    "Variants",
    "Vendor Name",
]

def parse_pdf(file):
    rows = []

    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue

            headers = table[0]
            if headers != EXPECTED_COLUMNS:
                raise ValueError("PDF columns do not match template")

            rows.extend(table[1:])

    return pd.DataFrame(rows, columns=EXPECTED_COLUMNS)
