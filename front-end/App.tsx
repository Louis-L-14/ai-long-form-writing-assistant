import React, { useState, Component } from 'react';
import { ViewMode } from './types';
import GenesisWizard from './components/GenesisWizard';
import Studio from './components/Studio';
import Wiki from './components/Wiki';
import ProjectHub from './components/ProjectHub';
import ProjectDashboard from './components/ProjectDashboard';
import { Feather, Book, Map, Layers, Settings, Command, Home } from 'lucide-react';

// Simple Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-red-400 p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <pre className="bg-slate-900 p-4 rounded text-left overflow-auto text-xs text-slate-300">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  // Initial state 'projectHub' to show the project selection first
  const [currentView, setCurrentView] = useState<ViewMode | 'projectHub' | 'dashboard'>('projectHub');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const renderContent = () => {
    switch (currentView) {
      case 'projectHub':
        return (
          <ProjectHub
            onCreateProject={() => setCurrentView('genesis')}
            onSelectProject={(id) => {
              setActiveProjectId(id);
              setCurrentView('dashboard');
            }}
          />
        );
      case 'dashboard':
        return activeProjectId ? (
          <ProjectDashboard
            projectId={activeProjectId}
            onBack={() => setCurrentView('projectHub')}
            onOpenStudio={(chapterId) => setCurrentView('studio')}
          />
        ) : null;
      case 'genesis':
        return <GenesisWizard onComplete={(projectId) => {
          setActiveProjectId(projectId);
          setCurrentView('dashboard');
        }} />;
      case 'studio':
        return <Studio projectId={activeProjectId || ''} onOpenWiki={() => setCurrentView('wiki')} />;
      case 'wiki':
        return <Wiki />;
      default:
        return <Studio onOpenWiki={() => setCurrentView('wiki')} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">

        {/* App Sidebar (Nav Rail) */}
        {currentView !== 'genesis' && currentView !== 'projectHub' && (
          <div className="w-16 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-50">
            <div
              onClick={() => setCurrentView('projectHub')}
              className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2 cursor-pointer hover:bg-indigo-500 transition-colors"
            >
              <Feather className="w-6 h-6 text-white" />
            </div>

            <nav className="flex flex-col gap-4 w-full items-center">
              <NavTooltip icon={<Home />} label="项目中心" isActive={false} onClick={() => setCurrentView('projectHub')} />
              <NavTooltip icon={<Book />} label="工作室" isActive={currentView === 'studio'} onClick={() => setCurrentView('studio')} />
            </nav>

            <div className="mt-auto flex flex-col gap-4 w-full items-center">
              <NavTooltip icon={<Settings />} label="设置" isActive={false} onClick={() => { }} />
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600 cursor-pointer hover:ring-2 ring-indigo-500 transition-all">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Author" alt="User" />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative">
          {renderContent()}
        </div>

      </div>
    </ErrorBoundary>
  );
};

// Helper Component for Nav Rail
const NavTooltip: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all duration-200 ${isActive
        ? 'bg-slate-800 text-indigo-400 shadow-inner'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    </button>

    {/* Tooltip */}
    <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-700 whitespace-nowrap z-50">
      {label}
    </div>
  </div>
);

export default App;