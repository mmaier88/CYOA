import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreatePage } from './pages/CreatePage';
import { GeneratingPage } from './pages/GeneratingPage';
import { PlayPage } from './pages/PlayPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/generating/:jobId" element={<GeneratingPage />} />
          <Route path="/play/:jobId" element={<PlayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
