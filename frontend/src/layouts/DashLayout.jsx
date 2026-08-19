import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAuth, logout } from "../api/authService";
import { fetchNotifications, markNotificationRead } from "../api/notificationService";

const DashLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [workspaceAlert, setWorkspaceAlert] = useState(null);
  const isSceneEditor = /\/projects\/\d+$/.test(pathname);

  useEffect(() => { if (pathname === "/dashboard") document.title = "Vistri 360 | Dashboard"; }, [pathname]);
  useEffect(() => { if (pathname === "/dashboard") fetchNotifications().then((response) => setNotifications(response.data ?? [])).catch(() => {}); }, [pathname]);
  useEffect(() => {
    const handleWorkspaceAlert = (event) => {
      setWorkspaceAlert(event.detail);
      window.setTimeout(() => setWorkspaceAlert(null), 4500);
    };
    window.addEventListener("workspace-alert", handleWorkspaceAlert);
    return () => window.removeEventListener("workspace-alert", handleWorkspaceAlert);
  }, []);

  const handleLogout = async () => { try { await logout(); } finally { clearAuth(); navigate("/auth/signin", { replace: true }); } };

  return <>
    {workspaceAlert && <div role="status" aria-live="polite" className={`fixed right-4 top-20 z-[100003] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl sm:right-7 ${workspaceAlert.type === "error" ? "border-red-200 bg-white text-navy" : "border-primary/30 bg-navy/95 text-white"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${workspaceAlert.type === "error" ? "bg-red-100 text-red-700" : "bg-primary text-white"}`}>{workspaceAlert.type === "error" ? "!" : "✓"}</span><span className="font-semibold">{workspaceAlert.message}</span><button type="button" aria-label="Dismiss alert" onClick={() => setWorkspaceAlert(null)} className="ml-2 rounded-lg px-2 py-1 text-lg leading-none text-current/50 transition hover:text-current">×</button></div>}
    {!isSceneEditor && <header className="fixed right-4 top-4 z-[100002] flex items-center gap-2">
      <div className="relative"><button type="button" onClick={() => setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-lg transition hover:bg-primary/10" aria-label="Notifications"><Bell aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />{notifications.some((item) => !item.read_at) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}</button>{open && <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-surface bg-white p-3 text-navy shadow-2xl"><p className="px-2 py-1 text-xs font-bold uppercase tracking-widest">Notifications</p>{notifications.length ? notifications.map((item) => <button key={item.id} type="button" onClick={() => { markNotificationRead(item.id); setNotifications((items) => items.map((current) => current.id === item.id ? { ...current, read_at: new Date().toISOString() } : current)); }} className="mt-2 block w-full rounded-xl p-2 text-left hover:bg-surface"><p className="text-xs font-bold">{item.title}</p><p className="mt-1 text-xs text-navy/60">{item.message}</p></button>) : <p className="p-2 text-sm text-navy/50">No notifications.</p>}</div>}</div>
      <Link to="/dashboard/profile" className="inline-flex h-10 items-center rounded-xl bg-white px-3 text-xs font-bold text-navy shadow-lg transition hover:bg-primary/10">Profile</Link><button type="button" onClick={handleLogout} className="inline-flex h-10 items-center rounded-xl bg-navy px-3 text-xs font-bold text-white shadow-lg transition hover:bg-primary">Logout</button>
    </header>}
    <main className="min-h-screen w-full font-jakarta"><Outlet /></main>
  </>;
};

export default DashLayout;
