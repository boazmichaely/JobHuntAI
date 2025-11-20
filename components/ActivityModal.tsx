import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Activity, ActivityType, Contact, Opportunity, OpportunityStatus, Theme } from '../types';
import { parseJobHuntInput } from '../services/geminiService';
import { XIcon, CalendarIcon, UserIcon, CheckCircleIcon, BriefcaseIcon, SparklesIcon, PlusIcon } from './Icons';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    activity: Activity, 
    newOpportunity?: Opportunity, 
    newContacts?: Contact[] 
  }) => void;
  contacts: Contact[];
  initialActivity: Activity | null;
  opportunityId: string | null; // If passed, context is locked
  opportunities: Opportunity[];
  theme: Theme;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({ 
  isOpen, onClose, onSave, contacts, initialActivity, opportunityId, opportunities, theme 
}) => {
  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Activity>>({
    title: '',
    type: ActivityType.OTHER,
    date: new Date().toISOString().split('T')[0],
    description: '',
    contactIds: [],
    followUpAction: '',
    followUpDate: ''
  });

  // --- Smart / New Data State ---
  const [loading, setLoading] = useState(false);
  const [isNewOp, setIsNewOp] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [newOpData, setNewOpData] = useState<{employer: string, position: string, role: string, status: OpportunityStatus}>({
    employer: '', position: '', role: '', status: OpportunityStatus.IDENTIFIED
  });
  
  // Staged new contacts that aren't in the App state yet
  const [stagedContacts, setStagedContacts] = useState<Partial<Contact>[]>([]);

  // --- Initialization ---
  useEffect(() => {
    if (initialActivity) {
      const dateStr = initialActivity.date.includes('T') 
        ? initialActivity.date.split('T')[0] 
        : initialActivity.date;
      
      setFormData({ ...initialActivity, date: dateStr });
      setSelectedOpId(initialActivity.opportunityId);
      setIsNewOp(false);
    } else {
      setFormData({
        title: '',
        type: ActivityType.OTHER,
        date: new Date().toISOString().split('T')[0],
        description: '',
        contactIds: [],
        followUpAction: '',
        followUpDate: ''
      });
      setSelectedOpId(opportunityId || '');
      setIsNewOp(false);
      setStagedContacts([]);
      setNewOpData({ employer: '', position: '', role: '', status: OpportunityStatus.IDENTIFIED });
    }
  }, [initialActivity, opportunityId, isOpen]);

  if (!isOpen) return null;

  // --- Logic ---

  const handleAutoFill = async () => {
    if (!formData.description?.trim()) return;
    setLoading(true);

    try {
      // Call Gemini
      const result = await parseJobHuntInput(formData.description, opportunities);

      // 1. Opportunity Logic
      if (opportunityId) {
        // Context locked: Ignore AI opportunity suggestion
      } else {
        if (result.isNewOpportunity) {
          setIsNewOp(true);
          setNewOpData({
            employer: result.opportunityData?.employer || '',
            position: result.opportunityData?.position || 'Unknown Position',
            role: result.opportunityData?.role || '',
            status: (result.opportunityData?.status as OpportunityStatus) || OpportunityStatus.IDENTIFIED
          });
          setSelectedOpId(''); // Clear selection
        } else if (result.opportunityMatchId) {
          setIsNewOp(false);
          setSelectedOpId(result.opportunityMatchId);
        }
      }

      // 2. Activity Logic
      setFormData(prev => ({
        ...prev,
        title: prev.title || result.activityData.title || '',
        type: (prev.type === ActivityType.OTHER && result.activityData.type) ? (result.activityData.type as ActivityType) : prev.type,
        date: prev.date === new Date().toISOString().split('T')[0] && result.activityData.date ? result.activityData.date : prev.date,
        followUpAction: prev.followUpAction || result.activityData.followUpAction || '',
        followUpDate: prev.followUpDate || result.activityData.followUpDate || ''
      }));

      // 3. Contact Logic
      if (result.contacts && result.contacts.length > 0) {
        const existingIdsToSelect: string[] = [];
        const newStaged: Partial<Contact>[] = [];

        result.contacts.forEach((c: any) => {
          const match = contacts.find(existing => existing.name.toLowerCase() === c.name.toLowerCase());
          if (match) {
            existingIdsToSelect.push(match.id);
          } else {
            newStaged.push(c);
          }
        });

        setFormData(prev => ({
          ...prev,
          contactIds: Array.from(new Set([...(prev.contactIds || []), ...existingIdsToSelect]))
        }));
        setStagedContacts(prev => [...prev, ...newStaged]);
      }

    } catch (e) {
      console.error("AI Error", e);
      alert("Could not analyze text. Please try manual entry.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
     if (!formData.title || !formData.date) return;
     if (!isNewOp && !selectedOpId && !opportunityId) return;
     if (isNewOp && !newOpData.employer) return;

     let finalOpId = opportunityId || selectedOpId;
     let newOp: Opportunity | undefined = undefined;
     
     if (isNewOp && !opportunityId) {
        finalOpId = uuidv4();
        newOp = {
          id: finalOpId,
          employer: newOpData.employer,
          position: newOpData.position,
          role: newOpData.role,
          status: newOpData.status,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          description: 'Created via Smart Log'
        };
     }

     const finalNewContacts: Contact[] = stagedContacts.map(c => ({
        id: uuidv4(),
        name: c.name || 'Unknown',
        company: c.company || (newOp ? newOp.employer : 'Unknown'),
        role: c.role || 'Contact',
        email: c.email,
        notes: 'Auto-created'
     }));
     
     const allContactIds = [
        ...(formData.contactIds || []), 
        ...finalNewContacts.map(c => c.id)
     ];

     const activity: Activity = {
         id: initialActivity?.id || uuidv4(),
         opportunityId: finalOpId,
         title: formData.title!,
         type: formData.type as ActivityType,
         date: formData.date!,
         description: formData.description || '',
         contactIds: allContactIds,
         followUpAction: formData.followUpAction,
         followUpDate: formData.followUpDate
     };

     onSave({ activity, newOpportunity: newOp, newContacts: finalNewContacts });
  };

  const toggleContact = (contactId: string) => {
    setFormData(prev => {
      const current = prev.contactIds || [];
      return current.includes(contactId)
        ? { ...prev, contactIds: current.filter(id => id !== contactId) }
        : { ...prev, contactIds: [...current, contactId] };
    });
  };

  const removeStagedContact = (idx: number) => {
    setStagedContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const lockedOpportunity = opportunityId ? opportunities.find(o => o.id === opportunityId) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className={`p-6 border-b border-${theme.primary}-700 flex justify-between items-center bg-${theme.primary}-600 text-white`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/20 rounded-lg text-white`}>
                {loading ? <SparklesIcon className="w-5 h-5 animate-spin" /> : <BriefcaseIcon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                 {initialActivity ? 'Edit Activity' : 'Smart Log Activity'}
              </h2>
              <p className={`text-xs text-${theme.primary}-100`}>
                {opportunityId 
                  ? 'Logging activity for a specific opportunity'
                  : 'Describe what happened, and we\'ll handle the details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. SMART DESCRIPTION AREA */}
          <div className="relative">
             <label className={`block text-xs font-bold text-${theme.base}-700 uppercase mb-2 flex justify-between`}>
                <span>Description / Notes</span>
                {!initialActivity && (
                    <span className={`text-${theme.primary}-600 font-normal normal-case flex items-center gap-1`}>
                        <SparklesIcon className="w-3 h-3" /> AI Auto-Fill Ready
                    </span>
                )}
             </label>
             <div className="relative group">
                <textarea 
                  className={`w-full p-4 text-sm border border-${theme.base}-300 rounded-xl focus:ring-2 focus:ring-${theme.primary}-500 outline-none h-28 resize-none shadow-sm`}
                  placeholder="e.g. 'Had a screening call with Sarah from Acme Corp regarding the VP role. Next step is a technical interview on Friday.'"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
                {/* Magic Button */}
                {!loading && formData.description && !initialActivity && (
                  <button 
                    onClick={handleAutoFill}
                    className={`absolute bottom-3 right-3 bg-${theme.primary}-600 hover:bg-${theme.primary}-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-2`}
                  >
                    <SparklesIcon className="w-3 h-3 text-yellow-300" /> Auto-Fill Details
                  </button>
                )}
             </div>
          </div>

          <div className={`h-px bg-${theme.base}-100 w-full`}></div>

          {/* 2. OPPORTUNITY SECTION */}
          <div className={`bg-${theme.base}-50 p-4 rounded-xl border border-${theme.base}-200`}>
            <div className="flex items-center justify-between mb-3">
               <label className={`text-xs font-bold text-${theme.base}-700 uppercase flex items-center gap-2`}>
                 <BriefcaseIcon className={`w-4 h-4 text-${theme.base}-400`} /> Opportunity
               </label>
               {/* Only show toggle if not locked by context */}
               {!opportunityId && (
                   <div className={`flex bg-white rounded-lg border border-${theme.base}-200 p-0.5`}>
                      <button 
                        onClick={() => setIsNewOp(false)}
                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${!isNewOp ? `bg-${theme.primary}-100 text-${theme.primary}-700` : `text-${theme.base}-500 hover:text-${theme.base}-700`}`}
                      >
                        Existing
                      </button>
                      <button 
                        onClick={() => setIsNewOp(true)}
                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${isNewOp ? 'bg-green-100 text-green-700' : `text-${theme.base}-500 hover:text-${theme.base}-700`}`}
                      >
                        Create New
                      </button>
                   </div>
               )}
            </div>

            {/* LOCKED CONTEXT */}
            {opportunityId && lockedOpportunity && (
                <div className={`text-sm text-${theme.base}-800 font-bold bg-${theme.primary}-50 p-3 border border-${theme.primary}-100 rounded-lg flex items-center gap-2`}>
                    <BriefcaseIcon className={`w-4 h-4 text-${theme.primary}-600`} />
                    <span>
                        <span className="font-bold">{lockedOpportunity.employer}</span>
                        <span className={`text-${theme.primary}-300 mx-2`}>|</span>
                        <span className={`font-normal text-${theme.primary}-900`}>{lockedOpportunity.position}</span>
                    </span>
                </div>
            )}

            {/* SELECT EXISTING */}
            {!opportunityId && !isNewOp && (
                <select 
                  className={`w-full p-2.5 text-sm border border-${theme.base}-300 rounded-lg bg-white focus:ring-2 focus:ring-${theme.primary}-500 outline-none`}
                  value={selectedOpId}
                  onChange={(e) => setSelectedOpId(e.target.value)}
                >
                  <option value="">-- Select an Opportunity --</option>
                  {opportunities.map(op => (
                    <option key={op.id} value={op.id}>{op.employer} — {op.position}</option>
                  ))}
                </select>
            )}

            {/* CREATE NEW */}
            {!opportunityId && isNewOp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                    <input 
                      placeholder="Employer Name *" 
                      className={`p-2 text-sm border border-${theme.base}-300 rounded-lg`}
                      value={newOpData.employer}
                      onChange={e => setNewOpData({...newOpData, employer: e.target.value})}
                    />
                    <input 
                      placeholder="Position (e.g. Product Manager)" 
                      className={`p-2 text-sm border border-${theme.base}-300 rounded-lg`}
                      value={newOpData.position}
                      onChange={e => setNewOpData({...newOpData, position: e.target.value})}
                    />
                    <input 
                      placeholder="Official Role Title" 
                      className={`p-2 text-sm border border-${theme.base}-300 rounded-lg`}
                      value={newOpData.role}
                      onChange={e => setNewOpData({...newOpData, role: e.target.value})}
                    />
                     <select 
                        className={`p-2 text-sm border border-${theme.base}-300 rounded-lg bg-white`}
                        value={newOpData.status}
                        onChange={(e) => setNewOpData({...newOpData, status: e.target.value as OpportunityStatus})}
                    >
                        {Object.values(OpportunityStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}
          </div>

          {/* 3. ACTIVITY DETAILS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold text-${theme.base}-500 uppercase mb-1`}>Activity Title *</label>
              <input 
                className={`w-full p-2.5 text-sm border border-${theme.base}-300 rounded-lg focus:ring-2 focus:ring-${theme.primary}-500 outline-none`}
                placeholder="e.g. Screening Call"
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold text-${theme.base}-500 uppercase mb-1`}>Type</label>
              <select 
                className={`w-full p-2.5 text-sm border border-${theme.base}-300 rounded-lg bg-white focus:ring-2 focus:ring-${theme.primary}-500 outline-none`}
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as ActivityType})}
              >
                {Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold text-${theme.base}-500 uppercase mb-1`}>Date *</label>
            <input 
              type="date"
              className={`w-full p-2.5 text-sm border border-${theme.base}-300 rounded-lg focus:ring-2 focus:ring-${theme.primary}-500 outline-none`}
              value={formData.date || ''}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          {/* 4. CONTACTS */}
          <div>
            <label className={`block text-xs font-semibold text-${theme.base}-500 uppercase mb-2 flex items-center gap-2`}>
              <UserIcon className="w-4 h-4" /> Contacts
            </label>
            <div className={`bg-white border border-${theme.base}-200 rounded-xl p-3`}>
                {/* Existing Contacts */}
                {contacts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contacts.map(contact => {
                      const isSelected = formData.contactIds?.includes(contact.id);
                      return (
                        <button
                          key={contact.id}
                          onClick={() => toggleContact(contact.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                            ${isSelected 
                              ? `bg-${theme.primary}-100 text-${theme.primary}-700 border-${theme.primary}-200` 
                              : `bg-${theme.base}-50 text-${theme.base}-600 border-${theme.base}-200 hover:border-${theme.primary}-200`}
                          `}
                        >
                          {contact.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Staged New Contacts */}
                {stagedContacts.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">New Contacts to Add:</div>
                        {stagedContacts.map((c, i) => (
                            <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 p-2 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-green-800">
                                    <PlusIcon className="w-3 h-3" />
                                    <span className="font-medium">{c.name}</span>
                                    <span className="text-green-600 text-xs">({c.role || 'Role unknown'})</span>
                                </div>
                                <button onClick={() => removeStagedContact(i)} className="text-green-400 hover:text-green-700">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {contacts.length === 0 && stagedContacts.length === 0 && (
                    <p className={`text-xs text-${theme.base}-400 italic`}>No contacts selected. Auto-fill might find some, or add them in Manage Contacts.</p>
                )}
            </div>
          </div>

          {/* 5. FOLLOW UP */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
             <div className="flex items-center gap-2 mb-3 text-orange-800 font-bold text-xs uppercase">
               <CalendarIcon className="w-4 h-4" /> Follow Up Plan
             </div>
             <div className="grid grid-cols-2 gap-3">
               <input 
                  type="date" 
                  className="p-2 text-sm border border-orange-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.followUpDate || ''}
                  onChange={e => setFormData({...formData, followUpDate: e.target.value})}
               />
               <input 
                  type="text" 
                  placeholder="Action (e.g. Send Thank You)"
                  className="p-2 text-sm border border-orange-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={formData.followUpAction || ''}
                  onChange={e => setFormData({...formData, followUpAction: e.target.value})}
               />
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t border-${theme.base}-100 bg-${theme.base}-50 flex justify-end gap-3`}>
           <button 
             onClick={onClose}
             className={`px-4 py-2 rounded-lg text-${theme.base}-600 hover:bg-${theme.base}-200 transition-colors text-sm font-medium`}
           >
             Cancel
           </button>
           <button 
             onClick={handleSave}
             disabled={loading || !formData.title || !formData.date || (!isNewOp && !selectedOpId && !opportunityId)}
             className={`px-6 py-2 rounded-lg bg-${theme.primary}-600 text-white hover:bg-${theme.primary}-700 transition-all shadow-md text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
           >
             {loading ? (
                 'Analyzing...'
             ) : (
                 <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Save Activity
                 </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}