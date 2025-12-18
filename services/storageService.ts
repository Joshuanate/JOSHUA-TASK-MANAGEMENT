import { Project, Task, SecondBrainNote, ProjectStatus, TaskStatus, ProjectArea, Priority, EnergyLevel, EstimatedTime, MAX_ACTIVE_PROJECTS, Setting } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'eos_projects',
  TASKS: 'eos_tasks',
  NOTES: 'eos_notes',
  SETTINGS: 'eos_settings',
};

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const getStore = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
    return [];
  }
};
const setStore = <T>(key: string, data: T[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
        console.error("Storage Error", e);
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
             alert("Storage Limit Exceeded. Delete some files or projects to make space.");
        } else {
             alert("Data Save Failed. Ensure you have storage permissions enabled.");
        }
        throw e;
    }
};

// --- Projects ---
export const getProjects = (): Project[] => getStore<Project>(STORAGE_KEYS.PROJECTS);

export const saveProject = (project: Project): void => {
  const projects = getProjects();
  const existingIndex = projects.findIndex(p => p.ProjectID === project.ProjectID);

  // System Law: Max 5 Active Projects
  if (project.Status === ProjectStatus.Active) {
      const activeCount = projects.filter(p => p.Status === ProjectStatus.Active && p.ProjectID !== project.ProjectID).length;
      
      if (activeCount >= MAX_ACTIVE_PROJECTS) {
           throw new Error("You already have 5 active projects. Complete or pause one first.");
      }
  }

  // System Law: Invalid without SuccessDefinition
  if (!project.SuccessDefinition.trim()) {
    throw new Error("System Law: Projects without Success Definition are invalid.");
  }

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }
  setStore(STORAGE_KEYS.PROJECTS, projects);
};

export const deleteProject = (id: string): void => {
  // 1. Delete associated Tasks
  const tasks = getTasks().filter(t => t.ProjectID !== id);
  setStore(STORAGE_KEYS.TASKS, tasks);

  // 2. Delete associated Notes (Second Brain)
  const notes = getNotes().filter(n => n.RelatedProjectID !== id);
  setStore(STORAGE_KEYS.NOTES, notes);

  // 3. Delete the Project itself (Files are inside the Project object, so they go with it)
  const projects = getProjects().filter(p => p.ProjectID !== id);
  setStore(STORAGE_KEYS.PROJECTS, projects);
};

// --- Tasks ---
export const getTasks = (): Task[] => getStore<Task>(STORAGE_KEYS.TASKS);

export const saveTask = (task: Task): void => {
  const tasks = getTasks();
  const existingIndex = tasks.findIndex(t => t.TaskID === task.TaskID);
  
  // System Law: No vague task names
  if (task.TaskName.length < 3) {
      throw new Error("System Law: No vague task names.");
  }

  // System Law: Only one task can be doing
  if (task.Status === TaskStatus.Doing) {
      const activeTask = tasks.find(t => t.Status === TaskStatus.Doing && t.TaskID !== task.TaskID);
      if (activeTask) {
          throw new Error("Finish what you started.");
      }
  }

  // System Law: Next/Doing tasks must be fully defined
  if (task.Status === TaskStatus.Next || task.Status === TaskStatus.Doing) {
      if (!task.ProjectID || !task.Priority || !task.EstimatedTime) {
          throw new Error("Define project, priority, and time before scheduling this task.");
      }
  }

  // Blocked Aging Logic
  if (task.Status === TaskStatus.Blocked) {
      if (!task.BlockedDate) {
          task.BlockedDate = new Date().toISOString();
      }
  } else {
      delete task.BlockedDate;
  }

  // Creation Date Logic
  if (!task.CreatedDate) {
      task.CreatedDate = new Date().toISOString();
  }

  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }
  setStore(STORAGE_KEYS.TASKS, tasks);
};

export const deleteTask = (id: string): void => {
  const tasks = getTasks().filter(t => t.TaskID !== id);
  setStore(STORAGE_KEYS.TASKS, tasks);
};

// --- Second Brain ---
export const getNotes = (): SecondBrainNote[] => getStore<SecondBrainNote>(STORAGE_KEYS.NOTES);

export const saveNote = (note: SecondBrainNote): void => {
  const notes = getNotes();
  const existingIndex = notes.findIndex(n => n.NoteID === note.NoteID);
  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }
  setStore(STORAGE_KEYS.NOTES, notes);
};

export const deleteNote = (id: string): void => {
  const notes = getNotes().filter(n => n.NoteID !== id);
  setStore(STORAGE_KEYS.NOTES, notes);
};

// --- Settings ---
export const getSettings = (): Setting[] => getStore<Setting>(STORAGE_KEYS.SETTINGS);

export const getSetting = (key: string): string | null => {
    const settings = getSettings();
    const setting = settings.find(s => s.Key === key);
    return setting ? setting.Value : null;
};

export const saveSetting = (key: string, value: string): void => {
    const settings = getSettings();
    const existingIndex = settings.findIndex(s => s.Key === key);
    if (existingIndex >= 0) {
        settings[existingIndex].Value = value;
    } else {
        settings.push({ Key: key, Value: value });
    }
    setStore(STORAGE_KEYS.SETTINGS, settings);
};

// --- Initialization ---
export const initStorage = async () => {
  // 1. Verify and Request Persistence
  if (navigator.storage && navigator.storage.persist) {
      try {
          const isPersisted = await navigator.storage.persist();
          if (!isPersisted) {
              console.log("Storage not persisted. Data may be cleared by browser under pressure.");
          } else {
              console.log("Storage persistence granted.");
          }
      } catch (e) {
          console.warn("Could not request storage persistence:", e);
      }
  }

  // 2. Seed Data
  if (!localStorage.getItem(STORAGE_KEYS.PROJECTS)) {
    const seedProject: Project = {
      ProjectID: generateId(),
      ProjectName: 'Setup Execution OS',
      Area: ProjectArea.Work,
      Status: ProjectStatus.Active,
      Priority: Priority.High,
      StartDate: new Date().toISOString().split('T')[0],
      Deadline: new Date().toISOString().split('T')[0],
      SuccessDefinition: 'The app is configured and I have entered my top 3 active projects.',
      WhyThisMatters: 'To reduce cognitive load and start executing.',
      ProjectNotes: 'Initial setup notes.',
      Files: [],
    };
    saveProject(seedProject);
  }
};