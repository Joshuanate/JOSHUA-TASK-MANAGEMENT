import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTasks, saveTask, deleteTask, getProjects, saveProject } from '../services/storageService';
import { diagnoseBlockedTask } from '../services/geminiService';
import { Task, TaskStatus, Project, Priority, EnergyLevel, EstimatedTime, ProjectStatus } from '../types';
import confetti from 'canvas-confetti';
import { useSearch } from '../contexts/SearchContext';

// --- Helper Logic ---
const isAvoidance = (task: Task) => {
    if (task.Status !== TaskStatus.Blocked || !task.BlockedDate) return false;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return (new Date().getTime() - new Date(task.BlockedDate).getTime()) > threeDaysInMs;
};

// --- Sub-components defined outside ---

const TaskEditor = ({ 
    editingTask, 
    setEditingTask, 
    projects, 
    onSave, 
    onDelete, 
    onCancel 
}: {
    editingTask: Task,
    setEditingTask: (t: Task | null) => void,
    projects: Project[],
    onSave: (t: Task) => void,
    onDelete: (id: string) => void,
    onCancel: () => void
}) => {
    const isInbox = editingTask.Status === TaskStatus.Inbox;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg p-6 space-y-4">
                <h3 className="font-bold">Edit Task</h3>
                <input 
                    className="w-full border p-2 rounded"
                    value={editingTask.TaskName}
                    onChange={(e) => setEditingTask({...editingTask, TaskName: e.target.value})}
                    placeholder="Task Name"
                />
                <select 
                     className="w-full border p-2 rounded"
                     value={editingTask.ProjectID}
                     onChange={(e) => setEditingTask({...editingTask, ProjectID: e.target.value})}
                >
                    <option value="">No Project (Inbox)</option>
                    {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>)}
                </select>
                
                <div className={`grid gap-4 ${isInbox ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <select 
                        className="w-full border p-2 rounded"
                        value={editingTask.Status}
                        onChange={(e) => setEditingTask({...editingTask, Status: e.target.value as TaskStatus})}
                    >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    {!isInbox && (
                        <select 
                            className="w-full border p-2 rounded"
                            value={editingTask.EstimatedTime}
                            onChange={(e) => setEditingTask({...editingTask, EstimatedTime: Number(e.target.value) as EstimatedTime})}
                        >
                            {[15, 30, 60, 90].map(t => <option key={t} value={t}>{t} min</option>)}
                        </select>
                    )}
                </div>

                 {!isInbox && (
                    <div className="grid grid-cols-2 gap-4">
                        <input 
                            type="date"
                            className="w-full border p-2 rounded"
                            value={editingTask.DueDate}
                            onChange={(e) => setEditingTask({...editingTask, DueDate: e.target.value})}
                        />
                        <select 
                            className="w-full border p-2 rounded"
                            value={editingTask.Priority}
                            onChange={(e) => setEditingTask({...editingTask, Priority: Number(e.target.value) as any})}
                        >
                            {[1,2,3,4,5].map(p => <option key={p} value={p}>Priority {p}</option>)}
                        </select>
                    </div>
                )}

                <textarea 
                    className="w-full border p-2 rounded h-24"
                    placeholder="Notes..."
                    value={editingTask.Notes}
                    onChange={(e) => setEditingTask({...editingTask, Notes: e.target.value})}
                />
                <div className="flex space-x-2">
                    <button className="flex-1 bg-black text-white py-2 rounded" onClick={() => onSave(editingTask)}>Save</button>
                    <button className="flex-1 text-gray-500 py-2 rounded" onClick={onCancel}>Cancel</button>
                    <button className="px-3 text-red-500" onClick={() => onDelete(editingTask.TaskID)}>Del</button>
                </div>
            </div>
        </div>
    );
};

// Priority Badge Helper
const getPriorityBadge = (p: number) => {
    const styles = p >= 5 ? 'bg-red-100 text-red-700 border-red-200' :
                   p === 4 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                   p === 3 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                   'bg-gray-100 text-gray-500 border-gray-200';
    return (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles}`}>
            P{p}
        </span>
    );
};

const KanbanBoard = ({ tasks, projects, onEdit }: { tasks: Task[], projects: Project[], onEdit: (t: Task) => void }) => {
    const statuses = [TaskStatus.Inbox, TaskStatus.Next, TaskStatus.Doing, TaskStatus.Blocked, TaskStatus.Done];
    
    return (
        <div className="flex overflow-x-auto pb-4 space-x-4 h-full items-start px-2">
            {statuses.map(status => (
                <div key={status} className="min-w-[280px] w-[80vw] sm:w-[300px] flex-shrink-0 bg-gray-100/50 rounded-xl p-3 border border-gray-200/60 flex flex-col max-h-full">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 px-1 flex justify-between">
                        {status}
                        <span className="bg-gray-200 text-gray-600 px-1.5 rounded text-[10px]">{tasks.filter(t => t.Status === status).length}</span>
                    </h3>
                    <div className="space-y-3 overflow-y-auto no-scrollbar pb-10">
                        {tasks.filter(t => t.Status === status).map(task => {
                             const avoidance = isAvoidance(task);
                             const isDueSoon = new Date(task.DueDate) <= new Date();
                             return (
                             <div 
                                key={task.TaskID} 
                                className={`bg-white p-3 rounded shadow-sm border ${avoidance ? 'border-red-500 border-2' : 'border-gray-100'}`} 
                                onClick={() => onEdit(task)}
                             >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-medium text-ink leading-tight pr-2">{task.TaskName}</span>
                                    {getPriorityBadge(task.Priority)}
                                </div>
                                {avoidance && (
                                    <div className="text-[10px] text-red-600 font-bold mb-2 uppercase tracking-wide">
                                        This is avoidance. Decide.
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex space-x-2 items-center">
                                        <span className="text-[10px] text-gray-400 font-mono">{task.EstimatedTime}m</span>
                                        <span className={`text-[10px] font-mono ${isDueSoon ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {task.DueDate.slice(5)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded text-gray-400 truncate max-w-[80px]">
                                        {projects.find(p => p.ProjectID === task.ProjectID)?.ProjectName || 'Inbox'}
                                    </span>
                                </div>
                             </div>
                        )})}
                    </div>
                </div>
            ))}
        </div>
    );
};

const ListView = ({ 
    tasks, 
    filter, 
    onEdit, 
    onDiagnose, 
    diagnosingTask, 
    onStatusChange 
}: {
    tasks: Task[],
    filter: string,
    onEdit: (t: Task) => void,
    onDiagnose: (t: Task) => void,
    diagnosingTask: string | null,
    onStatusChange: (t: Task, s: TaskStatus) => void
}) => {
    const filteredTasks = tasks.filter(t => filter === 'All' ? true : t.Status === filter);
    return (
        <div className="space-y-3 px-6">
            {filteredTasks.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No tasks in {filter}</div>
            )}
            {filteredTasks.map(task => {
                const avoidance = isAvoidance(task);
                const isDueSoon = new Date(task.DueDate) <= new Date();
                return (
                <div 
                    key={task.TaskID} 
                    className={`bg-white p-4 rounded-lg shadow-sm border ${avoidance ? 'border-red-500 border-2' : 'border-gray-200'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                         <div className="flex items-start space-x-2 pr-2">
                            <div className="mt-0.5">{getPriorityBadge(task.Priority)}</div>
                            <span 
                                onClick={() => onEdit(task)}
                                className="font-medium text-ink cursor-pointer hover:underline"
                            >
                                {task.TaskName}
                            </span>
                         </div>

                        {task.Status === TaskStatus.Blocked ? (
                            <button 
                                onClick={() => onDiagnose(task)}
                                className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse"
                            >
                                {diagnosingTask === task.TaskID ? '...' : 'Diagnose'}
                            </button>
                        ) : (
                             <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded whitespace-nowrap">{task.ProjectID ? 'Proj' : 'Inbox'}</span>
                        )}
                    </div>
                    
                    {avoidance && (
                        <div className="text-xs text-red-600 font-bold my-2 bg-red-50 p-2 rounded uppercase tracking-wide border border-red-100">
                            ⚠️ This is avoidance. Decide.
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-3">
                         <span className={`text-xs font-mono ${isDueSoon ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                            Due: {task.DueDate}
                         </span>
                         <div className="flex space-x-1">
                             {task.Status === TaskStatus.Inbox && (
                                 <button onClick={() => onStatusChange(task, TaskStatus.Next)} className="text-xs border px-2 py-1 rounded hover:bg-black hover:text-white">To Next</button>
                             )}
                             {task.Status === TaskStatus.Next && (
                                 <button onClick={() => onStatusChange(task, TaskStatus.Blocked)} className="text-xs border border-red-200 text-red-400 px-2 py-1 rounded hover:bg-red-50">Block</button>
                             )}
                             {task.Status !== TaskStatus.Done && (
                                 <button onClick={() => onStatusChange(task, TaskStatus.Done)} className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-green-100 text-gray-600">Done</button>
                             )}
                         </div>
                    </div>
                </div>
            )})}
        </div>
    );
};

const TasksScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'All'>(TaskStatus.Inbox);
  const [viewMode, setViewMode] = useState<'List' | 'Board'>('List');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Search & AI State
  const { openSearch } = useSearch();
  const [diagnosingTask, setDiagnosingTask] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    loadData();
    // Deep Linking: Open specific task from Search
    const state = location.state as { openTaskId?: string } | null;
    if (state?.openTaskId) {
      const allTasks = getTasks();
      const target = allTasks.find(t => t.TaskID === state.openTaskId);
      if (target) setEditingTask(target);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadData = () => {
    setTasks(getTasks());
    setProjects(getProjects());
  };

  const checkProjectCompletion = (task: Task) => {
    if (task.Status === TaskStatus.Done && task.ProjectID) {
      const allTasks = getTasks();
      const projectTasks = allTasks.filter(t => t.ProjectID === task.ProjectID);
      
      if (projectTasks.length > 0 && projectTasks.every(t => t.Status === TaskStatus.Done)) {
        const project = getProjects().find(p => p.ProjectID === task.ProjectID);
        if (project && project.Status === ProjectStatus.Active) {
          if (window.confirm(`All tasks for "${project.ProjectName}" are completed. Mark project as Completed?`)) {
            saveProject({ ...project, Status: ProjectStatus.Completed });
            setProjects(getProjects());
          }
        }
      }
    }
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    try {
      const updatedTask = { ...task, Status: newStatus };
      saveTask(updatedTask);
      
      if (newStatus === TaskStatus.Done) {
        triggerConfetti();
        checkProjectCompletion(updatedTask);
      }
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const triggerConfetti = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleDiagnose = async (task: Task) => {
    setDiagnosingTask(task.TaskID);
    const relatedProject = projects.find(p => p.ProjectID === task.ProjectID);
    const advice = await diagnoseBlockedTask(task, relatedProject);
    setAiAdvice(advice);
    setDiagnosingTask(null);
  };

  const handleSaveEditor = (task: Task) => {
      try {
        saveTask(task); 
        if(task.Status === TaskStatus.Done) {
            triggerConfetti();
            checkProjectCompletion(task);
        }
        setEditingTask(null); 
        loadData(); 
      } catch (e: any) {
        alert(e.message);
      }
  };

  const handleDeleteEditor = (id: string) => {
      deleteTask(id);
      setEditingTask(null);
      loadData();
  };

  return (
    <div className={`pb-24 h-full flex flex-col ${viewMode === 'Board' ? 'bg-paper' : ''}`}>
      <header className="flex flex-col mb-4 pt-6 px-6 shrink-0">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <div className="flex items-center space-x-3">
                <button onClick={() => openSearch('tasks')} className="text-gray-500 hover:text-black">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                <div className="flex bg-gray-200 rounded-lg p-1">
                    <button 
                        onClick={() => setViewMode('List')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'List' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setViewMode('Board')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'Board' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                    >
                        Board
                    </button>
                </div>
            </div>
        </div>

        {viewMode === 'List' && (
            <div className="flex space-x-2 overflow-x-auto no-scrollbar">
                {['Inbox', 'Next', 'Doing', 'Blocked', 'Done'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap ${filter === f ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
        )}
      </header>
        
      {aiAdvice && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
              <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                  <h3 className="font-bold text-lg mb-4">AI Diagnosis</h3>
                  <div className="prose prose-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto mb-4">{aiAdvice}</div>
                  <button onClick={() => setAiAdvice(null)} className="w-full bg-black text-white py-3 rounded">Close</button>
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {viewMode === 'List' ? (
            <ListView 
                tasks={tasks}
                filter={filter}
                onEdit={setEditingTask}
                onDiagnose={handleDiagnose}
                diagnosingTask={diagnosingTask}
                onStatusChange={handleStatusChange}
            />
        ) : (
            <KanbanBoard 
                tasks={tasks}
                projects={projects}
                onEdit={setEditingTask}
            />
        )}
      </div>

      <button 
        onClick={() => {
            const newTask: Task = {
                TaskID: Math.random().toString(36).substr(2, 9),
                TaskName: 'New Task',
                ProjectID: '',
                Status: TaskStatus.Inbox,
                Priority: 3,
                Energy: EnergyLevel.Medium,
                EstimatedTime: 15,
                DueDate: new Date().toISOString().split('T')[0],
                Notes: '',
                CreatedDate: new Date().toISOString()
            };
            setEditingTask(newTask);
        }}
        className="fixed bottom-20 right-6 bg-black text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold z-30"
      >
          +
      </button>

      {editingTask && (
        <TaskEditor 
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            projects={projects}
            onSave={handleSaveEditor}
            onDelete={handleDeleteEditor}
            onCancel={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

export default TasksScreen;