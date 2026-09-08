import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';
export default function Layout() { return <div className="app-shell"><NavBar /><main><Outlet /></main><Footer /></div>; }
