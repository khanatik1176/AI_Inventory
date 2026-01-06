import pandas as pd
import pdfplumber
from io import BytesIO
import re


def normalize_column_name(col_name):
    """
    Normalize column names for better matching.
    Removes special characters, extra spaces, and converts to lowercase.
    """
    if not col_name:
        return ""
    
    # Convert to string and lowercase
    col_name = str(col_name).lower().strip()
    
    # Remove special characters and extra spaces
    col_name = re.sub(r'[^\w\s]', '', col_name)
    col_name = re.sub(r'\s+', ' ', col_name)
    
    return col_name


def map_column_to_field(col_name):
    """
    Map PDF column names to database field names.
    Returns the mapped field name or None if it should be excluded.
    """
    normalized = normalize_column_name(col_name)
    
    # Columns to exclude
    exclude_patterns = [
        'sl no', 's/l no', 'serial', 'serial no', 'sn', 'no',
        'photo', 'photos', 'image', 'images', 'picture', 'pictures',
        'img', 'awei bangladesh', 'company name', 'header'
    ]
    
    # Check if column should be excluded
    for pattern in exclude_patterns:
        if pattern in normalized:
            return None
    
    # Column mapping dictionary - maps various possible names to standard fields
    column_mapping = {
        # Product Name variations
        'product name': 'Product Name',
        'product': 'Product Name',
        'name': 'Product Name',
        'item name': 'Product Name',
        'item': 'Product Name',
        
        # Brand Name variations
        'brand name': 'Brand Name',
        'brand': 'Brand Name',
        'manufacturer': 'Brand Name',
        
        # Product Type variations
        'product type': 'Product Type',
        'type': 'Product Type',
        'types': 'Product Type',
        'category': 'Product Type',
        'categories': 'Product Type',
        
        # Retail Price variations
        'retail price': 'Retail Price',
        'retail': 'Retail Price',
        'rp': 'Retail Price',
        'price': 'Retail Price',
        'cost': 'Retail Price',
        
        # Sale Price variations
        'sale price': 'Sale Price',
        'sale': 'Sale Price',
        'mrp': 'Sale Price',
        'selling price': 'Sale Price',
        'market price': 'Sale Price',
        
        # Model Number variations
        'model number': 'Model Number',
        'model no': 'Model Number',
        'model': 'Model Number',
        'model name': 'Model Number',
        'sku': 'Model Number',
        
        # Color variations
        'color': 'Color',
        'colour': 'Color',
        'colors': 'Color',
        'colours': 'Color',
        
        # Variants variations
        'variants': 'Variants',
        'variant': 'Variants',
        'variation': 'Variants',
        'variations': 'Variants',
        'options': 'Variants',
        
        # Vendor Name variations
        'vendor name': 'Vendor Name',
        'vendor': 'Vendor Name',
        'supplier': 'Vendor Name',
        'supplier name': 'Vendor Name',
    }
    
    # Try to find a match
    if normalized in column_mapping:
        return column_mapping[normalized]
    
    # If no match found, return original column name as-is (for extra fields from PDF)
    return str(col_name).strip()


def parse_pdf(pdf_file):
    """
    Parse a PDF file and extract tabular data.
    Returns a DataFrame with mapped columns and list of all columns found.
    """
    tables = []
    
    # Read PDF file
    pdf_bytes = BytesIO(pdf_file.read())
    
    with pdfplumber.open(pdf_bytes) as pdf:
        for page in pdf.pages:
            # Extract tables from each page
            page_tables = page.extract_tables()
            if page_tables:
                for table in page_tables:
                    if table:
                        tables.extend(table)
    
    if not tables:
        raise ValueError("No tables found in PDF")
    
    # Convert to DataFrame
    if len(tables) > 0:
        headers = tables[0]
        data_rows = tables[1:]
        
        # Clean and map headers
        mapped_headers = []
        columns_to_keep = []
        original_to_mapped = {}  # Track which columns map to same field
        
        for i, h in enumerate(headers):
            original_header = str(h).strip() if h else f"Column_{i}"
            mapped_header = map_column_to_field(original_header)
            
            # Skip excluded columns
            if mapped_header is None:
                continue
            
            # Track mapping for merging duplicate standard fields
            if mapped_header not in original_to_mapped:
                original_to_mapped[mapped_header] = []
            original_to_mapped[mapped_header].append(i)
            
            mapped_headers.append(mapped_header)
            columns_to_keep.append(i)
        
        # Filter data rows to keep only non-excluded columns
        filtered_data_rows = []
        for row in data_rows:
            filtered_row = [row[i] if i < len(row) else "" for i in columns_to_keep]
            filtered_data_rows.append(filtered_row)
        
        # Create DataFrame with mapped headers
        df = pd.DataFrame(filtered_data_rows, columns=mapped_headers)
        
        # Clean data - replace None with empty string
        df = df.fillna("")
        
        # Remove completely empty rows
        df = df.replace("", pd.NA).dropna(how="all").fillna("")
        
        # Strip whitespace from all string columns
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.strip()
        
        # Merge duplicate standard columns (e.g., multiple columns mapped to "Product Name")
        # Keep first non-empty value across duplicates
        seen_columns = set()
        columns_to_drop = []
        
        for col in df.columns:
            if col in seen_columns:
                columns_to_drop.append(col)
            else:
                seen_columns.add(col)
        
        # For duplicate columns, merge their values before dropping
        for col in set(columns_to_drop):
            # Get all positions of this column
            col_positions = [i for i, c in enumerate(df.columns) if c == col]
            if len(col_positions) > 1:
                # Merge values: take first non-empty value
                df.iloc[:, col_positions[0]] = df.iloc[:, col_positions].apply(
                    lambda x: next((val for val in x if val and str(val).strip()), ""),
                    axis=1
                )
        
        # Drop duplicate columns (keep first)
        df = df.loc[:, ~df.columns.duplicated(keep='first')]
        
        all_columns = df.columns.tolist()
        
        # Remove any remaining empty rows
        df = df[df.apply(lambda x: x.astype(str).str.strip().ne('').any(), axis=1)]
        
        return df, all_columns
    
    raise ValueError("Could not parse PDF tables")