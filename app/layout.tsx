import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MediaPicker Pro - Local Media Culling & Slideshow Studio',
  description: 'Fast, offline local media culling, fullscreen slideshow and gallery reviewer for photographers and editors.',
  openGraph: {
    title: 'MediaPicker Pro - Local Media Culling & Slideshow Studio',
    description: 'Fast, offline local media culling, fullscreen slideshow and gallery reviewer for photographers and editors.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediaPicker Pro - Local Media Culling & Slideshow Studio',
    description: 'Fast, offline local media culling, fullscreen slideshow and gallery reviewer for photographers and editors.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${newsreader.variable} dark`} data-theme="theme-1-obsidian-culler" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen transition-colors duration-200" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
