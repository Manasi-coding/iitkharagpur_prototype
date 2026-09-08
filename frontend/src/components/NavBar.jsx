import { NavLink } from 'react-router-dom';
const links = [['/', 'Demo'], ['/bdh', 'BDH Deep Dive'], ['/about', 'About & Sources']];
export default function NavBar() { return <header className="nav"><div className="brand"><div className="brand-mark">∿</div><span>Hebbian Synapse Lab</span><small>v2.4-hebbian-sparse</small></div><nav>{links.map(([to,label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><div className="nav-status"><i /> EMPIRICAL STATUS: VERIFIED <span>PARAMS: N=64 | P_CRIT ≈ 9</span></div></header>; }
