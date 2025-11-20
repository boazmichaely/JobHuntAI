import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Opportunity, Activity, Contact, ActivityType, OpportunityStatus, Theme } from './types';
import { ActivityModal } from './components/ActivityModal';
import { ContactsModal } from './components/ContactsModal';
import { BriefcaseIcon, CalendarIcon, UserIcon, SearchIcon, PlusIcon, FilterIcon, SparklesIcon, SaveIcon, RefreshCwIcon, PencilIcon, ListIcon, LayoutGridIcon, ChevronLeftIcon, FileTextIcon, PaletteIcon, ArrowUpIcon, ArrowDownIcon } from './components/Icons';

// --- Types for File System Access API ---
interface FileSystemFileHandle {
  createWritable: () => Promise<FileSystemWritableFileStream>;
  getFile: () => Promise<File>;
  name: string;
  kind: 'file';
}
interface FileSystemWritableFileStream {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}
declare global {
  interface Window {
    showSaveFilePicker: (options?: any) => Promise<FileSystemFileHandle>;
    showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
  }
}

// --- Themes ---
const THEMES: Theme[] = [
  { name: 'Professional', primary: 'indigo', base: 'slate' },
  { name: 'Vibrant', primary: 'fuchsia', base: 'zinc' },
  { name: 'Ocean', primary: 'cyan', base: 'slate' },
  { name: 'Forest', primary: 'emerald', base: 'stone' },
  { name: 'Sunset', primary: 'orange', base: 'stone' },
];

// --- Persistence Helper ---
const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

// --- Helper: Download Snapshot (Fallback) ---
const downloadSnapshot = (data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job-hunt-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Conflict Modal ---
const ConflictModal = ({ 
  localStats, 
  fileStats, 
  onKeepLocal, 
  onImportFile,
  onCancel,
  isLiveSync,
  theme
}: {
  localStats: { ops: number, acts: number },
  fileStats: { ops: number, acts: number },
  onKeepLocal: () => void,
  onImportFile: () => void,
  onCancel: () => void,
  isLiveSync: boolean,
  theme: Theme
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
      <div className={`p-6 bg-${theme.primary}-50 border-b border-${theme.primary}-100`}>
        <h2 className={`text-xl font-bold text-${theme.primary}-900 flex items-center gap-2`}>
          <RefreshCwIcon className="w-6 h-6" /> 
          {isLiveSync ? "Sync Conflict Detected" : "Import Data"}
        </h2>
        <p className={`text-sm text-${theme.primary}-700 mt-1`}>
          {isLiveSync 
            ? "The file you selected contains data that is different from your current session."
            : "You are about to import data from a file. Choose how to proceed."}
        </p>
      </div>
      
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className={`p-4 bg-${theme.base}-50 rounded-xl border border-${theme.base}-200 text-center flex flex-col h-full`}>
          <h3 className={`font-bold text-${theme.base}-700 mb-2`}>Current App Data</h3>
          <div className="flex-1">
             <div className={`text-3xl font-black text-${theme.base}-800`}>{localStats.ops}</div>
             <div className={`text-xs text-${theme.base}-500 uppercase font-semibold`}>Opportunities</div>
             <div className={`mt-2 text-sm text-${theme.base}-600`}>{localStats.acts} Activities</div>
          </div>
          <button 
            onClick={onKeepLocal}
            className={`mt-4 w-full py-2 bg-white border border-${theme.base}-300 text-${theme.base}-700 font-semibold rounded-lg hover:bg-${theme.base}-100 transition-colors text-xs`}
          >
            {isLiveSync ? "Keep & Overwrite File" : "Keep Current (Cancel)"}
          </button>
        </div>

        <div className={`p-4 bg-${theme.primary}-50 rounded-xl border border-${theme.primary}-200 text-center flex flex-col h-full`}>
          <h3 className={`font-bold text-${theme.primary}-900 mb-2`}>File Data</h3>
          <div className="flex-1">
              <div className={`text-3xl font-black text-${theme.primary}-600`}>{fileStats.ops}</div>
              <div className={`text-xs text-${theme.primary}-400 uppercase font-semibold`}>Opportunities</div>
              <div className={`mt-2 text-sm text-${theme.primary}-700`}>{fileStats.acts} Activities</div>
          </div>
          <button 
             onClick={onImportFile}
             className={`mt-4 w-full py-2 bg-${theme.primary}-600 text-white font-semibold rounded-lg hover:bg-${theme.primary}-700 transition-colors text-xs`}
          >
            Import & Replace Current
          </button>
        </div>
      </div>
      
      <div className={`p-4 border-t border-${theme.base}-100 bg-${theme.base}-50 text-center`}>
         <button onClick={onCancel} className={`text-${theme.base}-500 hover:text-${theme.base}-700 text-xs underline`}>Cancel Operation</button>
      </div>
    </div>
  </div>
);

// --- Helpers extracted from App ---

const getTypeColor = (type: ActivityType, theme: Theme) => {
  switch (type) {
      case ActivityType.INTERVIEW: return `text-${theme.primary}-600 bg-${theme.primary}-50`;
      case ActivityType.OFFER: return 'text-green-600 bg-green-50';
      case ActivityType.REJECTION: return 'text-red-600 bg-red-50';
      case ActivityType.APPLY: return 'text-blue-600 bg-blue-50';
      default: return `text-${theme.base}-600 bg-${theme.base}-50`;
  }
}

interface ActivityCardProps {
  activity: Activity;
  opportunity?: Opportunity;
  showOppContext?: boolean;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  contacts: Contact[];
  theme: Theme;
}

// Extracted ActivityCard component to fix "key" prop issue and unnecessary re-renders
const ActivityCard: React.FC<ActivityCardProps> = ({ 
  activity, 
  opportunity, 
  showOppContext = true, 
  onEdit, 
  onDelete,
  contacts,
  theme 
}) => {
  const activityContacts = contacts.filter(c => activity.contactIds.includes(c.id));
  const displayDate = new Date(activity.date.includes('T') ? activity.date : activity.date + 'T00:00:00')
      .toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className={`p-4 bg-white rounded-xl border border-${theme.base}-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-${theme.primary}-500`}>
      <div className="flex justify-between items-start mb-2">
          <div>
              <time className={`text-xs font-semibold tracking-wide text-${theme.base}-400 uppercase`}>{displayDate}</time>
              <h3 className={`text-sm font-bold text-${theme.base}-800 mt-0.5`}>{activity.title}</h3>
          </div>
          <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${getTypeColor(activity.type, theme)}`}>
              {activity.type}
          </span>
      </div>
      
      <div className="mb-3">
          {showOppContext && opportunity && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-${theme.primary}-50 rounded-md text-xs text-${theme.primary}-900 mb-3 border border-${theme.primary}-100 font-medium`}>
                  <BriefcaseIcon className={`w-3.5 h-3.5 text-${theme.primary}-600`} />
                  <span className="font-bold">{opportunity.employer}</span>
                  <span className={`text-${theme.primary}-300 mx-0.5`}>|</span>
                  <span className={`text-${theme.primary}-700`}>{opportunity.position}</span>
              </div>
          )}
          <p className={`text-${theme.base}-600 text-xs leading-relaxed whitespace-pre-wrap`}>
              {activity.description}
          </p>
      </div>

      <div className={`flex flex-wrap gap-3 items-center pt-3 border-t border-${theme.base}-100`}>
          {activityContacts.length > 0 && (
              <div className="flex -space-x-2">
                  {activityContacts.map(contact => (
                      <div key={contact.id} title={`${contact.name} - ${contact.role}`} className={`w-6 h-6 rounded-full bg-${theme.primary}-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-${theme.primary}-600 cursor-help`}>
                          {contact.name.charAt(0)}
                      </div>
                  ))}
              </div>
          )}
          
          {activity.followUpDate && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 ml-auto">
                  <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse"></span>
                  Follow up: {new Date(activity.followUpDate.includes('T') ? activity.followUpDate : activity.followUpDate + 'T00:00:00').toLocaleDateString()}
              </div>
          )}
          
          <div className="ml-auto flex items-center gap-1">
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                className={`text-[10px] text-${theme.base}-400 hover:text-${theme.primary}-600 transition-colors p-1.5 rounded hover:bg-${theme.base}-50`}
                title="Edit"
            >
                <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                className={`text-[10px] text-${theme.base}-300 hover:text-red-500 transition-colors p-1.5 rounded hover:bg-${theme.base}-50`}
                title="Delete"
            >
                <ListIcon className="w-3.5 h-3.5" />
                Delete
            </button>
          </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  // --- State ---
  const [opportunities, setOpportunities] = useStickyState<Opportunity[]>([], 'jobhunt-ops');
  const [activities, setActivities] = useStickyState<Activity[]>([], 'jobhunt-acts');
  const [contacts, setContacts] = useStickyState<Contact[]>([], 'jobhunt-contacts');
  const [theme, setTheme] = useStickyState<Theme>(THEMES[0], 'jobhunt-theme');
  
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  // Activity Modal State
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityModalOpId, setActivityModalOpId] = useState<string | null>(null);
  
  // File Sync State
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [conflictData, setConflictData] = useState<{
    ops?: any[], 
    acts?: any[], 
    opportunities?: any[], 
    activities?: any[], 
    contacts?: any[]
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & View
  const [viewMode, setViewMode] = useState<'timeline' | 'opportunities'>('timeline');
  const [opLayout, setOpLayout] = useState<'list' | 'grid'>('list');
  const [focusedOpportunityId, setFocusedOpportunityId] = useState<string | null>(null);

  const [filterText, setFilterText] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState<string>('All');
  const [selectedContact, setSelectedContact] = useState<string>('All');

  // Table Sort & Filter State
  const [sortConfig, setSortConfig] = useState<{ key: 'employer' | 'role' | 'status' | 'lastActivity', direction: 'asc' | 'desc' }>({ key: 'lastActivity', direction: 'desc' });
  const [columnFilters, setColumnFilters] = useState<{ employer: string, role: string, status: string }>({ employer: '', role: '', status: '' });

  // --- File Sync Logic ---
  const handleConnectFile = async () => {
    // Check browser support for live sync
    const supportsFileSystem = typeof window.showOpenFilePicker === 'function';

    if (!supportsFileSystem) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Job Hunt JSON File',
          accept: { 'application/json': ['.json'] },
        }],
        multiple: false
      });

      const file = await handle.getFile();
      const text = await file.text();
      processFileContent(text, handle);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (err.name === 'SecurityError' || (err.message && err.message.includes('Cross origin'))) {
        alert("Note: Automatic Live Sync is unavailable in this preview window. Switching to Manual Import mode.");
        fileInputRef.current?.click();
      } else {
        console.error("File sync error:", err);
      }
    }
  };

  const handleManualImport = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file) return;

     const reader = new FileReader();
     reader.onload = (e) => {
        const text = e.target?.result as string;
        processFileContent(text, null); // null handle means no live sync
     };
     reader.readAsText(file);
     event.target.value = '';
  };

  const processFileContent = (text: string, handle: FileSystemFileHandle | null) => {
      let fileData;
      try {
        fileData = text ? JSON.parse(text) : { opportunities: [], activities: [], contacts: [] };
      } catch (e) {
        fileData = { opportunities: [], activities: [], contacts: [] };
      }

      const fileHasData = (fileData.opportunities && fileData.opportunities.length > 0) || (fileData.ops && fileData.ops.length > 0);
      const localHasData = opportunities.length > 0;

      if (!localHasData && fileHasData) {
        setOpportunities(fileData.opportunities || fileData.ops || []);
        setActivities(fileData.activities || fileData.acts || []);
        setContacts(fileData.contacts || []);
        setHasUnsavedChanges(false); // Clean state
        if (handle) {
            setFileHandle(handle);
            setSyncStatus('saved');
        }
        return;
      }

      if (localHasData) {
         setConflictData(fileData);
         if (handle) setFileHandle(handle);
         return;
      }

      if (handle) {
          setFileHandle(handle);
          setSyncStatus('saved');
          setHasUnsavedChanges(false);
      }
  };

  const handleKeepLocal = () => {
    setConflictData(null);
    if (!fileHandle) {
        // Manual mode cancellation
    }
  };

  const handleImportFile = () => {
    if (conflictData) {
        setOpportunities(conflictData.ops || conflictData.opportunities || []); 
        setActivities(conflictData.acts || conflictData.activities || []);
        setContacts(conflictData.contacts || []);
        setConflictData(null);
        setHasUnsavedChanges(false);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    if (opportunities.length > 0 || activities.length > 0) {
        setHasUnsavedChanges(true);
    }
  }, [opportunities, activities, contacts]);

  // Auto-save effect (Only for Live Sync)
  useEffect(() => {
    if (!fileHandle || conflictData) return; 

    const saveData = async () => {
      setSyncStatus('saving');
      try {
        const writable = await fileHandle.createWritable();
        const data = JSON.stringify({ opportunities, activities, contacts }, null, 2);
        await writable.write(data);
        await writable.close();
        setSyncStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
        setHasUnsavedChanges(false); // Synced
      } catch (err) {
        console.error("Failed to save to file", err);
        setSyncStatus('error');
      }
    };

    const timeoutId = setTimeout(saveData, 1000); 
    return () => clearTimeout(timeoutId);
  }, [opportunities, activities, contacts, fileHandle, conflictData]);

  const handleManualDownload = () => {
    downloadSnapshot({ opportunities, activities, contacts });
    setHasUnsavedChanges(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Job Hunt Activity Log", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text("Audit trail of job search activities.", 14, 35);

    // Sort activities descending by date
    const sortedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));

    const tableData = sortedActivities.map(act => {
        const op = opportunities.find(o => o.id === act.opportunityId);
        const contactNames = contacts
            .filter(c => act.contactIds.includes(c.id))
            .map(c => c.name)
            .join(', ');
            
        return [
            act.date.split('T')[0],
            act.title,
            act.type,
            op ? `${op.employer} - ${op.position}` : 'General',
            act.description || '',
            contactNames
        ];
    });

    autoTable(doc, {
        head: [['Date', 'Activity', 'Type', 'Opportunity', 'Notes', 'Contacts']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600 (keep for PDF as default)
        columnStyles: {
            0: { cellWidth: 25 }, // Date
            3: { cellWidth: 40 }, // Opportunity
            4: { cellWidth: 'auto' }, // Notes
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text('Page ' + data.pageNumber, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`job-hunt-log-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // --- Computed ---
  const employers = useMemo(() => ['All', ...Array.from(new Set(opportunities.map(o => o.employer)))], [opportunities]);
  
  const uniqueContacts = useMemo(() => {
    const activeContactIds = new Set(activities.flatMap(a => a.contactIds));
    return contacts.filter(c => activeContactIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, contacts]);

  // Handle sorting request
  const requestSort = (key: 'employer' | 'role' | 'status' | 'lastActivity') => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const filteredActivities = useMemo(() => {
    return activities
      .filter(act => {
        const op = opportunities.find(o => o.id === act.opportunityId);
        if (!op) return false;
        
        const matchesText = 
          act.title.toLowerCase().includes(filterText.toLowerCase()) ||
          op.employer.toLowerCase().includes(filterText.toLowerCase()) ||
          act.description.toLowerCase().includes(filterText.toLowerCase());
          
        const matchesEmployer = selectedEmployer === 'All' || op.employer === selectedEmployer;
        const matchesContact = selectedContact === 'All' || act.contactIds.includes(selectedContact);

        return matchesText && matchesEmployer && matchesContact;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activities, opportunities, filterText, selectedEmployer, selectedContact]);

  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities.filter(op => {
       // Global Top Bar Filters
       const matchesText = 
          op.employer.toLowerCase().includes(filterText.toLowerCase()) ||
          op.position.toLowerCase().includes(filterText.toLowerCase());
       
       const matchesEmployer = selectedEmployer === 'All' || op.employer === selectedEmployer;

       // Column Specific Filters
       const matchesColEmployer = op.employer.toLowerCase().includes(columnFilters.employer.toLowerCase());
       const matchesColRole = op.role.toLowerCase().includes(columnFilters.role.toLowerCase());
       const matchesColStatus = columnFilters.status === '' || op.status === columnFilters.status;

       return matchesText && matchesEmployer && matchesColEmployer && matchesColRole && matchesColStatus;
    });

    // Sorting
    return filtered.sort((a, b) => {
        if (sortConfig.key === 'lastActivity') {
            const lastActA = activities.filter(ac => ac.opportunityId === a.id).sort((x, y) => y.date.localeCompare(x.date))[0]?.date || '0000';
            const lastActB = activities.filter(ac => ac.opportunityId === b.id).sort((x, y) => y.date.localeCompare(x.date))[0]?.date || '0000';
            return sortConfig.direction === 'asc' ? lastActA.localeCompare(lastActB) : lastActB.localeCompare(lastActA);
        }

        const valA = (a[sortConfig.key as keyof Opportunity] || '').toString().toLowerCase();
        const valB = (b[sortConfig.key as keyof Opportunity] || '').toString().toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [opportunities, activities, filterText, selectedEmployer, sortConfig, columnFilters]);

  // --- Handlers ---

  const openAddActivity = (opId: string | null) => {
    setEditingActivity(null);
    setActivityModalOpId(opId);
    setIsActivityModalOpen(true);
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityModalOpId(activity.opportunityId);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (data: { activity: Activity, newOpportunity?: Opportunity, newContacts?: Contact[] }) => {
    if (data.newOpportunity) {
        setOpportunities(prev => [...prev, data.newOpportunity!]);
    }
    if (data.newContacts && data.newContacts.length > 0) {
        setContacts(prev => [...prev, ...data.newContacts!]);
    }
    if (editingActivity) {
         setActivities(prev => prev.map(a => a.id === data.activity.id ? data.activity : a));
    } else {
         setActivities(prev => [...prev, data.activity]);
    }
    setIsActivityModalOpen(false);
    setHasUnsavedChanges(true); // Force dirty state
  };

  const handleDeleteActivity = (id: string) => {
    if(confirm('Are you sure?')) {
        setActivities(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSaveContact = (contact: Contact) => {
    setContacts(prev => {
        const exists = prev.find(c => c.id === contact.id);
        if (exists) {
            return prev.map(c => c.id === contact.id ? contact : c);
        }
        return [...prev, contact];
    });
  };

  const handleDeleteContact = (id: string) => {
    if (confirm('Delete this contact?')) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  // --- Helpers ---
  const getStatusColor = (status: OpportunityStatus) => {
    switch (status) {
      case OpportunityStatus.OFFERED: return 'bg-green-100 text-green-800 border-green-200';
      case OpportunityStatus.REJECTED: return 'bg-red-100 text-red-800 border-red-200';
      case OpportunityStatus.INTERVIEWING: return `bg-${theme.primary}-100 text-${theme.primary}-800 border-${theme.primary}-200`;
      case OpportunityStatus.APPLIED: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return `bg-${theme.base}-100 text-${theme.base}-800 border-${theme.base}-200`;
    }
  };

  // NOTE: getTypeColor and ActivityCard have been moved outside of App to fix TS errors and performance issues.

  const focusedOpportunity = useMemo(() => 
     opportunities.find(o => o.id === focusedOpportunityId), 
  [opportunities, focusedOpportunityId]);

  const focusedActivities = useMemo(() => 
     focusedOpportunity ? activities.filter(a => a.opportunityId === focusedOpportunity.id).sort((a,b) => b.date.localeCompare(a.date)) : [],
  [focusedOpportunity, activities]);

  return (
    <div className={`min-h-screen bg-${theme.base}-100 flex flex-col md:flex-row font-sans`}>
      {/* Hidden file input for fallback import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleManualImport} 
        className="hidden" 
        accept=".json"
      />

      {/* Sidebar (Desktop) / Header (Mobile) */}
      <aside className={`bg-white border-r border-${theme.base}-200 w-full md:w-64 flex-shrink-0 md:h-screen sticky top-0 z-20 flex flex-col`}>
        <div className={`p-6 border-b border-${theme.base}-100`}>
           <h1 className={`text-2xl font-bold bg-gradient-to-r from-${theme.primary}-600 to-${theme.primary}-400 bg-clip-text text-transparent`}>
             JobHuntAI
           </h1>
           <p className={`text-xs text-${theme.base}-500 mt-1`}>Smart DUA Audit Log</p>
        </div>
        
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
           <div className={`hidden md:block text-xs font-semibold text-${theme.base}-400 uppercase tracking-wider mb-3 px-2`}>Views</div>
           <button 
             onClick={() => { setViewMode('timeline'); setFocusedOpportunityId(null); }}
             className={`flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm font-medium rounded-lg transition-colors ${viewMode === 'timeline' ? `text-${theme.primary}-700 bg-${theme.primary}-50 border border-${theme.primary}-100` : `text-${theme.base}-600 hover:bg-${theme.base}-50`}`}
           >
             <CalendarIcon className="w-4 h-4" />
             Activity Log
           </button>
           <button 
             onClick={() => { setViewMode('opportunities'); setFocusedOpportunityId(null); }}
             className={`flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm font-medium rounded-lg transition-colors ${viewMode === 'opportunities' ? `text-${theme.primary}-700 bg-${theme.primary}-50 border border-${theme.primary}-100` : `text-${theme.base}-600 hover:bg-${theme.base}-50`}`}
           >
             <BriefcaseIcon className="w-4 h-4" />
             Opportunities <span className={`ml-auto bg-${theme.base}-200 text-${theme.base}-600 py-0.5 px-2 rounded-full text-xs`}>{opportunities.length}</span>
           </button>
           
           <div className={`hidden md:block text-xs font-semibold text-${theme.base}-400 uppercase tracking-wider mb-3 px-2 mt-6`}>Management</div>
           <button 
             onClick={() => setIsContactsOpen(true)}
             className={`flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm font-medium rounded-lg text-${theme.base}-600 hover:bg-${theme.base}-50 transition-colors`}
           >
             <UserIcon className="w-4 h-4" />
             Contacts <span className={`ml-auto bg-${theme.base}-200 text-${theme.base}-600 py-0.5 px-2 rounded-full text-xs`}>{contacts.length}</span>
           </button>
           
           <button 
             onClick={handleExportPDF}
             className={`flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm font-medium rounded-lg text-${theme.base}-600 hover:bg-${theme.base}-50 transition-colors`}
           >
             <FileTextIcon className="w-4 h-4" />
             Export PDF Log
           </button>

           {/* Theme Selector */}
           <div className={`mt-6 px-4`}>
             <div className={`text-xs font-semibold text-${theme.base}-400 uppercase tracking-wider mb-3 flex items-center gap-2`}>
               <PaletteIcon className="w-3 h-3" /> Theme
             </div>
             <div className="grid grid-cols-5 gap-2">
               {THEMES.map(t => (
                 <button
                   key={t.name}
                   onClick={() => setTheme(t)}
                   title={t.name}
                   className={`w-6 h-6 rounded-full border-2 ${theme.name === t.name ? `border-${theme.base}-600 ring-1 ring-${theme.base}-300` : 'border-transparent'} bg-${t.primary}-500 transition-all hover:scale-110`}
                 />
               ))}
             </div>
             <div className={`text-[10px] text-${theme.base}-400 mt-1 text-center`}>{theme.name}</div>
           </div>
        </nav>

        <div className={`p-4 border-t border-${theme.base}-100 bg-${theme.base}-50/50 space-y-3`}>
           {/* File Sync Widget */}
           <div className={`bg-white rounded-xl border border-${theme.base}-200 p-3 shadow-sm`}>
             <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold text-${theme.base}-500 uppercase`}>Data Sync</span>
                {syncStatus === 'saved' ? (
                  <span className="text-[10px] text-green-600 flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded-full">
                    <RefreshCwIcon className="w-3 h-3" /> Live
                  </span>
                ) : syncStatus === 'saving' ? (
                  <span className="text-[10px] text-blue-600 animate-pulse">Saving...</span>
                ) : !fileHandle && hasUnsavedChanges ? (
                  <span className="text-[10px] text-orange-600 font-bold animate-pulse">Manual Save Req.</span>
                ) : (
                   <span className={`text-[10px] text-${theme.base}-400`}>Local Only</span>
                )}
             </div>
             
             {fileHandle ? (
               <div className={`text-xs text-${theme.base}-600`}>
                 <p className="truncate font-medium" title={fileHandle.name}>{fileHandle.name}</p>
                 <p className={`text-[10px] text-${theme.base}-400 mt-0.5`}>Last saved: {lastSavedTime}</p>
               </div>
             ) : (
               <div className="flex gap-2">
                 <button 
                   onClick={handleConnectFile}
                   className={`flex-1 flex items-center justify-center gap-1.5 bg-white border border-${theme.base}-300 hover:border-${theme.primary}-300 text-${theme.base}-600 hover:text-${theme.primary}-600 text-xs py-2 rounded-lg transition-colors font-medium`}
                   title="Connect for Live Sync or Import"
                 >
                   <SaveIcon className="w-3 h-3" /> Open
                 </button>
                 <button
                   onClick={handleManualDownload}
                   className={`flex items-center justify-center border w-8 rounded-lg transition-all ${hasUnsavedChanges ? 'bg-orange-50 border-orange-300 text-orange-600 animate-pulse shadow-sm' : `bg-white border-${theme.base}-300 text-${theme.base}-500`}`}
                   title="Download Backup"
                 >
                   <span className="rotate-180"><SaveIcon className="w-3 h-3" /></span>
                 </button>
               </div>
             )}
           </div>
            
           <button 
             onClick={() => openAddActivity(null)}
             className={`w-full flex items-center justify-center gap-2 bg-${theme.primary}-600 hover:bg-${theme.primary}-700 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-${theme.primary}-500/30 transition-all font-medium text-sm`}
           >
             <SparklesIcon className="w-4 h-4 text-yellow-300" />
             <span>Smart Log Activity</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-8 overflow-y-auto bg-${theme.base}-100`}>
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header / Filters */}
          <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold text-${theme.base}-900`}>
                {viewMode === 'timeline' ? 'Activity Audit Log' : 'Opportunities'}
              </h2>
              <p className={`text-${theme.base}-500 text-sm`}>
                {viewMode === 'timeline' ? 'Track specific actions for DUA requirements.' : 'Manage your applications and their status.'}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative group w-full sm:w-auto">
                <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-${theme.base}-400 group-focus-within:text-${theme.primary}-500 transition-colors`} />
                <input 
                  type="text" 
                  placeholder="Search..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className={`pl-10 pr-4 py-2 rounded-lg border border-${theme.base}-200 focus:ring-2 focus:ring-${theme.primary}-500 focus:border-transparent w-full sm:w-48 text-sm transition-all`}
                />
              </div>
              
              {/* Employer Filter - Hide if in Opportunities view as we have column filters now */}
              {viewMode === 'timeline' && (
                  <div className="relative w-full sm:w-auto">
                    <FilterIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-${theme.base}-400`} />
                    <select 
                      value={selectedEmployer}
                      onChange={(e) => setSelectedEmployer(e.target.value)}
                      className={`pl-10 pr-8 py-2 rounded-lg border border-${theme.base}-200 focus:ring-2 focus:ring-${theme.primary}-500 focus:border-transparent appearance-none bg-white text-sm w-full sm:w-auto cursor-pointer`}
                    >
                      {employers.map(emp => <option key={emp} value={emp}>{emp === 'All' ? 'All Employers' : emp}</option>)}
                    </select>
                  </div>
              )}

              {/* Contact Filter (Only on timeline) */}
              {viewMode === 'timeline' && (
                  <div className="relative w-full sm:w-auto">
                    <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-${theme.base}-400`} />
                    <select 
                      value={selectedContact}
                      onChange={(e) => setSelectedContact(e.target.value)}
                      className={`pl-10 pr-8 py-2 rounded-lg border border-${theme.base}-200 focus:ring-2 focus:ring-${theme.primary}-500 focus:border-transparent appearance-none bg-white text-sm w-full sm:w-auto cursor-pointer`}
                    >
                      <option value="All">All Contacts</option>
                      {uniqueContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
              )}

              {/* List/Grid Toggle (Only on Opportunities view and not focused) */}
              {viewMode === 'opportunities' && !focusedOpportunityId && (
                  <div className={`flex items-center bg-white rounded-lg border border-${theme.base}-200 p-1`}>
                      <button 
                        onClick={() => setOpLayout('list')}
                        className={`p-1.5 rounded ${opLayout === 'list' ? `bg-${theme.primary}-100 text-${theme.primary}-600` : `text-${theme.base}-400 hover:text-${theme.base}-600`}`}
                        title="List View"
                      >
                          <ListIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setOpLayout('grid')}
                        className={`p-1.5 rounded ${opLayout === 'grid' ? `bg-${theme.primary}-100 text-${theme.primary}-600` : `text-${theme.base}-400 hover:text-${theme.base}-600`}`}
                        title="Grid View"
                      >
                          <LayoutGridIcon className="w-4 h-4" />
                      </button>
                  </div>
              )}
            </div>
          </div>

          {/* --- View: Timeline --- */}
          {viewMode === 'timeline' && (
            <div className={`relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-${theme.base}-200 before:to-transparent pb-20`}>
              {filteredActivities.length === 0 ? (
                  <div className={`text-center py-20 bg-white rounded-2xl border border-dashed border-${theme.base}-300`}>
                      <div className={`w-16 h-16 bg-${theme.base}-50 rounded-full flex items-center justify-center mx-auto mb-4`}>
                          <BriefcaseIcon className={`w-8 h-8 text-${theme.base}-300`} />
                      </div>
                      <h3 className={`text-lg font-medium text-${theme.base}-900`}>No activities found</h3>
                      <p className={`text-${theme.base}-500 max-w-sm mx-auto mt-2`}>Try adjusting your filters or use "Smart Log Activity" to log something new.</p>
                  </div>
              ) : (
                  filteredActivities.map((activity) => {
                      const opportunity = opportunities.find(o => o.id === activity.opportunityId);
                      
                      return (
                          <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                              
                              {/* Timeline Dot */}
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-${theme.base}-50 bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 absolute left-0 md:left-1/2 -translate-x-1/2 md:translate-x-[-50%]`}>
                                  <div className={`w-3 h-3 rounded-full ${['Apply', 'Submit'].includes(activity.type) ? 'bg-blue-500' : activity.type === 'Interview' ? `bg-${theme.primary}-500` : `bg-${theme.base}-400`}`}></div>
                              </div>

                              {/* Card Content - Reusing Logic but custom wrapper for timeline alignment */}
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-14 md:ml-0">
                                <ActivityCard 
                                    activity={activity} 
                                    opportunity={opportunity} 
                                    onEdit={openEditActivity}
                                    onDelete={handleDeleteActivity}
                                    contacts={contacts}
                                    theme={theme}
                                />
                              </div>
                          </div>
                      );
                  })
              )}
            </div>
          )}

          {/* --- View: Opportunities --- */}
          {viewMode === 'opportunities' && !focusedOpportunityId && (
             <div className="animate-fadeIn">
                {filteredOpportunities.length === 0 ? (
                    <div className="text-center py-20">
                        <p className={`text-${theme.base}-500`}>No opportunities match your filters.</p>
                    </div>
                ) : (
                    <>
                    {opLayout === 'list' ? (
                        // LIST LAYOUT (Table)
                        <div className={`bg-white border border-${theme.base}-200 rounded-xl shadow-sm overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className={`bg-${theme.base}-50 text-${theme.base}-500 uppercase font-semibold text-xs border-b border-${theme.base}-200`}>
                                        <tr>
                                            <th className="px-6 py-3 min-w-[180px] align-top">
                                                <div 
                                                  className="flex items-center gap-1 cursor-pointer hover:text-slate-800"
                                                  onClick={() => requestSort('employer')}
                                                >
                                                  Employer
                                                  {sortConfig.key === 'employer' && (
                                                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
                                                  )}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    placeholder="Filter..." 
                                                    value={columnFilters.employer}
                                                    onChange={(e) => setColumnFilters({...columnFilters, employer: e.target.value})}
                                                    className={`mt-2 w-full px-2 py-1 text-[10px] rounded border border-${theme.base}-200 focus:ring-1 focus:ring-${theme.primary}-500 outline-none font-normal normal-case text-${theme.base}-700`}
                                                />
                                            </th>
                                            <th className="px-6 py-3 min-w-[180px] align-top">
                                                <div 
                                                  className="flex items-center gap-1 cursor-pointer hover:text-slate-800"
                                                  onClick={() => requestSort('role')}
                                                >
                                                  Role
                                                  {sortConfig.key === 'role' && (
                                                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
                                                  )}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    placeholder="Filter..." 
                                                    value={columnFilters.role}
                                                    onChange={(e) => setColumnFilters({...columnFilters, role: e.target.value})}
                                                    className={`mt-2 w-full px-2 py-1 text-[10px] rounded border border-${theme.base}-200 focus:ring-1 focus:ring-${theme.primary}-500 outline-none font-normal normal-case text-${theme.base}-700`}
                                                />
                                            </th>
                                            <th className="px-6 py-3 min-w-[140px] align-top">
                                                <div 
                                                  className="flex items-center gap-1 cursor-pointer hover:text-slate-800"
                                                  onClick={() => requestSort('status')}
                                                >
                                                  Status
                                                  {sortConfig.key === 'status' && (
                                                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
                                                  )}
                                                </div>
                                                <select 
                                                    value={columnFilters.status}
                                                    onChange={(e) => setColumnFilters({...columnFilters, status: e.target.value})}
                                                    className={`mt-2 w-full px-1 py-1 text-[10px] rounded border border-${theme.base}-200 focus:ring-1 focus:ring-${theme.primary}-500 outline-none font-normal normal-case text-${theme.base}-700 bg-white`}
                                                >
                                                    <option value="">All</option>
                                                    {Object.values(OpportunityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </th>
                                            <th className="px-6 py-3 text-right align-top">
                                                <div 
                                                  className="flex items-center justify-end gap-1 cursor-pointer hover:text-slate-800"
                                                  onClick={() => requestSort('lastActivity')}
                                                >
                                                  Last Activity
                                                  {sortConfig.key === 'lastActivity' && (
                                                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />
                                                  )}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y divide-${theme.base}-100`}>
                                        {filteredOpportunities.map(op => {
                                            const lastAct = activities
                                                .filter(a => a.opportunityId === op.id)
                                                .sort((a,b) => b.date.localeCompare(a.date))[0];
                                            return (
                                                <tr 
                                                    key={op.id} 
                                                    onClick={() => setFocusedOpportunityId(op.id)}
                                                    className={`hover:bg-${theme.primary}-50/50 cursor-pointer transition-colors group`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className={`font-bold text-${theme.base}-900`}>{op.employer}</div>
                                                    </td>
                                                    <td className={`px-6 py-4 text-${theme.base}-600`}>{op.role}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(op.status)}`}>
                                                            {op.status}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right text-${theme.base}-500`}>
                                                        {lastAct ? (
                                                            <span className="text-xs font-mono">{lastAct.date.split('T')[0]}</span>
                                                        ) : (
                                                            <span className={`text-${theme.base}-300 text-xs`}>-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        // GRID LAYOUT
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredOpportunities.map(op => {
                            const opActivities = activities
                                .filter(a => a.opportunityId === op.id)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            
                            return (
                                <div 
                                    key={op.id} 
                                    onClick={() => setFocusedOpportunityId(op.id)}
                                    className={`bg-white rounded-xl border border-${theme.base}-200 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-${theme.primary}-200 transition-all border-t-4 border-t-${theme.primary}-500`}
                                >
                                    <div className={`p-4 border-b border-${theme.base}-100 flex items-center justify-between bg-${theme.base}-50/50`}>
                                        <div>
                                            <h3 className={`font-bold text-lg text-${theme.base}-900`}>{op.employer} - {op.role}</h3>
                                            <p className={`text-sm text-${theme.base}-500`}>{op.position}</p>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(op.status)}`}>
                                            {op.status}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        {op.description && <p className={`text-xs text-${theme.base}-500 mb-4 italic line-clamp-2`}>{op.description}</p>}
                                        <div className="space-y-2">
                                            <h4 className={`text-[10px] font-bold text-${theme.base}-400 uppercase`}>Latest Activity</h4>
                                            {opActivities.length > 0 ? (
                                                <div className={`bg-${theme.base}-50 p-2 rounded border border-${theme.base}-100 text-xs text-${theme.base}-700`}>
                                                    <span className="font-semibold">{opActivities[0].date.split('T')[0]}:</span> {opActivities[0].title}
                                                </div>
                                            ) : (
                                                <p className={`text-xs text-${theme.base}-400 italic`}>No activities logged.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                    </>
                )}
             </div>
          )}

          {/* --- View: Focused Opportunity Detail --- */}
          {viewMode === 'opportunities' && focusedOpportunity && (
              <div className={`bg-white rounded-2xl shadow-sm border border-${theme.base}-200 overflow-hidden animate-fadeIn`}>
                  {/* Detail Header */}
                  <div className={`bg-${theme.base}-50 border-b border-${theme.base}-200 p-6`}>
                      <button 
                        onClick={() => setFocusedOpportunityId(null)}
                        className={`flex items-center gap-1 text-${theme.base}-500 hover:text-${theme.primary}-600 text-sm font-medium mb-4 transition-colors`}
                      >
                          <ChevronLeftIcon className="w-4 h-4" /> Back to list
                      </button>

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                              <h1 className={`text-3xl font-bold text-${theme.base}-900 mb-1`}>{focusedOpportunity.employer} - {focusedOpportunity.role}</h1>
                              <div className={`flex items-center gap-3 text-${theme.base}-600 text-sm`}>
                                  <span className="font-medium">{focusedOpportunity.position}</span>
                                  <span>•</span>
                                  <span className={`text-${theme.base}-400`}>Created {focusedOpportunity.createdAt}</span>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(focusedOpportunity.status)}`}>
                                  {focusedOpportunity.status}
                              </span>
                              <button 
                                onClick={() => openAddActivity(focusedOpportunity.id)}
                                className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-700 text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium flex items-center gap-2 transition-colors`}
                              >
                                  <PlusIcon className="w-4 h-4" /> Log Activity
                              </button>
                          </div>
                      </div>
                      
                      {focusedOpportunity.description && (
                          <div className={`mt-6 p-4 bg-white rounded-xl border border-${theme.base}-200 text-${theme.base}-600 text-sm leading-relaxed`}>
                              {focusedOpportunity.description}
                          </div>
                      )}
                  </div>

                  {/* Detail Timeline */}
                  <div className={`p-6 bg-${theme.base}-50/30 min-h-[400px]`}>
                      <h3 className={`text-sm font-bold text-${theme.base}-900 uppercase tracking-wide mb-6`}>Activity History</h3>
                      {focusedActivities.length === 0 ? (
                           <div className={`text-center py-10 border-2 border-dashed border-${theme.base}-200 rounded-xl`}>
                               <p className={`text-${theme.base}-400 italic`}>No activities recorded for this opportunity yet.</p>
                           </div>
                      ) : (
                          <div className="space-y-4 max-w-3xl">
                              {focusedActivities.map(act => (
                                  <ActivityCard 
                                    key={act.id} 
                                    activity={act} 
                                    showOppContext={false} 
                                    onEdit={openEditActivity} 
                                    onDelete={handleDeleteActivity}
                                    contacts={contacts}
                                    theme={theme}
                                  />
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          )}

        </div>
      </main>

      {/* Modals */}
      {conflictData && (
        <ConflictModal 
          localStats={{ ops: opportunities.length, acts: activities.length }}
          fileStats={{ 
            ops: conflictData.ops ? conflictData.ops.length : conflictData.opportunities?.length || 0, 
            acts: conflictData.acts ? conflictData.acts.length : conflictData.activities?.length || 0 
          }}
          onKeepLocal={handleKeepLocal}
          onImportFile={handleImportFile}
          onCancel={() => { setConflictData(null); setFileHandle(null); }}
          isLiveSync={!!fileHandle}
          theme={theme}
        />
      )}

      {isContactsOpen && (
        <ContactsModal 
          contacts={contacts}
          onClose={() => setIsContactsOpen(false)}
          onSave={handleSaveContact}
          onDelete={handleDeleteContact}
          theme={theme}
        />
      )}

      {isActivityModalOpen && (
        <ActivityModal 
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          onSave={handleSaveActivity}
          initialActivity={editingActivity}
          opportunityId={activityModalOpId}
          opportunities={opportunities}
          contacts={contacts}
          theme={theme}
        />
      )}
    </div>
  );
};

export default App;