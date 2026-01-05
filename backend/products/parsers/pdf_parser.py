import pdfplumber
import pandas as pd

COLUMNS = [
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
            if table:
                rows.extend(table[1:])  # skip header

    return pd.DataFrame(rows, columns=COLUMNS)
