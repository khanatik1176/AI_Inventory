import "./globals.css";
import { Toaster } from "react-hot-toast";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: 20 }}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#0b1220", color: "#fff" },
          }}
        />
        {children}
      </body>
    </html>
  );
}
