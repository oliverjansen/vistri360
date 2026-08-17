import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createClient, deleteClient, fetchClientsCached, invalidateClientsCache } from "../../api/ClientService";
import ScrollReveal from "../../components/ScrollReveal";
const fallbackClients = [];

const ClientCard = ({ client, onOpen, onDelete }) => (
  <article role="button" tabIndex="0" onClick={() => onOpen(client)} onKeyDown={(event) => event.key === "Enter" && onOpen(client)} className="group overflow-hidden rounded-2xl border border-white/70 bg-white text-left shadow-[0_16px_45px_rgba(19,41,61,0.07)] transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_55px_rgba(19,41,61,0.13)] focus:outline-none focus:ring-2 focus:ring-primary/60">
    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-navy"><span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">No preview available</span><div className="absolute inset-0 bg-linear-to-t from-navy/85 via-transparent to-transparent" /><span className="absolute left-4 top-4 rounded-full border border-white/20 bg-navy/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">{client.type ?? "Client"}</span><span className="absolute bottom-4 left-4 text-xs font-semibold text-white">{client.projects_count ?? 0} projects</span></div>
    <div className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate font-display text-xl font-bold text-navy">{client.name}</h2><p className="mt-1 text-sm text-navy/55">{client.contact_name ?? "No contact assigned"}</p></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg text-primary transition group-hover:bg-primary group-hover:text-white">→</span></div><div className="mt-5 flex items-center justify-between border-t border-surface pt-4 text-xs"><span className="font-bold text-primary">{client.status ?? "Draft"}</span><span className="text-navy/40">Open projects</span></div></div>
    <div className="flex justify-end px-5 pb-4"><button type="button" title="Delete client" aria-label={"Delete " + client.name} onClick={(event) => { event.stopPropagation(); onDelete(client); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-navy/35 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/50"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button></div>
  </article>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_name: "", type: "Residential" });
  const [notification, setNotification] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const notificationTimer = useRef(null);

  const notify = (type, message) => {
    setNotification({ type, message });
    window.clearTimeout(notificationTimer.current);
    notificationTimer.current = window.setTimeout(() => setNotification(null), 4500);
  };

  const loadClients = useCallback((forceRefresh = false) => {
    let active = true;
    if (forceRefresh) setIsRefreshing(true);

    fetchClientsCached(forceRefresh).then((response) => {
      if (!active) return;
      setClients(response.data?.length ? response.data : fallbackClients);
      setLastUpdated(new Date());
    }).catch((error) => {
      if (!active) return;
      console.error("Unable to load clients", error);
      setClients(fallbackClients);
    }).finally(() => {
      if (active) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadClients(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClients]);

  useEffect(() => () => window.clearTimeout(notificationTimer.current), []);

  const visibleClients = useMemo(() => {
    const value = query.toLowerCase().trim();
    return value ? clients.filter((client) => `${client.name} ${client.contact_name ?? ""} ${client.type ?? ""}`.toLowerCase().includes(value)) : clients;
  }, [clients, query]);

  const handleCreateClient = async (event) => {
    event.preventDefault();
    try {
      const response = await createClient(form);
      setClients((current) => [{ ...response.data, projects_count: 0 }, ...current]);
      invalidateClientsCache();
      setForm({ name: "", contact_name: "", type: "Residential" });
      setIsFormOpen(false);
      notify("success", `${response.data.name} was added successfully.`);
    } catch (error) {
      console.error("Unable to create client", error);
      notify("error", error.response?.data?.message ?? "Could not create the client. Please try again.");
    }
  };

  const requestDeleteClient = (client) => setClientToDelete(client);

  const handleDeleteClient = async (client) => {
    try {
      await deleteClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
      invalidateClientsCache();
      setClientToDelete(null);
      notify("success", client.name + " was moved to the deleted clients archive.");
    } catch (error) {
      console.error("Unable to delete client", error);
      notify("error", error.response?.data?.message ?? "Could not delete the client. Please try again.");
    }
  };

  return (
    <main className="dashboard-canvas min-h-screen bg-surface px-4 py-5 font-body text-navy sm:px-8 lg:px-12 lg:py-10">
      {notification && <div role="status" aria-live="polite" className={`dashboard-toast fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl sm:right-7 sm:top-7 ${notification.type === "success" ? "border-primary/30 bg-navy/95 text-white" : "border-red-200 bg-white text-navy"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${notification.type === "success" ? "bg-primary text-white" : "bg-red-100 text-red-700"}`}>{notification.type === "success" ? "✓" : "!"}</span><span className="font-semibold">{notification.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotification(null)} className="ml-2 rounded-lg px-2 py-1 text-lg leading-none text-current/50 transition hover:text-current">×</button></div>}
      {clientToDelete && <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setClientToDelete(null)}><section role="dialog" aria-modal="true" aria-labelledby="delete-client-title" className="w-full max-w-md rounded-3xl border border-white/80 bg-white p-6 shadow-2xl"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></span><div><h2 id="delete-client-title" className="font-display text-xl font-black text-navy">Delete client?</h2><p className="mt-2 text-sm leading-6 text-navy/60">Are you sure you want to delete <span className="font-bold text-navy">{clientToDelete.name}</span>? It will be moved to the archive and can be restored later.</p></div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setClientToDelete(null)} className="rounded-xl border border-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-navy/65 transition hover:border-primary/30 hover:text-navy focus:outline-none focus:ring-2 focus:ring-primary/40">Cancel</button><button type="button" onClick={() => handleDeleteClient(clientToDelete)} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/60">Delete client</button></div></section></div>}
      <div className="mx-auto max-w-7xl">
        <ScrollReveal><header className="flex flex-col justify-between gap-6 border-b border-navy/10 pb-8 md:flex-row md:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Vistri 360 workspace</p><h1 className="mt-2 font-display text-4xl font-black tracking-tight text-navy sm:text-5xl">Your clients, <span className="text-primary">in focus.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-navy/60">Choose a client to see their projects. Every project opens directly into its immersive scene editor.</p></div><Link to="/" className="text-xs font-bold uppercase tracking-widest text-navy/45 transition hover:text-primary">Return to site ↗</Link></header></ScrollReveal>

        <ScrollReveal delay={100}><section className="relative mt-8 overflow-hidden rounded-3xl bg-linear-to-r from-primary via-secondary to-navy px-6 py-8 text-white shadow-xl shadow-primary/15 sm:px-9 sm:py-10"><div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[32px] border-white/10" /><p className="relative text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">Studio overview</p><div className="relative mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><h2 className="font-display text-3xl font-black sm:text-4xl">Build better property stories.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Manage relationships, projects, and 360° scenes from one calm workspace.</p></div><div className="flex gap-8"><div><p className="font-display text-3xl font-black">{clients.length}</p><p className="text-[10px] uppercase tracking-widest text-white/60">Clients</p></div><div><p className="font-display text-3xl font-black">{clients.reduce((total, client) => total + (client.projects_count ?? 0), 0)}</p><p className="text-[10px] uppercase tracking-widest text-white/60">Projects</p></div></div></div></section></ScrollReveal>

        <ScrollReveal delay={200}><div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Portfolio</p><h2 className="mt-1 font-display text-2xl font-black text-navy">Clients</h2>{lastUpdated && <p className="mt-1 text-xs text-navy/45">Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}</div><div className="flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients..." className="h-11 rounded-xl border border-white bg-white px-4 text-sm text-navy outline-none shadow-sm placeholder:text-navy/35 focus:border-primary focus:ring-4 focus:ring-primary/10" /><button type="button" disabled={isRefreshing} onClick={() => loadClients(true)} className="h-11 rounded-xl border border-primary/30 bg-white px-4 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50">{isRefreshing ? "Refreshing" : "Refresh"}</button><button type="button" onClick={() => setIsFormOpen(true)} className="h-11 rounded-xl bg-navy px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:-translate-y-0.5 hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/60">+ Add client</button></div></div></ScrollReveal>

        {isFormOpen && <form onSubmit={handleCreateClient} className="mt-5 grid gap-4 rounded-2xl border border-primary/20 bg-white p-5 shadow-lg md:grid-cols-[1fr_1fr_180px_auto] md:items-end"><label className="text-xs font-bold">Client name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface px-3 text-sm font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="text-xs font-bold">Contact<input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface px-3 text-sm font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="text-xs font-bold">Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface bg-white px-3 text-sm font-normal outline-none focus:border-primary"><option>Residential</option><option>Commercial</option><option>Hospitality</option></select></label><button type="submit" className="h-11 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-secondary">Create</button></form>}

        <ScrollReveal delay={300}>{isLoading ? <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading clients"><div className="h-72 animate-pulse rounded-2xl bg-white/70" /><div className="hidden h-72 animate-pulse rounded-2xl bg-white/70 md:block" /><div className="hidden h-72 animate-pulse rounded-2xl bg-white/70 xl:block" /></div> : visibleClients.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleClients.map((client) => <ClientCard key={client.id} client={client} onOpen={(item) => navigate(`/dashboard/clients/${item.id}`)} onDelete={requestDeleteClient} />)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-12 text-center"><h2 className="font-display text-2xl font-black">No clients found</h2><p className="mt-2 text-sm text-navy/60">Try another search or create a new client.</p></div>}</ScrollReveal>

        <ScrollReveal delay={400}><section className="mt-8 rounded-2xl border border-white/80 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Next step</p><h2 className="mt-2 font-display text-xl font-black">Select a client to manage projects</h2><p className="mt-2 text-sm leading-6 text-navy/55">Projects belong to clients, and scenes belong to projects. This keeps every panorama workspace organized as your studio grows.</p></section></ScrollReveal>
      </div>
    </main>
  );
};

export default DashboardPage;
