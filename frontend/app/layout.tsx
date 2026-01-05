export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: 20 }}>
        <nav style={{ marginBottom: 20 }}>
          <a href="/" style={{ marginRight: 15 }}>Upload</a>
          <a href="/products">Products</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
