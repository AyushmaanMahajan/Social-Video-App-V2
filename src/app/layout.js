import "./globals.css";
import { Manrope, Sora } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "CNXR",
  description: "CNXR is a social video app for spontaneous conversations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${sora.variable}`}>
      <body>
        <div className="ambient-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
