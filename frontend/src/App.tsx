import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardDeskriptif } from './pages/DashboardDeskriptif';
import { DashboardPrediktif } from './pages/DashboardPrediktif';
import { AnalisisOlap } from './pages/AnalisisOlap';
import { Cube3D } from './pages/Cube3D';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardDeskriptif />} />
          <Route path="/predictive" element={<DashboardPrediktif />} />
          <Route path="/olap" element={<AnalisisOlap />} />
          <Route path="/cube" element={<Cube3D />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
