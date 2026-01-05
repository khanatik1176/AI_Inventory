"use client";
import axios from "axios";
import { useEffect, useState } from "react";

export default function PdfUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  const fetchDocs = async () => {
    const res = await axios.get(
      "http://127.0.0.1:8000/api/products/documents/"
    );
    setDocs(res.data);
  };

  const upload = async () => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    await axios.post(
      "http://127.0.0.1:8000/api/products/upload-pdfs/",
      form
    );
    setFiles([]);
    fetchDocs();
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div>
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <button onClick={upload}>Upload PDFs</button>

      <h3>Uploaded Documents</h3>
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            {d.filename} — {d.total_rows} rows
          </li>
        ))}
      </ul>

      <a
        href="http://127.0.0.1:8000/api/products/export-excel/"
        target="_blank"
      >
        Download Excel
      </a>
    </div>
  );
}
