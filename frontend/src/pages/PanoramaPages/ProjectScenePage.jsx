import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PanoramaViewer from "../../components/PanoramaComponents/PanoramaViewer";
import { fetchProject } from "../../api/ProjectService";

const SceneSkeleton = () => (
  <div className="min-h-screen animate-pulse bg-linear-to-br from-navy via-secondary/40 to-navy p-6 sm:p-10" aria-label="Loading scene">
    <div className="h-10 w-36 rounded-xl bg-white/15" />
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center"><div className="h-[55vh] w-full max-w-6xl rounded-3xl border border-white/10 bg-white/5 shadow-2xl"><div className="flex h-full items-end p-8"><div className="h-8 w-64 rounded bg-white/10" /></div></div></div>
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
