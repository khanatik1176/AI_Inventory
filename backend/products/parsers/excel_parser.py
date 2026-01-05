import pandas as pd

REQUIRED_COLUMNS = [
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

def parse_excel(file):
    df = pd.read_excel(file)

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    return df.to_dict(orient="records")
