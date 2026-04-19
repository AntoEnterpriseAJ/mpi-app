import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LeaveManagementPage } from './pages/LeaveManagementPage';
import { UsersPage } from './pages/UsersPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/leave" element={<LeaveManagementPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
