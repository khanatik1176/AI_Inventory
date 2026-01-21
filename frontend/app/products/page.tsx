// "use client";

// import { useEffect, useState } from "react";
// import { getProducts, downloadnpmCSV } from "@/lib/api";

// type Product = {
//   id: number;
//   product_name: string;
//   brand_name: string;
//   sale_price: number;
//   post_excerpt: string;
// };

// export default function ProductsPage() {
//   const [products, setProducts] = useState<Product[]>([]);

//   useEffect(() => {
//     getProducts().then(setProducts);
//   }, []);

//   return (
//     <div>
//       <h1>Products</h1>

//       <button onClick={downloadCSV}>Download CSV</button>

//       <table border={1} cellPadding={8} style={{ marginTop: 20 }}>
//         <thead>
//           <tr>
//             <th>Name</th>
//             <th>Brand</th>
//             <th>Price</th>
//             <th>Excerpt</th>
//           </tr>
//         </thead>
//         <tbody>
//           {products.map((p) => (
//             <tr key={p.id}>
//               <td>{p.product_name}</td>
//               <td>{p.brand_name}</td>
//               <td>{p.sale_price}</td>
//               <td>{p.post_excerpt}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

import React from 'react'

const page = () => {
  return (
    <div>Products page</div>
  )
}

export default page
