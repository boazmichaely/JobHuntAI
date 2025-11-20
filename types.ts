export enum ActivityType {
  INITIATION = 'Initiation',
  APPLY = 'Apply',
  SUBMIT = 'Submit',
  INTERVIEW = 'Interview',
  REFERENCE = 'Reference',
  NETWORKING = 'Networking',
  OFFER = 'Offer',
  REJECTION = 'Rejection',
  OTHER = 'Other',
}

export enum OpportunityStatus {
  IDENTIFIED = 'Identified',
  APPLIED = 'Applied',
  INTERVIEWING = 'Interviewing',
  OFFERED = 'Offered',
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn',
  GHOSTED = 'Ghosted',
}

export interface Contact {
  id: string;
  name: string;
  role: string; // Recruiter, Hiring Manager, Peer, etc.
  email?: string;
  phone?: string;
  company: string;
  notes?: string;
}

export interface Opportunity {
  id: string;
  position: string; // User friendly name
  role: string; // Official title
  employer: string;
  description?: string;
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  opportunityId: string;
  title: string;
  type: ActivityType;
  date: string; // ISO Date
  contactIds: string[];
  description: string;
  followUpAction?: string;
  followUpDate?: string; // ISO Date
}

export interface Theme {
  name: string;
  primary: string; // e.g. 'indigo'
  base: string;    // e.g. 'slate'
}

// AI Parsing Result Types
export interface ParsedActivity {
  isNewOpportunity: boolean;
  opportunityMatchId?: string; // If not new
  opportunityData?: Partial<Opportunity>; // If new or updating
  activityData: Partial<Activity>;
  contacts: Partial<Contact>[];
  reasoning: string;
}