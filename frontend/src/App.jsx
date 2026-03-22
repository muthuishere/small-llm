import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Landing } from './pages/Landing';
import { ServerPage } from './pages/ServerPage';
import { BrowserPage } from './pages/BrowserPage';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Landing />} />
          <Route path="/server"  element={<ServerPage />} />
          <Route path="/browser" element={<BrowserPage />} />
          <Route path="*"        element={<Landing />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}

