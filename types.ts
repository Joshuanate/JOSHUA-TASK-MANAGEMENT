export enum ProjectArea {
  Faith = 'Faith',
  Work = 'Work',
  Money = 'Money',
  Health = 'Health',
  Learning = 'Learning',
}

export enum ProjectStatus {
  Idea = 'Idea',
  Active = 'Active',
  OnHold = 'On Hold',
  Completed = 'Completed',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface ProjectFile {
  FileID: string;
  FileName: string;
  FileType: string; // MIME type
  FileSize: number; // Bytes
  UploadDate: string; // ISO Date
  Data: string; // Base64 string
}

export interface Project {
  ProjectID: string;
  ProjectName: string;
  Area: ProjectArea;
  Status: ProjectStatus;
  Priority: Priority;
  StartDate: string; // ISO Date
  Deadline: string; // ISO Date
  SuccessDefinition: string; // Required
  WhyThisMatters: string;
  ProjectNotes: string; // Context, requirements, etc.
  Files: ProjectFile[]; // Attachments
}

export enum TaskStatus {
  Inbox = 'Inbox',
  Next = 'Next',
  Doing = 'Doing',
  Blocked = 'Blocked',
  Done = 'Done',
}

export enum EnergyLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export type EstimatedTime = 15 | 30 | 60 | 90;

export interface Task {
  TaskID: string;
  TaskName: string;
  ProjectID: string; // Empty string if purely inbox before sorting
  Status: TaskStatus;
  Priority: 1 | 2 | 3 | 4 | 5;
  Energy: EnergyLevel;
  EstimatedTime: EstimatedTime;
  DueDate: string; // ISO Date
  Notes: string;
  BlockedDate?: string; // ISO Date timestamp for aging logic
  CreatedDate?: string; // ISO Date timestamp for inbox aging
}

export enum NoteType {
  Idea = 'Idea',
  Insight = 'Insight',
  Planning = 'Planning',
  Reflection = 'Reflection',
  Lesson = 'Lesson',
}

export interface SecondBrainNote {
  NoteID: string;
  Title: string;
  Type: NoteType;
  RelatedProjectID?: string;
  RelatedTaskID?: string;
  Content: string;
  Date: string; // ISO Date
}

export interface Setting {
  Key: string;
  Value: string;
}

export const MAX_ACTIVE_PROJECTS = 5;