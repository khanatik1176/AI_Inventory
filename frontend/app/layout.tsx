import "./globals.css";
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/app/components/ToastContainer';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}