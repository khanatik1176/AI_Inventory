"use client";
import axios from "axios";
import { useEffect, useState } from "react";

type ProductRow = {
  document: string;
  product_name: string;
  brand_name: string;
  product_type: string;
  retail_price: number;
  sale_price: number;
  model_number: string;
  color: string;
  variants: string;
  vendor_name: string;
};

export default function ProductTable() {
  const [rows, setRows] = useState<ProductRow[]>([]);

  const fetchRows = async () => {
    const res = await axios.get(
      "http://127.0.0.1:8000/api/products/list/"
    );
    setRows(res.data);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  return (
    <div style={{ overflowX: "auto", marginTop: 30 }}>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Document</th>
            <th>Product</th>
            <th>Brand</th>
            <th>Type</th>
            <th>Retail</th>
            <th>Sale</th>
            <th>Model</th>
            <th>Color</th>
            <th>Variants</th>
            <th>Vendor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.document}</td>
              <td>{r.product_name}</td>
              <td>{r.brand_name}</td>
              <td>{r.product_type}</td>
              <td>{r.retail_price}</td>
              <td>{r.sale_price}</td>
              <td>{r.model_number}</td>
              <td>{r.color}</td>
              <td>{r.variants}</td>
              <td>{r.vendor_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
