import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getProjects, saveProject, getTasks, saveTask, deleteProject } from '../services/storageService';
import { generateTaskBreakdown } from '../services/geminiService';
import { Project, ProjectArea, ProjectStatus, Priority, Task, TaskStatus, EnergyLevel, EstimatedTime, MAX_ACTIVE_PROJECTS, ProjectFile } from '../types';
import { useSearch } from '../contexts/SearchContext';

// --- Sub-components defined outside to prevent re-renders losing focus ---

const TaskEditor = ({ 
    task, 
    projectName,
    onSave, 
    onCancel 
}: {
    task: Task,
    projectName: string,
    onSave: (t: Task) => void,
    onCancel: () => void
}) => {
    const [editedTask, setEditedTask] = useState(task);
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (editedTask.TaskName.length < 3) {
            setError("Task name must be at least 3 characters.");
            return;
        }
        onSave(editedTask);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="font-bold text-lg mb-1">{task.TaskID ? 'Edit Task' : 'New Task'}</h3>
                <p className="text-xs text-gray-500 mb-4 uppercase tracking-wide">For Project: {projectName}</p>
                
                {error && <div className="bg-red-50 text-red-600 p-3 text-sm mb-4 rounded border border-red-100">{error}</div>}
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task Name</label>
                        <input 
                            className="w-full border p-2 rounded focus:ring-1 focus:ring-black outline-none"
                            value={editedTask.TaskName}
                            onChange={(e) => setEditedTask({...editedTask, TaskName: e.target.value})}
                            placeholder="e.g. Draft proposal"
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                            <select 
                                className="w-full border p-2 rounded bg-white"
                                value={editedTask.Status}
                                onChange={(e) => setEditedTask({...editedTask, Status: e.target.value as TaskStatus})}
                            >
                                {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time (min)</label>
                             <select 
                                className="w-full border p-2 rounded bg-white"
                                value={editedTask.EstimatedTime}
                                onChange={(e) => setEditedTask({...editedTask, EstimatedTime: Number(e.target.value) as EstimatedTime})}
                            >
                                {[15, 30, 60, 90].map(t => <option key={t} value={t}>{t} min</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                            <select 
                                className="w-full border p-2 rounded bg-white"
                                value={editedTask.Priority}
                                onChange={(e) => setEditedTask({...editedTask, Priority: Number(e.target.value) as any})}
                            >
                                {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Energy</label>
                             <select 
                                className="w-full border p-2 rounded bg-white"
                                value={editedTask.Energy}
                                onChange={(e) => setEditedTask({...editedTask, Energy: e.target.value as EnergyLevel})}
                            >
                                {Object.values(EnergyLevel).map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                        <input 
                            type="date"
                            className="w-full border p-2 rounded"
                            value={editedTask.DueDate}
                            onChange={(e) => setEditedTask({...editedTask, DueDate: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                        <textarea 
                            className="w-full border p-2 rounded h-24 resize-none"
                            value={editedTask.Notes}
                            onChange={(e) => setEditedTask({...editedTask, Notes: e.target.value})}
                            placeholder="Details..."
                        />
                    </div>
                </div>

                <div className="flex space-x-3 mt-6">
                    <button onClick={handleSave} className="flex-1 bg-black text-white py-3 rounded font-bold hover:bg-gray-800 transition-colors">Save Task</button>
                    <button onClick={onCancel} className="px-4 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const ProjectNotesEditor = ({ project, onSave }: { project: Project, onSave: (p: Project) => void }) => {
    const [notes, setNotes] = useState(project.ProjectNotes || '');

    // Reset notes if project changes (e.g. deep link navigation)
    useEffect(() => {
        setNotes(project.ProjectNotes || '');
    }, [project.ProjectID]);

    // Auto-save on unmount or debounce change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (notes !== (project.ProjectNotes || '')) {
                onSave({ ...project, ProjectNotes: notes });
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [notes, project, onSave]);

    return (
        <div className="bg-white p-4 rounded border border-gray-200 mt-4">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Project Notes (Context)</h4>
                <span className="text-[10px] text-gray-300">Auto-saves</span>
             </div>
            <textarea
                className="w-full text-sm border-0 outline-none resize-none h-40 bg-transparent placeholder-gray-300 font-mono leading-relaxed"
                placeholder="Client info, requirements, credentials, miscellaneous context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />
        </div>
    );
};

// --- Project Files Manager ---

const ProjectFilesManager = ({ project, onSave }: { project: Project, onSave: (p: Project) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);
    const files = project.Files || [];

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const convertFileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        // Enforce 500KB limit to avoid LocalStorage crash
        if (file.size > 500 * 1024) {
            alert("File too large. Max size is 500KB for app storage.");
            return;
        }

        try {
            const base64Data = await convertFileToBase64(file);
            const newFile: ProjectFile = {
                FileID: Math.random().toString(36).substr(2, 9),
                FileName: file.name,
                FileType: file.type,
                FileSize: file.size,
                UploadDate: new Date().toISOString(),
                Data: base64Data
            };
            
            const updatedFiles = [...files, newFile];
            onSave({ ...project, Files: updatedFiles });
        } catch (e) {
            alert("Failed to process file.");
        }
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const confirmDelete = (id: string) => {
        setFileToDelete(id);
    };

    const performDelete = () => {
        if (fileToDelete) {
            const updatedFiles = files.filter(f => f.FileID !== fileToDelete);
            onSave({ ...project, Files: updatedFiles });
            setFileToDelete(null);
        }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        if (type.startsWith('video/')) return '🎥';
        return '📁';
    };

    return (
        <div className="bg-white p-4 rounded border border-gray-200 mt-4">
             <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Project Files</h4>
                <button 
                    onClick={handleUploadClick}
                    className="text-[10px] font-bold bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800"
                >
                    + Upload File
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,.pdf,video/*,.doc,.docx"
                    onChange={handleFileChange}
                />
             </div>
             
             {files.length === 0 ? (
                 <div className="text-center py-6 border border-dashed border-gray-200 rounded text-xs text-gray-400">
                     No files attached. Upload docs, images, or designs.
                 </div>
             ) : (
                 <div className="grid grid-cols-2 gap-3">
                     {files.map(f => (
                         <div key={f.FileID} className="border border-gray-100 rounded p-2 relative group">
                             <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    confirmDelete(f.FileID);
                                }}
                                className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Delete File"
                             >
                                 ✕
                             </button>
                             
                             <a href={f.Data} download={f.FileName} className="block">
                                 {f.FileType.startsWith('image/') ? (
                                     <div className="h-20 bg-gray-50 rounded mb-2 overflow-hidden flex items-center justify-center">
                                         <img src={f.Data} alt={f.FileName} className="w-full h-full object-cover" />
                                     </div>
                                 ) : (
                                     <div className="h-20 bg-gray-50 rounded mb-2 flex items-center justify-center text-2xl">
                                         {getFileIcon(f.FileType)}
                                     </div>
                                 )}
                                 <div className="truncate text-xs font-medium text-ink">{f.FileName}</div>
                                 <div className="text-[9px] text-gray-400 uppercase">{Math.round(f.FileSize / 1024)} KB • {f.UploadDate.split('T')[0]}</div>
                             </a>
                         </div>
                     ))}
                 </div>
             )}

            {/* Confirmation Modal */}
            {fileToDelete && (
                <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <h3 className="font-bold text-lg mb-2">Delete File</h3>
                        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this file?</p>
                        <div className="flex space-x-3">
                            <button 
                                onClick={performDelete}
                                className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                            <button 
                                onClick={() => setFileToDelete(null)}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProjectList = ({ projects, tasks, onSelect, onAdd, openSearch }: { 
    projects: Project[], 
    tasks: Task[], 
    onSelect: (p: Project) => void, 
    onAdd: () => void,
    openSearch: (ctx: string) => void
}) => (
    <div className="p-6 pb-20">
      <header className="flex justify-between items-center mb-6 mt-4">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <div className="flex items-center space-x-3">
          <button onClick={() => openSearch('projects')} className="text-gray-500 hover:text-black">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button 
            onClick={onAdd}
            className="bg-black text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg"
          >
            +
          </button>
        </div>
      </header>

      {/* Active Projects Limit Status */}
      <div className="mb-6 px-4 py-3 bg-gray-100 rounded text-xs font-mono font-bold text-center text-gray-600">
        Active Projects: {projects.filter(p => p.Status === ProjectStatus.Active).length} / {MAX_ACTIVE_PROJECTS}
      </div>

      <div className="space-y-4">
        {projects.sort((a,b) => a.Status === ProjectStatus.Active ? -1 : 1).map(p => {
          const projectTasks = tasks.filter(t => t.ProjectID === p.ProjectID);
          const nextCount = projectTasks.filter(t => t.Status === TaskStatus.Next).length;
          const showWarning = p.Status === ProjectStatus.Active && nextCount === 0;

          const totalTasks = projectTasks.length;
          const doneTasks = projectTasks.filter(t => t.Status === TaskStatus.Done).length;
          const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          return (
            <div 
              key={p.ProjectID} 
              onClick={() => onSelect(p)}
              className={`p-4 rounded-lg border border-gray-200 bg-white shadow-sm cursor-pointer active:scale-95 transition-transform ${p.Status === ProjectStatus.Completed ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded mb-2 inline-block ${
                  p.Status === ProjectStatus.Active ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.Status}
                </span>
                <span className="text-xs text-gray-400">{p.Area}</span>
              </div>
              
              <h3 className="text-lg font-medium leading-tight">{p.ProjectName}</h3>
              
              <div className="flex items-center mt-2 text-xs text-gray-500 font-mono">
                <span className="mr-1 opacity-50">Due:</span> 
                <span className={new Date(p.Deadline) < new Date() ? 'text-red-600 font-bold' : ''}>
                    {p.Deadline}
                </span>
              </div>

              {showWarning && (
                <div className="mt-3 flex items-center text-xs text-red-600 font-medium bg-red-50 p-2 rounded">
                    <span className="mr-2 text-sm">⚠️</span> Project has no Next Action.
                </div>
              )}

              <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-black h-full" style={{ width: `${progress}%` }}></div> 
              </div>
            </div>
          );
        })}
      </div>
    </div>
);

const ProjectDetail = ({ 
    project, 
    tasks, 
    onBack, 
    onEdit, 
    onAddTask,
    onAI, 
    onUpdateProject,
    aiLoading, 
    aiResult, 
    setAiResult, 
    onRefresh 
}: {
    project: Project,
    tasks: Task[],
    onBack: () => void,
    onEdit: () => void,
    onAddTask: () => void,
    onAI: () => void,
    onUpdateProject: (p: Project) => void,
    aiLoading: boolean,
    aiResult: string | null,
    setAiResult: (res: string | null) => void,
    onRefresh: () => void
}) => {
    const projectTasks = tasks.filter(t => t.ProjectID === project.ProjectID);
    const progress = projectTasks.length > 0 
        ? Math.round((projectTasks.filter(t => t.Status === TaskStatus.Done).length / projectTasks.length) * 100)
        : 0;
    
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteProject = () => {
        deleteProject(project.ProjectID);
        alert("Project deleted successfully.");
        onBack(); // Go back to list
        onRefresh(); // Refresh list to ensure it's gone
    };

    return (
      <div className="fixed inset-0 bg-paper z-40 overflow-y-auto pb-20">
        <div className="p-6">
          <button onClick={onBack} className="mb-6 text-sm font-bold flex items-center text-gray-500">
            ← Back
          </button>
          
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">{project.ProjectName}</h1>
            <div className="flex space-x-2 mb-4 items-center">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">{project.Area}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">{project.Status}</span>
                <span className="text-xs text-gray-400 font-mono ml-2">Due: {project.Deadline}</span>
            </div>
            
            <div className="space-y-4">
                <div className="bg-white p-4 rounded border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Success Definition</h4>
                    <p className="text-sm">{project.SuccessDefinition}</p>
                </div>
                <div className="bg-white p-4 rounded border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Why This Matters</h4>
                    <p className="text-sm">{project.WhyThisMatters}</p>
                </div>
                
                {/* Project Notes Section */}
                <ProjectNotesEditor 
                    project={project}
                    onSave={onUpdateProject}
                />
                
                {/* Project Files Section */}
                <ProjectFilesManager 
                    project={project}
                    onSave={onUpdateProject}
                />
            </div>
          </div>

          <div className="flex justify-between items-end mb-4 border-b border-gray-300 pb-2">
            <div>
                <h2 className="font-bold text-lg">Tasks</h2>
                <span className="text-xs text-gray-500">{progress}% Complete</span>
            </div>
            <button 
                onClick={onAI}
                className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded font-bold"
            >
               {aiLoading ? 'Thinking...' : 'AI Plan'}
            </button>
          </div>

          {/* AI Result Area */}
          {aiResult && (
             <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded text-sm whitespace-pre-wrap">
                 <div className="flex justify-between mb-2">
                     <span className="font-bold text-purple-900">AI Suggestion</span>
                     <button onClick={() => setAiResult(null)} className="text-purple-400">Close</button>
                 </div>
                 {aiResult}
                 <p className="mt-2 text-xs text-gray-500 italic border-t border-purple-200 pt-2">
                     Copy specific lines above and create manual tasks below.
                 </p>
             </div>
          )}

          <div className="space-y-3">
            {projectTasks.map(t => (
                <div key={t.TaskID} className="flex justify-between items-start p-3 bg-white border border-gray-100 rounded">
                    <div className="flex-1">
                         <div className={`flex justify-between ${t.Status === TaskStatus.Done ? 'opacity-50' : ''}`}>
                             <span className={`font-medium text-sm ${t.Status === TaskStatus.Done ? 'line-through' : ''}`}>{t.TaskName}</span>
                             <span className="text-[10px] bg-gray-100 px-1 rounded ml-2 h-fit">{t.Status}</span>
                         </div>
                         <div className="flex space-x-2 mt-1 text-[10px] text-gray-400 font-mono">
                            <span>P{t.Priority}</span>
                            <span>{t.EstimatedTime}m</span>
                         </div>
                    </div>
                </div>
            ))}
            <button 
                onClick={onAddTask}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded text-gray-400 font-bold text-sm hover:border-black hover:text-black transition-colors"
            >
                + Add Task
            </button>
          </div>

           <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col items-start">
               <button 
                onClick={onEdit}
                className="text-sm font-bold text-gray-600 underline mb-6"
               >
                   Edit Project
               </button>

               <button 
                 onClick={() => setShowDeleteConfirm(true)}
                 className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors"
               >
                   Delete Project
               </button>
           </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
                    <h3 className="font-bold text-lg mb-2 text-red-600">Delete this project?</h3>
                    <p className="text-sm text-gray-600 mb-6">
                        This will permanently delete the project and all associated tasks, notes, and files. This action cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                        <button 
                            onClick={handleDeleteProject}
                            className="flex-1 bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition-colors"
                        >
                            Delete Project
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};

const EditModal = ({ 
    formData, 
    setFormData, 
    error, 
    onSave, 
    onCancel 
}: {
    formData: Partial<Project>,
    setFormData: (d: Partial<Project>) => void,
    error: string | null,
    onSave: () => void,
    onCancel: () => void
}) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{formData.ProjectID ? 'Edit Project' : 'New Project'}</h2>
            
            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Name</label>
                    <input 
                        className="w-full border p-2 rounded" 
                        value={formData.ProjectName || ''} 
                        onChange={e => setFormData({...formData, ProjectName: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Area</label>
                    <select 
                        className="w-full border p-2 rounded"
                        value={formData.Area || ProjectArea.Work}
                        onChange={e => setFormData({...formData, Area: e.target.value as ProjectArea})}
                    >
                        {Object.values(ProjectArea).map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                    <select 
                        className="w-full border p-2 rounded"
                        value={formData.Status || ProjectStatus.Idea}
                        onChange={e => setFormData({...formData, Status: e.target.value as ProjectStatus})}
                    >
                        {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Success Definition (Required)</label>
                    <textarea 
                        className="w-full border p-2 rounded h-20" 
                        value={formData.SuccessDefinition || ''} 
                        onChange={e => setFormData({...formData, SuccessDefinition: e.target.value})}
                        placeholder="What does 'Done' look like?"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Why it matters</label>
                    <textarea 
                        className="w-full border p-2 rounded h-20" 
                        value={formData.WhyThisMatters || ''} 
                        onChange={e => setFormData({...formData, WhyThisMatters: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Project Notes</label>
                    <textarea 
                        className="w-full border p-2 rounded h-20" 
                        value={formData.ProjectNotes || ''} 
                        onChange={e => setFormData({...formData, ProjectNotes: e.target.value})}
                        placeholder="Context, credentials, requirements..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Deadline</label>
                        <input type="date"
                            className="w-full border p-2 rounded" 
                            value={formData.Deadline || ''} 
                            onChange={e => setFormData({...formData, Deadline: e.target.value})}
                        />
                     </div>
                </div>
            </div>

            <div className="mt-6 flex space-x-3">
                <button 
                    onClick={onSave}
                    className="flex-1 bg-black text-white py-3 rounded font-bold"
                >
                    Save
                </button>
                <button 
                    onClick={onCancel}
                    className="px-4 py-3 text-gray-500 font-bold"
                >
                    Cancel
                </button>
            </div>
        </div>
    </div>
);

// --- Main Component ---

const ProjectsScreen: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  
  // Search Context
  const { openSearch } = useSearch();
  const location = useLocation();

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({});

  useEffect(() => {
    const allProjects = getProjects();
    setProjects(allProjects);
    setTasks(getTasks());

    // Deep Linking: Open specific project from Search
    const state = location.state as { openProjectId?: string } | null;
    if (state?.openProjectId) {
      const target = allProjects.find(p => p.ProjectID === state.openProjectId);
      if (target) setSelectedProject(target);
      // Clean up state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const refresh = () => {
    setProjects(getProjects());
    setTasks(getTasks());
    if (selectedProject) {
        // Reload selected project from storage to get updates
        const updated = getProjects().find(p => p.ProjectID === selectedProject.ProjectID);
        setSelectedProject(updated || null);
    }
  };

  const checkProjectCompletion = (task: Task) => {
      // Only proceed if task is Done and has a ProjectID
      if (task.Status === TaskStatus.Done && task.ProjectID) {
          const allTasks = getTasks(); 
          // Check if all tasks for this project are done
          const projectTasks = allTasks.filter(t => t.ProjectID === task.ProjectID);
          
          if (projectTasks.length > 0 && projectTasks.every(t => t.Status === TaskStatus.Done)) {
               const project = getProjects().find(p => p.ProjectID === task.ProjectID);
               // Only prompt if project is Active
               if (project && project.Status === ProjectStatus.Active) {
                   setTimeout(() => {
                       if (window.confirm(`All tasks for "${project.ProjectName}" are completed. Mark project as Completed?`)) {
                           const completedProject = { ...project, Status: ProjectStatus.Completed };
                           saveProject(completedProject);
                           // Force refresh
                           refresh();
                       }
                   }, 100);
               }
          }
      }
  };

  const handleSave = () => {
    try {
      if (!formData.ProjectName || !formData.SuccessDefinition) {
        setError("Name and Success Definition are required.");
        return;
      }
      
      const toSave = {
        ...formData,
        ProjectID: formData.ProjectID || Math.random().toString(36).substr(2, 9),
        StartDate: formData.StartDate || new Date().toISOString().split('T')[0],
        Deadline: formData.Deadline || new Date().toISOString().split('T')[0],
        Status: formData.Status || ProjectStatus.Idea,
        Priority: formData.Priority || Priority.Medium,
        Area: formData.Area || ProjectArea.Work,
        WhyThisMatters: formData.WhyThisMatters || "",
        ProjectNotes: formData.ProjectNotes || "",
        Files: formData.Files || [],
      } as Project;

      saveProject(toSave);
      refresh();
      setIsEditing(false);
      setSelectedProject(null);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
      try {
        saveProject(updatedProject);
        setProjects(prev => prev.map(p => p.ProjectID === updatedProject.ProjectID ? updatedProject : p));
        setSelectedProject(updatedProject);
      } catch (e: any) {
          alert("Failed to save project changes: " + e.message);
      }
  };

  const handleAI = async () => {
    if (!selectedProject) return;
    setAiLoading(true);
    const result = await generateTaskBreakdown(selectedProject);
    setAiResult(result);
    setAiLoading(false);
  };

  const handleSaveTask = (task: Task) => {
    try {
      saveTask(task);
      // Check for completion logic (rare in projects screen but possible via editor)
      checkProjectCompletion(task);
      setEditingTask(null);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <>
      <ProjectList 
        projects={projects} 
        tasks={tasks} 
        onSelect={setSelectedProject} 
        onAdd={() => { setFormData({}); setIsEditing(true); setSelectedProject(null); }}
        openSearch={openSearch}
      />
      
      {selectedProject && (
        <ProjectDetail 
            project={selectedProject}
            tasks={tasks}
            onBack={() => setSelectedProject(null)}
            onEdit={() => { setFormData(selectedProject); setIsEditing(true); }}
            onAddTask={() => {
                setEditingTask({
                    TaskID: Math.random().toString(36).substr(2, 9),
                    TaskName: '',
                    ProjectID: selectedProject.ProjectID,
                    Status: TaskStatus.Next,
                    Priority: 3,
                    Energy: EnergyLevel.Medium,
                    EstimatedTime: 30,
                    DueDate: new Date().toISOString().split('T')[0],
                    Notes: '',
                    CreatedDate: new Date().toISOString()
                });
            }}
            onAI={handleAI}
            onUpdateProject={handleUpdateProject}
            aiLoading={aiLoading}
            aiResult={aiResult}
            setAiResult={setAiResult}
            onRefresh={refresh}
        />
      )}

      {isEditing && (
        <EditModal 
            formData={formData}
            setFormData={setFormData}
            error={error}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
        />
      )}

      {editingTask && selectedProject && (
          <TaskEditor 
            task={editingTask}
            projectName={selectedProject.ProjectName}
            onSave={handleSaveTask}
            onCancel={() => setEditingTask(null)}
          />
      )}
    </>
  );
};

export default ProjectsScreen;