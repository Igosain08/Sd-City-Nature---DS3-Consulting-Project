import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExploratoryAnalysis } from './pages/ExploratoryAnalysis';
import { HotspotAnalysis } from './pages/HotspotAnalysis';
import { CityComparison } from './pages/CityComparison';
import { StrategyRecommendations } from './pages/StrategyRecommendations';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ExploratoryAnalysis />} />
          <Route path="hotspots" element={<HotspotAnalysis />} />
          <Route path="comparison" element={<CityComparison />} />
          <Route path="strategy" element={<StrategyRecommendations />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
