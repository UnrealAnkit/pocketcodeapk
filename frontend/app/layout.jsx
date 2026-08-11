import "./globals.css";

export const metadata = {
  title: "PocketCode — Control your code editor from your phone",
  description: "PocketCode gives your phone a direct window into your local development environment.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
