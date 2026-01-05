const API_BASE = "http://127.0.0.1:8000/api";

export async function uploadExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/products/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return res.json();
}

export async function getProducts() {
  const res = await fetch(`${API_BASE}/products/list/`, {
    cache: "no-store",
  });

  return res.json();
}

export function downloadCSV() {
  window.location.href = `${API_BASE}/products/export/`;
}
