
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage.jsx';
import GuidePage from '@/pages/GuidePage.jsx';
import ToolsPage from '@/pages/ToolsPage.jsx';
import BlogPage from '@/pages/BlogPage.jsx';
import ContactPage from '@/pages/ContactPage.jsx';
import DataPage from '@/pages/DataPage.jsx';
import MemoryMapPage from '@/pages/MemoryMapPage.jsx';
import DonatePage from '@/pages/DonatePage.jsx';
import SwarmPage from '@/pages/SwarmPage.jsx';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="/memory-map" element={<MemoryMapPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/swarm" element={<SwarmPage />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
