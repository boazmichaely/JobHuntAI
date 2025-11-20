import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Contact, Theme } from '../types';
import { XIcon, PlusIcon, PencilIcon, CheckCircleIcon } from './Icons';

interface ContactsModalProps {
  contacts: Contact[];
  onClose: () => void;
  onSave: (c: Contact) => void;
  onDelete: (id: string) => void;
  theme: Theme;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ 
  contacts, 
  onClose, 
  onSave, 
  onDelete,
  theme
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>({});

  const handleEdit = (contact: Contact) => {
    setFormData(contact);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setFormData({});
    setIsEditing(true);
  };

  const handleSave = () => {
    if (formData.name && formData.company) {
      onSave({
        id: formData.id || uuidv4(),
        name: formData.name,
        role: formData.role || 'Contact',
        company: formData.company,
        email: formData.email,
        notes: formData.notes
      } as Contact);
      setFormData({});
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className={`p-6 border-b border-${theme.primary}-700 flex justify-between items-center bg-${theme.primary}-600 text-white`}>
          <div>
            <h2 className="text-xl font-bold text-white">Manage Contacts</h2>
            <p className={`text-sm text-${theme.primary}-100`}>Network, recruiters, and referrals</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className={`bg-${theme.primary}-50 p-5 rounded-xl border border-${theme.primary}-100 mb-4`}>
              <h3 className={`font-bold text-${theme.primary}-900 mb-4 flex items-center gap-2`}>
                {formData.id ? <PencilIcon className="w-4 h-4"/> : <PlusIcon className="w-4 h-4"/>}
                {formData.id ? 'Edit Contact' : 'New Contact'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className={`block text-xs font-semibold text-${theme.primary}-800 uppercase mb-1`}>Name *</label>
                    <input className={`w-full p-2.5 rounded-lg border border-${theme.base}-200 text-sm focus:ring-2 focus:ring-${theme.primary}-500 outline-none`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div>
                    <label className={`block text-xs font-semibold text-${theme.primary}-800 uppercase mb-1`}>Company *</label>
                    <input className={`w-full p-2.5 rounded-lg border border-${theme.base}-200 text-sm focus:ring-2 focus:ring-${theme.primary}-500 outline-none`} value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div>
                    <label className={`block text-xs font-semibold text-${theme.primary}-800 uppercase mb-1`}>Role</label>
                    <input className={`w-full p-2.5 rounded-lg border border-${theme.base}-200 text-sm focus:ring-2 focus:ring-${theme.primary}-500 outline-none`} value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Recruiter" />
                </div>
                <div>
                    <label className={`block text-xs font-semibold text-${theme.primary}-800 uppercase mb-1`}>Email</label>
                    <input className={`w-full p-2.5 rounded-lg border border-${theme.base}-200 text-sm focus:ring-2 focus:ring-${theme.primary}-500 outline-none`} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
                </div>
                <div className="md:col-span-2">
                    <label className={`block text-xs font-semibold text-${theme.primary}-800 uppercase mb-1`}>Notes</label>
                    <input className={`w-full p-2.5 rounded-lg border border-${theme.base}-200 text-sm focus:ring-2 focus:ring-${theme.primary}-500 outline-none`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Met at conference..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className={`text-sm text-${theme.base}-500 hover:text-${theme.base}-700 px-4 py-2 font-medium`}>Cancel</button>
                <button onClick={handleSave} className={`bg-${theme.primary}-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-${theme.primary}-700 font-medium flex items-center gap-2`}>
                    <CheckCircleIcon className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleAddNew} className={`w-full py-4 border-2 border-dashed border-${theme.base}-200 rounded-xl text-${theme.base}-500 hover:border-${theme.primary}-300 hover:text-${theme.primary}-600 hover:bg-${theme.primary}-50 transition-all mb-6 flex items-center justify-center gap-2 font-medium`}>
              <PlusIcon className="w-5 h-5" /> Add Manual Contact
            </button>
          )}

          <div className="grid grid-cols-1 gap-3">
            {contacts.length === 0 && !isEditing && <p className={`text-center text-${theme.base}-400 italic py-8`}>No contacts yet. Add one or use Smart Log.</p>}
            {contacts.map(contact => (
              <div key={contact.id} className={`flex items-center justify-between p-4 bg-white border border-${theme.base}-100 rounded-xl shadow-sm hover:shadow-md hover:border-${theme.primary}-100 transition-all group`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-${theme.primary}-50 border border-${theme.primary}-100 flex items-center justify-center text-${theme.primary}-600 font-bold text-lg`}>
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className={`font-bold text-${theme.base}-800`}>{contact.name}</h4>
                    <div className={`flex items-center gap-2 text-sm text-${theme.base}-500`}>
                         <span>{contact.role}</span>
                         <span className={`text-${theme.base}-300`}>•</span>
                         <span className={`font-medium text-${theme.base}-700`}>{contact.company}</span>
                    </div>
                    {contact.email && <p className={`text-xs text-${theme.base}-400 mt-0.5`}>{contact.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(contact)} className={`p-2 text-${theme.base}-400 hover:text-${theme.primary}-600 hover:bg-${theme.primary}-50 rounded-lg transition-colors`} title="Edit">
                     <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(contact.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                     <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}