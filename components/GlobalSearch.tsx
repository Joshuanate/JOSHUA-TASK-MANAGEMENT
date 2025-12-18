import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getTasks, getNotes } from '../services/storageService';
import { Project, Task, SecondBrainNote } from '../types';
import { useSearch } from '../contexts/SearchContext';

type SearchResult = {
  id: string;
  type: 'Project' | 'Task' | 'Note';
  title: string;
  subtitle: string;
  score: number;
  original: Project | Task | SecondBrainNote;
};

const GlobalSearch: React.FC = () => {
  const { isOpen, closeSearch, searchContext } = useSearch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const projects = getProjects();
    const tasks = getTasks();
    const notes = getNotes();
    const lowerQuery = query.toLowerCase();

    const mappedResults: SearchResult[] = [];

    // Score helpers
    const getContextMultiplier = (type: 'Project' | 'Task' | 'Note') => {
      if (searchContext === 'projects' && type === 'Project') return 2;
      if (searchContext === 'tasks' && type === 'Task') return 2;
      if (searchContext === 'brain' && type === 'Note') return 2;
      return 1;
    };

    // Index Projects
    projects.forEach(p => {
      if (p.ProjectName.toLowerCase().includes(lowerQuery)) {
        mappedResults.push({
          id: p.ProjectID,
          type: 'Project',
          title: p.ProjectName,
          subtitle: p.Status,
          score: 10 * getContextMultiplier('Project'),
          original: p
        });
      }
    });

    // Index Tasks
    tasks.forEach(t => {
      const matchName = t.TaskName.toLowerCase().includes(lowerQuery);
      const matchNotes = t.Notes && t.Notes.toLowerCase().includes(lowerQuery);
      
      if (matchName || matchNotes) {
        mappedResults.push({
          id: t.TaskID,
          type: 'Task',
          title: t.TaskName,
          subtitle: `${t.Status} • ${t.Priority ? `P${t.Priority}` : ''}`,
          score: (matchName ? 8 : 4) * getContextMultiplier('Task'),
          original: t
        });
      }
    });

    // Index Notes
    notes.forEach(n => {
      const matchTitle = n.Title.toLowerCase().includes(lowerQuery);
      const matchContent = n.Content.toLowerCase().includes(lowerQuery);

      if (matchTitle || matchContent) {
        mappedResults.push({
          id: n.NoteID,
          type: 'Note',
          title: n.Title || 'Untitled Note',
          subtitle: n.Type,
          score: (matchTitle ? 6 : 3) * getContextMultiplier('Note'),
          original: n
        });
      }
    });

    // Sort by score desc
    mappedResults.sort((a, b) => b.score - a.score);

    setResults(mappedResults);

  }, [query, searchContext]);

  const handleSelect = (result: SearchResult) => {
    closeSearch();
    if (result.type === 'Project') {
      navigate('/projects', { state: { openProjectId: result.id } });
    } else if (result.type === 'Task') {
      navigate('/tasks', { state: { openTaskId: result.id } });
    } else if (result.type === 'Note') {
      navigate('/brain', { state: { openNoteId: result.id } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
    if (e.key === 'Escape') {
      closeSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm p-4 flex flex-col animate-in fade-in duration-150">
      <div className="flex items-center space-x-2 border-b-2 border-black pb-2 mb-4">
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          className="flex-1 text-xl font-bold bg-transparent outline-none placeholder-gray-300"
          placeholder="Search everything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={closeSearch} className="p-2 text-gray-400 font-bold text-sm hover:text-black">
          ESC
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {query && results.length === 0 && (
          <div className="text-gray-400 font-medium text-center mt-10">
            No matches found. Refine your search.
          </div>
        )}
        
        {results.map((r) => (
          <div
            key={`${r.type}-${r.id}`}
            onClick={() => handleSelect(r)}
            className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-ink group-hover:underline decoration-2">{r.title}</h4>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                r.type === 'Project' ? 'bg-black text-white' : 
                r.type === 'Task' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {r.type}
              </span>
            </div>
            <p className="text-xs text-subtle mt-1">{r.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalSearch;