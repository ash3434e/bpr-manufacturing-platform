import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Package, Truck, Factory, TrendingUp, Bell, Building2, Search, LogOut, FlaskConical, Calendar, ShoppingCart, Siren, Users } from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/plants', icon: Building2, label: 'Multi-Plant View' },
    { to: '/alerts', icon: Bell, label: 'Alerts & Actions' },
    { to: '/emergency', icon: Siren, label: 'Emergency Actions' },
  ]},
  { section: 'Operations', items: [
    { to: '/orders', icon: ShoppingCart, label: 'Order Management' },
    { to: '/scheduling', icon: Calendar, label: 'Auto-Scheduling' },
    { to: '/inventory', icon: Package, label: 'Inventory & BPR' },
    { to: '/production', icon: Factory, label: 'Production' },
    { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  ]},
  { section: 'Intelligence', items: [
    { to: '/forecast', icon: TrendingUp, label: 'Demand Forecast' },
    { to: '/simulation', icon: FlaskConical, label: 'What-If Simulation' },
    { to: '/traceability', icon: Search, label: 'Traceability' },
  ]},
  { section: 'Admin', items: [
    { to: '/users', icon: Users, label: 'User Management' },
  ]},
];

const pageTitles = {
  '/': 'Dashboard',
  '/inventory': 'Inventory & BPR Management',
  '/suppliers': 'Supplier Analytics',
  '/production': 'Production Monitoring',
  '/forecast': 'Demand Forecasting',
  '/alerts': 'Alerts & Decision Engine',
  '/plants': 'Multi-Plant Overview',
  '/traceability': 'Batch Traceability',
  '/simulation': 'What-If Simulation',
  '/scheduling': 'Auto-Scheduling',
  '/orders': 'Order Management',
  '/emergency': 'Emergency Actions',
  '/users': 'User Management',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">B</div>
            <div>
              <h1>BPR Platform<span>Manufacturing Intelligence</span></h1>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout"><LogOut size={18} /></button>
        </div>
      </aside>
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-title">{pageTitles[location.pathname] || 'BPR Platform'}</div>
        </div>
        <div className="page-content fade-in" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
