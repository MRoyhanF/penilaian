import '../styles/index.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';

export const metadata = {
  title: 'Sistem Penjurian Lomba',
  description: 'Sistem Penjurian Lomba Modern & Real-time dengan Next.js dan Supabase',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
