import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PerformancePage from './pages/PerformancePage';
import AttributionPage from './pages/AttributionPage';
import ReportPage from './pages/ReportPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="attribution" element={<AttributionPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
