import "../styles.css";

export const metadata = {
  title: "PocketCode - Mobile control for your code editor",
  description: "PocketCode gives your phone a polished, direct window into your development environment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
