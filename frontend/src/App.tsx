import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReservationPlanner from './pages/ReservationPlanner';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/reservation-planner" replace />} />
          <Route path="/reservation-planner" element={<ReservationPlanner />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
