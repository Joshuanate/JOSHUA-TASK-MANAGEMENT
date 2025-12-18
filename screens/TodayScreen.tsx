import React, { useEffect, useState } from 'react';
import { getTasks, saveTask, getSetting, saveSetting, getProjects, saveProject } from '../services/storageService';
import { getDailyVerse, BibleVerse } from '../services/bibleService';
import { Task, TaskStatus, ProjectStatus } from '../types';
import { Link } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';

const TodayScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyFocus, setDailyFocus] = useState('');
  const [dailyVerse, setDailyVerse] = useState<BibleVerse | null>(null);
  const [hasUnprocessedInbox, setHasUnprocessedInbox] = useState(false);
  const { openSearch } = useSearch();

  const loadData = () => {
    const allTasks = getTasks();
    const today = new Date().toISOString().split('T')[0];
    
    // Load Daily Focus
    const savedFocus = getSetting(`daily_focus_${today}`);
    if (savedFocus) setDailyFocus(savedFocus);

    // Load Daily Verse (Stable per day)
    setDailyVerse(getDailyVerse());

    // Check for Unprocessed Inbox (Tasks in Inbox created before today)
    const staleInbox = allTasks.some(t => {
        if (t.Status !== TaskStatus.Inbox) return false;
        if (!t.CreatedDate) return false;
        const createdDate = t.CreatedDate.split('T')[0];
        return createdDate < today;
    });
    setHasUnprocessedInbox(staleInbox);

    // Filter: Status = Next OR Doing AND DueDate <= Today
    const todayTasks = allTasks.filter(t => {
      const isActionable = t.Status === TaskStatus.Next || t.Status === TaskStatus.Doing;
      const isDue = t.DueDate <= today;
      return isActionable && isDue;
    });

    // Sort: Doing first, then Priority (desc), then Energy
    todayTasks.sort((a, b) => {
      if (a.Status === TaskStatus.Doing && b.Status !== TaskStatus.Doing) return -1;
      if (b.Status === TaskStatus.Doing && a.Status !== TaskStatus.Doing) return 1;
      if (b.Priority !== a.Priority) return b.Priority - a.Priority;
      return 0;
    });

    setTasks(todayTasks);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFocusBlur = () => {
    const today = new Date().toISOString().split('T')[0];
    saveSetting(`daily_focus_${today}`, dailyFocus);
  };

  const checkProjectCompletion = (task: Task) => {
    if (task.ProjectID) {
      const allTasks = getTasks();
      const projectTasks = allTasks.filter(t => t.ProjectID === task.ProjectID);
      
      // If all tasks in the project are done
      if (projectTasks.length > 0 && projectTasks.every(t => t.Status === TaskStatus.Done)) {
        const project = getProjects().find(p => p.ProjectID === task.ProjectID);
        if (project && project.Status === ProjectStatus.Active) {
          if (window.confirm(`All tasks for "${project.ProjectName}" are completed. Mark project as Completed?`)) {
            saveProject({ ...project, Status: ProjectStatus.Completed });
          }
        }
      }
    }
  };

  const handleComplete = (task: Task) => {
    try {
      const updatedTask = { ...task, Status: TaskStatus.Done };
      saveTask(updatedTask);
      checkProjectCompletion(updatedTask);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleStart = (task: Task) => {
    try {
      saveTask({ ...task, Status: TaskStatus.Doing });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <header className="mb-6 mt-4 flex justify-between items-start">
        <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Today</span>
            <h1 className="text-3xl font-bold tracking-tight text-ink">JOSHUA</h1>
            <p className="text-subtle text-sm mt-1">Execute ruthlessly.</p>
        </div>
        <button onClick={() => openSearch('today')} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
      </header>

      {/* Daily Bible Verse */}
      {dailyVerse && (
        <div className="mb-8 px-1">
            <div className="mb-4">
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">NIV</span>
                 <p className="text-sm font-serif text-gray-700 italic leading-relaxed">"{dailyVerse.niv}"</p>
            </div>
            <div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">KJV</span>
                 <p className="text-xs font-serif text-gray-500 leading-relaxed text-opacity-80">"{dailyVerse.kjv}"</p>
            </div>
            <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{dailyVerse.reference}</span>
            </div>
        </div>
      )}

      <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Daily Focus</label>
          <input 
            type="text"
            className="w-full bg-transparent border-b border-gray-200 py-1 font-medium text-ink focus:outline-none focus:border-black transition-colors placeholder-gray-300"
            placeholder="What is the one thing required today?"
            value={dailyFocus}
            onChange={(e) => setDailyFocus(e.target.value)}
            onBlur={handleFocusBlur}
          />
        </div>
      
      {hasUnprocessedInbox && (
          <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-lg flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-3">
                  <span className="text-xl">🤯</span>
                  <div>
                      <h3 className="text-sm font-bold text-red-800">Unprocessed inbox = unclear mind.</h3>
                      <p className="text-xs text-red-600">Process your inbox to regain clarity.</p>
                  </div>
              </div>
              <Link to="/tasks" className="text-xs font-bold bg-white text-red-700 px-3 py-2 rounded border border-red-200 shadow-sm">
                  Go to Inbox
              </Link>
          </div>
      )}

      {loading ? (
        <div className="animate-pulse h-10 bg-gray-200 rounded w-full"></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-400 font-medium">No Next Actions defined</p>
          <p className="text-xs text-gray-400 mt-2">Every active project must have at least one Next task.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.TaskID} 
              className={`relative p-5 rounded-lg border-l-4 shadow-sm transition-all ${
                task.Status === TaskStatus.Doing 
                  ? 'bg-white border-black ring-1 ring-black/5' 
                  : 'bg-white border-gray-200'
              }`}
            >
              {task.Status === TaskStatus.Doing && (
                 <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-black text-white rounded-full">
                   Doing
                 </span>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-ink leading-tight pr-8">{task.TaskName}</h3>
              </div>
              
              <div className="flex items-center space-x-3 text-xs text-subtle mb-4 font-mono">
                <span className="bg-gray-100 px-2 py-1 rounded">P{task.Priority}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{task.EstimatedTime}m</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{task.Energy} Energy</span>
              </div>

              <div className="flex space-x-2">
                {task.Status !== TaskStatus.Doing && (
                  <button 
                    onClick={() => handleStart(task)}
                    className="flex-1 py-2 text-xs font-bold uppercase tracking-wider border border-black text-black hover:bg-black hover:text-white transition-colors rounded"
                  >
                    Start
                  </button>
                )}
                
                <button 
                  onClick={() => handleComplete(task)}
                  className="flex-1 py-2 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-colors rounded"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayScreen;