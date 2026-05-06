import { Plus } from "lucide-react";

export function ProjectSidebar() {
  return (
    <aside className="sidebar" aria-label="Projects">
      <div className="sidebarHeader">
        <h2>Projects</h2>
        <button className="iconButton" type="button" aria-label="New project">
          <Plus size={18} />
        </button>
      </div>
      <div className="emptyState">No projects yet</div>
    </aside>
  );
}
