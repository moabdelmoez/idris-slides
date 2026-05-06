import { Plus } from "lucide-react";
import type { ProjectMetadata } from "@idris-slides/project";

type ProjectSidebarProps = {
  projects: ProjectMetadata[];
  activeProjectId: string | null;
};

export function ProjectSidebar({ activeProjectId, projects }: ProjectSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Projects">
      <div className="sidebarHeader">
        <h2>Projects</h2>
        <button className="iconButton" type="button" aria-label="New project">
          <Plus size={18} />
        </button>
      </div>
      {projects.length === 0 ? (
        <div className="emptyState">No projects yet</div>
      ) : (
        <div className="projectList">
          {projects.map((project) => (
            <button
              className={`projectItem ${project.id === activeProjectId ? "active" : ""}`}
              key={project.id}
              type="button"
            >
              <span className="projectName">{project.name}</span>
              <span>{project.slideCount ?? 0} slide generated</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
