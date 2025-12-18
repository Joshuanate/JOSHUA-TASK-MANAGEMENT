import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { initStorage } from './services/storageService';
import TodayScreen from './screens/TodayScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import TasksScreen from './screens/TasksScreen';
import SecondBrainScreen from './screens/SecondBrainScreen';
import { SearchProvider } from './contexts/SearchContext';
import GlobalSearch from './components/GlobalSearch';

// Icons
const IconToday = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconProjects = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const IconTasks = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
const IconBrain = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;

function App() {
  useEffect(() => {
    initStorage();
  }, []);

  return (
    <SearchProvider>
      <HashRouter>
        <div className="flex flex-col h-screen bg-paper text-ink overflow-hidden font-sans">
          <GlobalSearch />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
            <Routes>
              <Route path="/" element={<TodayScreen />} />
              <Route path="/projects" element={<ProjectsScreen />} />
              <Route path="/tasks" element={<TasksScreen />} />
              <Route path="/brain" element={<SecondBrainScreen />} />
            </Routes>
          </main>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-40 safe-area-pb">
            <div className="flex justify-around items-center h-16">
              <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-black font-semibold' : 'text-gray-400'}`}>
                <IconToday />
                <span className="text-[10px] tracking-wider uppercase">Today</span>
              </NavLink>
              <NavLink to="/projects" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-black font-semibold' : 'text-gray-400'}`}>
                <IconProjects />
                <span className="text-[10px] tracking-wider uppercase">Projects</span>
              </NavLink>
              <NavLink to="/tasks" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-black font-semibold' : 'text-gray-400'}`}>
                <IconTasks />
                <span className="text-[10px] tracking-wider uppercase">Tasks</span>
              </NavLink>
              <NavLink to="/brain" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-black font-semibold' : 'text-gray-400'}`}>
                <IconBrain />
                <span className="text-[10px] tracking-wider uppercase">Brain</span>
              </NavLink>
            </div>
          </nav>
        </div>
      </HashRouter>
    </SearchProvider>
  );
}

export default App;