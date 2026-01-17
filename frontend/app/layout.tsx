import "./globals.css";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
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