import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DemoPage from './pages/DemoPage';
import BDHDeepDivePage from './pages/BDHDeepDivePage';
import AboutPage from './pages/AboutPage';
export default function App() { return <Routes><Route element={<Layout />}><Route index element={<DemoPage />} /><Route path="bdh" element={<BDHDeepDivePage />} /><Route path="about" element={<AboutPage />} /></Route></Routes>; }
