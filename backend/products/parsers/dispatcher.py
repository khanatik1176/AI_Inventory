from .excel_parser import parse_excel
from .pdf_parser import parse_pdf

def parse_uploaded_file(file):
    name = file.name.lower()

    if name.endswith(".xlsx"):
        return parse_excel(file)

    if name.endswith(".pdf"):
        return parse_pdf(file)

    raise ValueError("Unsupported file type")
