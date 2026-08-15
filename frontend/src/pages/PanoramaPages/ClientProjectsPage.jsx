import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createProject, fetchProjectsCached, getProjectsCacheUpdatedAt, invalidateProjectsCache } from "../../api/ProjectService";
import { fetchClientCached } from "../../api/ClientService";
import ScrollReveal from "../../components/ScrollReveal";

const ProjectSkeleton = () => (
  <div className="h-72 animate-pulse rounded-2xl border border-white/70 bg-white/70 p-6" aria-hidden="true">
    <div className="flex justify-between"><div className="h-11 w-11 rounded-xl bg-primary/10" /><div className="h-5 w-20 rounded-full bg-primary/10" /></div>
    <div className="mt-7 h-6 w-3/5 rounded bg-navy/10" /><div className="mt-4 h-4 w-full rounded bg-navy/5" /><div className="mt-2 h-4 w-4/5 rounded bg-navy/5" />
    <div className="mt-8 border-t border-surface pt-4"><div className="h-3 w-1/3 rounded bg-navy/5" /></div>
  </div>
);

const ProjectIcon = () => (
  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2 2.3 3 4.9 3 8s-1 5.7-3 8c-2-2.3-3-4.9-3-8s1-5.7 3-8Z" /></svg>
    <span className="sr-only">360 degree project</span>
  </span>
);

const ClientProjectsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadProjects = useCallback((forceRefresh = false) => {
    let active = true;
    if (forceRefresh) setIsRefreshing(true);
    Promise.all([fetchClientCached(clientId, forceRefresh), fetchProjectsCached(clientId, forceRefresh)]).then(([clientResponse, projectResponse]) => {
      if (!active) return;
      setClient(clientResponse.data);
      setProjects(projectResponse.data ?? []);
      setLastUpdated(new Date(getProjectsCacheUpdatedAt(clientId) ?? Date.now()));
    }).catch((error) => console.error("Unable to load client projects", error)).finally(() => {
      if (!active) return;
      setIsLoading(false);
      setIsRefreshing(false);
    });
    return () => { active = false; };
  }, [clientId]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadProjects(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProjects]);

  const handleCreateProject = async (event) => {
    event.preventDefault();
    const response = await createProject({ ...form, client_id: Number(clientId) });
    setProjects((current) => [response.data, ...current]);
    invalidateProjectsCache(clientId);
    setForm({ name: "", description: "" });
    setShowForm(false);
  };

  return (
    <main className="dashboard-canvas min-h-screen bg-surface px-4 py-5 font-body text-navy sm:px-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal><Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-navy/50 transition hover:text-primary"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>All clients</Link></ScrollReveal>
        <ScrollReveal delay={100}><header className="mt-8 flex flex-col justify-between gap-5 border-b border-navy/10 pb-8 sm:flex-row sm:items-end">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Client workspace</p>{isLoading ? <><div className="mt-3 h-10 w-72 animate-pulse rounded-lg bg-navy/10" /><div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-navy/5" /></> : <><h1 className="mt-2 font-display text-4xl font-black tracking-tight text-navy">{client?.name ?? "Projects"}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-navy/60">Manage the virtual tour projects and scene editors connected to this client.</p>{lastUpdated && <p className="mt-2 text-xs text-navy/45">Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>}</>}</div>
          <div className="flex gap-3"><button type="button" disabled={isLoading || isRefreshing} onClick={() => loadProjects(true)} className="h-11 rounded-xl border border-primary/30 bg-white px-4 text-xs font-bold uppercase tracking-widest text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50">{isRefreshing ? "Refreshing" : "Refresh"}</button><button type="button" disabled={isLoading} onClick={() => setShowForm(true)} className="rounded-xl bg-navy px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:-translate-y-0.5 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/60">+ New project</button></div>
        </header></ScrollReveal>
        {showForm && <form onSubmit={handleCreateProject} className="mt-6 grid gap-4 rounded-2xl border border-primary/20 bg-white p-5 shadow-lg sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-xs font-bold text-navy">Project name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface px-3 text-sm font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="e.g. Summer residence tour" /></label><label className="text-xs font-bold text-navy">Description<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-surface px-3 text-sm font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Short project description" /></label><button type="submit" className="h-11 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-secondary">Create</button></form>}
        <ScrollReveal delay={200}>{isLoading ? <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading projects"><ProjectSkeleton /><ProjectSkeleton /><ProjectSkeleton /></div> : projects.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{projects.map((project) => <button type="button" key={project.id} onClick={() => navigate("/dashboard/clients/" + clientId + "/projects/" + project.id)} className="group rounded-2xl border border-white/70 bg-white p-6 text-left shadow-[0_18px_45px_rgba(19,41,61,0.07)] transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_55px_rgba(19,41,61,0.13)] focus:outline-none focus:ring-2 focus:ring-primary/60"><div className="flex items-start justify-between"><ProjectIcon /><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">{project.status ?? "Draft"}</span></div><h2 className="mt-7 font-display text-xl font-bold text-navy">{project.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-navy/55">{project.description ?? "Open this project to edit its immersive scenes."}</p><div className="mt-7 flex items-center justify-between border-t border-surface pt-4 text-xs text-navy/45"><span>{project.project_images_count ?? 0} scenes</span><span className="inline-flex items-center gap-1 font-bold text-primary transition group-hover:translate-x-1">Open editor <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg></span></div></button>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-12 text-center"><h2 className="font-display text-2xl font-black text-navy">No projects yet</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-navy/60">Create the first project for this client, then add panoramas and hotspots in the scene editor.</p></div>}</ScrollReveal>
      </div>
    </main>
  );
};

export default ClientProjectsPage;
