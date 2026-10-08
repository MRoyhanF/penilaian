'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="page-loading-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner-icon text-accent" style={{ fontSize: '2rem' }}>⏳</div>
      <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Memuat sistem penjurian...</p>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
