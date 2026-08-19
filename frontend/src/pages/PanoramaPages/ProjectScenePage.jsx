import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PanoramaViewer from "../../components/PanoramaComponents/PanoramaViewer";
import { fetchProject } from "../../api/ProjectService";

const SceneSkeleton = () => (
  <div className="flex min-h-screen animate-pulse flex-col bg-navy font-body text-white lg:flex-row" aria-label="Loading scene">
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-white/10 bg-navy/95 p-5 lg:h-screen lg:w-[19rem] lg:border-b-0 lg:border-r lg:p-6">
      <div className="h-10 w-36 rounded-xl bg-white/10" />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="h-2.5 w-24 rounded-full bg-white/15" />
        <div className="mt-4 h-6 w-44 rounded-lg bg-white/10" />
        <div className="mt-2 h-3 w-full rounded-full bg-white/10" />
        <div className="mt-5 h-11 w-full rounded-lg bg-white/10" />
      </div>
      <div className="space-y-3">
        <div className="h-2.5 w-24 rounded-full bg-white/15" />
        <div className="h-16 w-full rounded-xl bg-white/10" />
        <div className="h-16 w-full rounded-xl bg-white/10" />
      </div>
      <div className="mt-auto h-40 w-full rounded-xl bg-white/10" />
    </aside>
    <section className="relative flex min-h-[70vh] flex-1 bg-surface p-3 sm:p-5 lg:min-h-screen lg:p-8">
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/20 bg-navy shadow-[0_30px_100px_rgba(19,41,61,0.3)]">
        <div className="absolute left-5 top-5 h-8 w-44 rounded-full bg-white/10" />
        <div className="absolute right-5 top-5 h-8 w-36 rounded-full bg-white/10" />
        <div className="absolute bottom-5 left-5 h-2.5 w-28 rounded-full bg-primary/30 sm:bottom-7 sm:left-7" />
        <div className="absolute bottom-10 left-5 h-6 w-48 rounded-lg bg-white/10 sm:bottom-12 sm:left-7" />
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-3">
          <div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10" />
          <div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10" />
          <div className="h-14 w-20 rounded-xl border border-white/10 bg-white/10" />
        </div>
      </div>
    </section>
  </div>
);

const ProjectScenePage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchProject(projectId).then((response) => active && setProject(response.data)).catch((error) => console.error("Unable to load project", error)).finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [projectId]);

  return (
    <main className="relative min-h-screen bg-navy">
      {isLoading ? <SceneSkeleton /> : <PanoramaViewer projectId={Number(projectId)} clientId={project?.client_id} clientName={project?.name} backToProjects={"/dashboard/clients/" + (project?.client_id ?? "")} />}
    </main>
  );
};

export default ProjectScenePage;
