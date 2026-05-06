import { ChatPanel } from "./components/ChatPanel";
import { PreviewPane } from "./components/PreviewPane";
import { ProjectSidebar } from "./components/ProjectSidebar";
import "./styles.css";

export function App() {
  return (
    <div className="appShell">
      <header className="topBar">
        <h1>Idris Slides</h1>
        <button type="button">Light</button>
      </header>
      <div className="workspace">
        <ProjectSidebar />
        <PreviewPane />
        <ChatPanel />
      </div>
    </div>
  );
}
