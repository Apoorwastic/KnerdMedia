import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import Modal from './ui/Modal';
import api from '../lib/api';
import { User, Section } from '../types';

interface Props { open: boolean; onClose: () => void }

const COLORS = ['#6366f1','#f97316','#16a34a','#ec4899','#8b5cf6','#0ea5e9','#f59e0b','#ef4444','#14b8a6','#64748b'];
const INDUSTRIES = ['E-commerce','Fashion & Beauty','F&B','Health & Wellness','Tech','Travel','Finance','Real Estate','Other'];
const SECTIONS: Section[] = ['PERFORMANCE','RETENTION','CREATIVES'];
const SECTION_LABELS: Record<Section, string> = { PERFORMANCE: 'Performance', RETENTION: 'Retention', CREATIVES: 'Creatives' };

interface MemberAccess { userId: string; sections: Section[] }

export default function AddProjectModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0); // 0=brand, 1=sections, 2=members
  const [form, setForm] = useState({
    name: '', description: '', founderName: '', contactPerson: '',
    industry: '', website: '', color: COLORS[0],
  });
  const [selectedSections, setSelectedSections] = useState<Section[]>([]);
  const [memberAccess, setMemberAccess] = useState<MemberAccess[]>([]);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const createProject = useMutation({
    mutationFn: () => api.post('/clients', {
      name: form.name, description: form.description, color: form.color,
      founderName: form.founderName, contactPerson: form.contactPerson,
      industry: form.industry, website: form.website,
      sections: selectedSections,
      members: memberAccess
        .filter(m => m.sections.length > 0)
        .map(m => ({ userId: m.userId, sections: m.sections.join(',') })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients-section'] });
      handleClose();
    }
  });

  const handleClose = () => {
    setStep(0);
    setForm({ name: '', description: '', founderName: '', contactPerson: '', industry: '', website: '', color: COLORS[0] });
    setSelectedSections([]);
    setMemberAccess([]);
    onClose();
  };

  const toggleSection = (s: Section) =>
    setSelectedSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleMemberSection = (userId: string, section: Section) => {
    setMemberAccess(prev => {
      const existing = prev.find(m => m.userId === userId);
      if (existing) {
        const newSections = existing.sections.includes(section)
          ? existing.sections.filter(s => s !== section)
          : [...existing.sections, section];
        return prev.map(m => m.userId === userId ? { ...m, sections: newSections } : m);
      }
      return [...prev, { userId, sections: [section] }];
    });
  };

  const getMemberSections = (userId: string) =>
    memberAccess.find(m => m.userId === userId)?.sections || [];

  const isMemberAdded = (userId: string) => getMemberSections(userId).length > 0;

  const steps = ['Brand details', 'Departments', 'Team members'];

  return (
    <Modal open={open} onClose={handleClose} title="Add new account" size="lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step ? setStep(i) : undefined}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                i === step ? 'text-gray-900' : i < step ? 'text-green-600 cursor-pointer' : 'text-gray-400'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? 'bg-green-500 text-white' : i === step ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Brand Details */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account name *</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-400" placeholder="e.g. Brew & Co" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" rows={2} placeholder="Brief description of the brand" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Founder / Key person</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Name" value={form.founderName} onChange={e => setForm(f => ({ ...f, founderName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand contact</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Contact person" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="brandname.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'scale-110 ring-2 ring-gray-800 ring-offset-1' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} disabled={!form.name.trim()} className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">Continue →</button>
            <button onClick={handleClose} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Step 1: Sections/Departments */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Which departments will work on <strong>{form.name}</strong>?</p>
          <div className="space-y-2">
            {SECTIONS.map(s => {
              const active = selectedSections.includes(s);
              const sectionColors: Record<Section, string> = { PERFORMANCE: '#3b82f6', RETENTION: '#10b981', CREATIVES: '#ec4899' };
              return (
                <button key={s} onClick={() => toggleSection(s)} className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: active ? sectionColors[s] : '#f3f4f6' }}>
                    <div className={`w-4 h-4 rounded-sm`} style={{ backgroundColor: active ? '#fff' : sectionColors[s] }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{SECTION_LABELS[s]}</p>
                    <p className="text-xs text-gray-400">{{ PERFORMANCE: 'Paid media, ads, acquisition', RETENTION: 'Email, SMS, loyalty programs', CREATIVES: 'Visuals, videos, brand assets' }[s]}</p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                      {active && <Check size={11} className="text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(0)} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">← Back</button>
            <button onClick={() => setStep(2)} disabled={selectedSections.length === 0} className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">Continue →</button>
          </div>
        </div>
      )}

      {/* Step 2: Team Members */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Assign team members and their section access for <strong>{form.name}</strong> account.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {users.filter(u => u.role === 'MEMBER').map(u => {
              const memberSections = getMemberSections(u.id);
              const isAdded = isMemberAdded(u.id);
              return (
                <div key={u.id} className={`p-3 rounded-xl border transition-all ${isAdded ? 'border-gray-300 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold flex-shrink-0">{u.name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-11">
                    {selectedSections.map(s => {
                      const active = memberSections.includes(s);
                      return (
                        <button key={s} onClick={() => toggleMemberSection(u.id, s)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${active ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                          {SECTION_LABELS[s]}
                        </button>
                      );
                    })}
                    {memberSections.length === 0 && <span className="text-xs text-gray-300 italic">Click sections to assign</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">← Back</button>
            <button
              onClick={() => createProject.mutate()}
              disabled={createProject.isPending}
              className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {createProject.isPending ? 'Creating...' : `Create account`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
