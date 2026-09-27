/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BaseRecord {
  _row: number;
  [key: string]: any;
}

export interface SampleRecord extends BaseRecord {
  SampleID?: string;
  Business: string;
  Contact: string;
  Phone: string;
  Address: string;
  City: string;
  "Requested On": string;
  "Found By": string;
  Owner: string;
  Stage: string;
  "Items To Send": string;
  "Shipped On": string;
  Tracking: string;
  "Follow-up Due": string;
  "Follow-up Done On": string;
  Outcome: string;
  Source: string;
  Notes: string;
}

export interface LeadRecord extends BaseRecord {
  LeadID?: string;
  Business: string;
  Contact: string;
  Phone: string;
  City: string;
  Owner: string;
  Stage: string;
  "Last Contact": string;
  "Next Step": string;
  "Next Step Date": string;
  Source: string;
  Notes: string;
}

export interface TaskRecord extends BaseRecord {
  TaskID?: string;
  Task: string;
  Owner: string;
  Area: string;
  Priority: string;
  "Given On": string;
  Due: string;
  Status: string;
  Source: string;
  Notes: string;
}

export interface AgentRecord extends BaseRecord {
  AgentID?: string;
  Name: string;
  Email: string;
  "Based In": string;
  Languages: string;
  Stage: string;
  Started: string;
  "Current Level": string;
  "Latest Score": string;
  "Last 1:1": string;
  "Next 1:1": string;
  Strengths: string;
  "Working On": string;
  Blockers: string;
  "Your Commitments": string;
  Notes: string;
}

export interface TrainingRecord extends BaseRecord {
  TrainingID?: string;
  Date: string;
  Agent: string;
  Topic: string;
  Result: string;
  "Follow-up": string;
  "Notes Link": string;
}

export interface PartnerRecord extends BaseRecord {
  PartnerID?: string;
  Business: string;
  Contact: string;
  Stage: string;
  Terms: string;
  "Stock Placed": string;
  Settlement: string;
  "Last Contact": string;
  "Next Check-in": string;
  Documents: string;
  Notes: string;
}

export interface PartnerIssueRecord extends BaseRecord {
  IssueID?: string;
  Partner: string;
  Issue: string;
  Owner: string;
  Opened: string;
  Status: string;
  "Next Step": string;
  Source: string;
}

export interface SupportRecord extends BaseRecord {
  TicketID?: string;
  Customer: string;
  Channel: string;
  Issue: string;
  Opened: string;
  Status: string;
  "Next Step": string;
  Notes: string;
}

export interface SaveStateRecord extends BaseRecord {
  Date: string;
  Area: string;
  Project?: string;
  "Next Action": string;
  "In My Head": string;
  "Don't Redo": string;
  Energy: string;
}

export interface CoachConfigRecord extends BaseRecord {
  Key: string;
  Value: string;
  Updated?: string;
}

export interface CoachNoteRecord extends BaseRecord {
  NoteID?: string;
  Date: string;
  Project?: string;
  From: string; // "Claude" | "Coach"
  Type: string; // "Question" | "Brief" | "Interview"
  Text: string;
  Status: string; // "Open" | "Answered" | "Done"
  Answer?: string;
  "Answered On"?: string;
}

export interface ProjectRecord extends BaseRecord {
  ProjectID?: string;
  Project: string;
  Category?: string;
  Status: string; // "Active" | "Waiting"
  Priority?: string; // "High" | "Medium" | "Low"
  "Next Action": string;
  "In My Head": string;
  "Don't Redo": string;
  "Last Saved": string;
  "Where It Lives"?: string;
  Notes?: string;
}

export interface ReminderRecord extends BaseRecord {
  ReminderID?: string;
  Text: string;
  When: string; // "YYYY-MM-DD HH:mm"
  Repeat?: string; // "None"
  Status: string; // "Scheduled" | "Cancelled"
  Link?: string; // Google Calendar event ID
  [key: string]: any;
}

export type TableName =
  | "Samples"
  | "Leads"
  | "Tasks"
  | "Agents"
  | "Trainings"
  | "Partners"
  | "Partner Issues"
  | "Support"
  | "Save State"
  | "Projects"
  | "Coach Config"
  | "Coach Notes"
  | "Reminders";

export const TABLE_NAMES: TableName[] = [
  "Samples",
  "Leads",
  "Tasks",
  "Agents",
  "Trainings",
  "Partners",
  "Partner Issues",
  "Support",
  "Save State",
  "Projects",
  "Coach Config",
  "Coach Notes",
  "Reminders",
];

export interface TablesData {
  Samples: SampleRecord[];
  Leads: LeadRecord[];
  Tasks: TaskRecord[];
  Agents: AgentRecord[];
  Trainings: TrainingRecord[];
  Partners: PartnerRecord[];
  "Partner Issues": PartnerIssueRecord[];
  Support: SupportRecord[];
  "Save State": SaveStateRecord[];
  Projects: ProjectRecord[];
  "Coach Config": CoachConfigRecord[];
  "Coach Notes": CoachNoteRecord[];
  Reminders?: ReminderRecord[];
}

export interface DropdownLists {
  People?: string[];
  SampleStage?: string[];
  LeadStage?: string[];
  TaskStatus?: string[];
  Area?: string[];
  AgentStage?: string[];
  Priority?: string[];
  IssueStatus?: string[];
  Channel?: string[];
  Energy?: string[];
  ProjectStatus?: string[];
  NoteFrom?: string[];
  NoteType?: string[];
  NoteStatus?: string[];
  [key: string]: string[] | undefined;
}

export interface ApiResponseSuccess<T = any> {
  ok: true;
  result: T;
}

export interface ApiResponseError {
  ok: false;
  error: string;
}

export type ApiResponse<T = any> = ApiResponseSuccess<T> | ApiResponseError;

export interface UserProfile {
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

export interface AllDataResult {
  tables: TablesData;
  lists: DropdownLists;
  serverDate: string; // "YYYY-MM-DD"
  user?: UserProfile | null;
}

export const TABLE_ID_FIELDS: Record<TableName, string | null> = {
  Samples: "SampleID",
  Leads: "LeadID",
  Tasks: "TaskID",
  Agents: "AgentID",
  Trainings: "TrainingID",
  Partners: "PartnerID",
  "Partner Issues": "IssueID",
  Support: "TicketID",
  "Save State": null,
  Projects: "ProjectID",
  "Coach Config": null,
  "Coach Notes": "NoteID",
  Reminders: "ReminderID",
};

export const TABLE_PREFIXES: Record<TableName, string | null> = {
  Samples: "S-",
  Leads: "L-",
  Tasks: "T-",
  Agents: "A-",
  Trainings: "TR-",
  Partners: "P-",
  "Partner Issues": "PI-",
  Support: "C-",
  Projects: "P-",
  "Coach Notes": "N-",
  Reminders: "R-",
  "Save State": null,
  "Coach Config": null,
};
