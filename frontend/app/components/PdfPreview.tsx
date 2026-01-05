"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfPreview({ file }: { file: File }) {
  const [pages, setPages] = useState(0);

  return (
    <div className="border rounded p-4 max-h-[600px] overflow-auto">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
      >
        {Array.from(new Array(pages), (_, i) => (
          <Page key={i} pageNumber={i + 1} />
        ))}
      </Document>
    </div>
  );
}
