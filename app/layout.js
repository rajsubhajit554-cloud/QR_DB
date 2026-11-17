import "./globals.css";

export const metadata = {
  title: "QR STUDIO 0.2 — ডাইনামিক QR ও ক্লাউড রিডাইরেক্ট ম্যানেজার",
  description: "Create dynamic permanent QR codes connected with Google Sheets database and Vercel 302 redirects.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
