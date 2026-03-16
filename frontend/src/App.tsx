import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExploratoryAnalysis } from './pages/ExploratoryAnalysis';
import { CityComparison } from './pages/CityComparison';
import { StrategyRecommendations } from './pages/StrategyRecommendations';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ExploratoryAnalysis />} />
          <Route path="comparison" element={<CityComparison />} />
          <Route path="strategy" element={<StrategyRecommendations />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;