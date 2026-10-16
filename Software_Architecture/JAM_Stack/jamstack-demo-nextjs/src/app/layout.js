import "./globals.css";

export const metadata = {
  title: "JAMstack Advanced Demo",
  description: "Next.js Static Site JAMstack",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
