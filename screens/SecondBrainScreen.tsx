import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getNotes, saveNote, deleteNote, getTasks } from '../services/storageService';
import { SecondBrainNote, NoteType, Task } from '../types';
import { useSearch } from '../contexts/SearchContext';

const NoteEditor = ({ 
    selectedNote, 
    setSelectedNote, 
    onSave, 
    onDelete, 
    tasks 
}: {
    selectedNote: SecondBrainNote,
    setSelectedNote: (n: SecondBrainNote | null) => void,
    onSave: () => void,
    onDelete: (id: string) => void,
    tasks: Task[]
}) => {
    // Auto-save debouncer
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedNote.Title || selectedNote.Content) {
                 saveNote(selectedNote);
            }
        }, 2000); // Auto-save every 2s if typing
        
        return () => clearTimeout(timer);
    }, [selectedNote]);

    return (
    <div className="fixed inset-0 bg-white z-50 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
                <button onClick={() => setSelectedNote(null)} className="text-gray-500 font-bold">Close</button>
                <div className="text-xs text-gray-300 uppercase font-bold tracking-widest">Saving...</div>
        </div>
        
        <input 
            className="text-2xl font-bold mb-4 outline-none" 
            placeholder="Title"
            value={selectedNote.Title}
            onChange={e => setSelectedNote({...selectedNote, Title: e.target.value})}
        />
        
        <div className="flex space-x-4 mb-4">
            <div className="flex-1">
                <select 
                    className="w-full text-sm bg-gray-100 p-2 rounded outline-none"
                    value={selectedNote.Type}
                    onChange={e => setSelectedNote({...selectedNote, Type: e.target.value as NoteType})}
                >
                    {Object.values(NoteType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div className="flex items-center text-xs text-gray-400">
                {selectedNote.Date}
            </div>
        </div>

        <div className="mb-4">
                <select 
                className="w-full text-sm bg-gray-50 border border-gray-200 p-2 rounded outline-none"
                value={selectedNote.RelatedTaskID || ''}
                onChange={e => setSelectedNote({...selectedNote, RelatedTaskID: e.target.value})}
            >
                <option value="">-- Link to Task (Optional) --</option>
                {tasks.map(t => (
                    <option key={t.TaskID} value={t.TaskID}>{t.TaskName}</option>
                ))}
            </select>
        </div>

        <textarea 
            className="flex-1 w-full outline-none resize-none font-mono text-sm leading-relaxed"
            placeholder="Start thinking..."
            value={selectedNote.Content}
            onChange={e => setSelectedNote({...selectedNote, Content: e.target.value})}
        />
        
        <button 
            className="mt-4 text-red-500 text-sm self-start"
            onClick={() => { 
                if (window.confirm("Are you sure you want to delete this note?")) {
                    onDelete(selectedNote.NoteID);
                }
            }}
        >
            Delete Note
        </button>
    </div>
    );
};

const SecondBrainScreen: React.FC = () => {
  const [notes, setNotes] = useState<SecondBrainNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<NoteType | 'All'>('All');
  const [selectedNote, setSelectedNote] = useState<SecondBrainNote | null>(null);

  // Search Context
  const { openSearch } = useSearch();
  const location = useLocation();

  useEffect(() => {
    const allNotes = getNotes();
    setNotes(allNotes);
    setTasks(getTasks());

    // Deep Linking: Open specific note from Search
    const state = location.state as { openNoteId?: string } | null;
    if (state?.openNoteId) {
      const target = allNotes.find(n => n.NoteID === state.openNoteId);
      if (target) setSelectedNote(target);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSave = () => {
    if (selectedNote) {
        saveNote(selectedNote);
        setNotes(getNotes());
    }
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    setSelectedNote(null);
    setNotes(getNotes());
  };

  const filteredNotes = notes.filter(n => filter === 'All' ? true : n.Type === filter);

  return (
    <div className="p-6 pb-24">
       <header className="flex flex-col mb-6 mt-4">
        <div className="flex justify-between items-center">
             <h1 className="text-3xl font-bold tracking-tight">Second Brain</h1>
             <button onClick={() => openSearch('brain')} className="text-gray-500 hover:text-black">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </button>
        </div>
        <div className="flex space-x-2 mt-4 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${filter === 'All' ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>All</button>
            {Object.values(NoteType).map(t => (
                 <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap ${filter === t ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'}`}>{t}</button>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {filteredNotes.map(note => {
            const linkedTask = tasks.find(t => t.TaskID === note.RelatedTaskID);
            return (
                <div 
                    key={note.NoteID} 
                    onClick={() => setSelectedNote(note)}
                    className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-gray-400 transition-colors"
                >
                    <div className="flex justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{note.Type}</span>
                        <span className="text-[10px] text-gray-300">{note.Date}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{note.Title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-3 mb-2">{note.Content}</p>
                    {linkedTask && (
                        <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                            <span className="mr-1">🔗</span> {linkedTask.TaskName}
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      <button 
        onClick={() => {
             setSelectedNote({
                 NoteID: Math.random().toString(36).substr(2, 9),
                 Title: '',
                 Type: NoteType.Idea,
                 Content: '',
                 Date: new Date().toISOString().split('T')[0]
             });
        }}
        className="fixed bottom-20 right-6 bg-black text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold"
      >
          +
      </button>

      {selectedNote && (
        <NoteEditor 
            selectedNote={selectedNote}
            setSelectedNote={(n) => {
                // If closing (null), ensure latest state is saved one last time via effect or parent refresh
                if (!n) {
                    handleSave(); 
                    setSelectedNote(null);
                } else {
                    setSelectedNote(n);
                }
            }}
            onSave={handleSave}
            onDelete={handleDelete}
            tasks={tasks}
        />
      )}
    </div>
  );
};

export default SecondBrainScreen;