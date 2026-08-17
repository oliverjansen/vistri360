import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, logout } from "../api/authService";
import { fetchNotifications, markNotificationRead } from "../api/notificationService";

const DashLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const isSceneEditor = /\/projects\/\d+$/.test(pathname);

  useEffect(() => { if (pathname === "/dashboard") document.title = "Vistri 360 | Dashboard"; }, [pathname]);
  useEffect(() => { if (pathname === "/dashboard") fetchNotifications().then((response) => setNotifications(response.data ?? [])).catch(() => {}); }, [pathname]);
  const handleLogout = async () => { try { await logout(); } finally { clearAuth(); navigate("/auth/signin", { replace: true }); } };

  return <>
    {!isSceneEditor && <header className="fixed right-4 top-4 z-[100002] flex items-center gap-2">
      <div className="relative"><button type="button" onClick={() => setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-navy shadow-lg" aria-label="Notifications">🔔{notifications.some((item) => !item.read_at) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}</button>{open && <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-surface bg-white p-3 text-navy shadow-2xl"><p className="px-2 py-1 text-xs font-bold uppercase tracking-widest">Notifications</p>{notifications.length ? notifications.map((item) => <button key={item.id} type="button" onClick={() => { markNotificationRead(item.id); setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, read_at: new Date().toISOString() } : current)); }} className="mt-2 block w-full rounded-xl p-2 text-left hover:bg-surface"><p className="text-xs font-bold">{item.title}</p><p className="mt-1 text-xs text-navy/60">{item.message}</p></button>) : <p className="p-2 text-sm text-navy/50">No notifications.</p>}</div>}</div>
      <Link to="/dashboard/profile" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-navy shadow-lg">Profile</Link><button type="button" onClick={handleLogout} className="rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-primary">Logout</button>
    </header>}
    <main className="min-h-screen w-full font-jakarta"><Outlet /></main>
  </>;
};

export default DashLayout;
