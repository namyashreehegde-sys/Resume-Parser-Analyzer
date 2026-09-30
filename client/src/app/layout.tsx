import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resume Parser & Analyzer',
  description: 'AI-powered resume analysis, skill extraction, and job matching.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-blue-600 tracking-tight">
              📄 Resume Parser &amp; Analyzer
            </h1>
            <span className="text-xs text-gray-400">AI-powered analysis</span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-gray-200 text-center text-xs text-gray-400 py-4 mt-8">
          Resume Parser &amp; Analyzer · AI Analysis Layer
        </footer>
      </body>
    </html>
  );
}
