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
const SECTION_DESCS: Record<Section, string> = {
  PERFORMANCE: 'Paid media, ads, acquisition',
  RETENTION: 'Email, SMS, loyalty programs',
  CREATIVES: 'Visuals, videos, brand assets',
};
const SECTION_COLORS: Record<Section, string> = { PERFORMANCE: '#3b82f6', RETENTION: '#10b981', CREATIVES: '#ec4899' };

interface MemberAccess { userId: string; sections: Section[] }

const inputClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const selectClass = 'w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-xl px-3 py-2.5 text-sm focus:border-[#00d4c8] focus:outline-none transition-colors';
const labelClass = 'block text-sm font-medium text-gray-200 mb-1';

export default function AddProjectModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
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
                i === step ? 'text-white' : i < step ? 'text-[#00d4c8] cursor-pointer' : 'text-[#4a6278]'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? 'bg-[#00d4c8] text-[#0a1628]' : i === step ? 'bg-white text-[#0a1628]' : 'bg-[#162032] text-[#4a6278]'
              }`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-[#00d4c8]/40' : 'bg-[#1e3a5f]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Brand Details */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Account name *</label>
            <input className={inputClass} placeholder="e.g. Brew & Co" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Brief description of the brand" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Founder / Key person</label>
              <input className={inputClass} placeholder="Name" value={form.founderName} onChange={e => setForm(f => ({ ...f, founderName: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass}>Brand contact</label>
              <input className={inputClass} placeholder="Contact person" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Industry</label>
              <select className={selectClass} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input className={inputClass} placeholder="brandname.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Account color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'scale-110 ring-2 ring-[#00d4c8] ring-offset-2 ring-offset-[#0d1f38]' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} disabled={!form.name.trim()} className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors">Continue →</button>
            <button onClick={handleClose} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-[#8fa3b8] hover:bg-[#162032] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Step 1: Sections/Departments */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[#8fa3b8]">Which departments will work on <strong className="text-white">{form.name}</strong>?</p>
          <div className="space-y-2">
            {SECTIONS.map(s => {
              const active = selectedSections.includes(s);
              return (
                <button key={s} onClick={() => toggleSection(s)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-[#00d4c8] bg-[#00d4c8]/5' : 'border-[#1e3a5f] hover:border-[#8fa3b8]/40'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? SECTION_COLORS[s] + '30' : '#162032' }}>
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: SECTION_COLORS[s] }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white">{SECTION_LABELS[s]}</p>
                    <p className="text-xs text-[#4a6278]">{SECTION_DESCS[s]}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-[#00d4c8] border-[#00d4c8]' : 'border-[#1e3a5f]'}`}>
                    {active && <Check size={11} className="text-[#0a1628]" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(0)} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-[#8fa3b8] hover:bg-[#162032] transition-colors">← Back</button>
            <button onClick={() => setStep(2)} disabled={selectedSections.length === 0} className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors">Continue →</button>
          </div>
        </div>
      )}

      {/* Step 2: Team Members */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-[#8fa3b8]">Assign team members and their section access for <strong className="text-white">{form.name}</strong>.</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {users.filter(u => u.role === 'MEMBER').map(u => {
              const memberSections = getMemberSections(u.id);
              const isAdded = isMemberAdded(u.id);
              return (
                <div key={u.id} className={`p-3 rounded-xl border transition-all ${isAdded ? 'border-[#00d4c8]/30 bg-[#00d4c8]/5' : 'border-[#1e3a5f] bg-[#162032]/40'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#162032] border border-[#1e3a5f] flex items-center justify-center text-xs font-semibold text-[#00d4c8] flex-shrink-0">{u.name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs text-[#4a6278]">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-11">
                    {selectedSections.map(s => {
                      const active = memberSections.includes(s);
                      return (
                        <button key={s} onClick={() => toggleMemberSection(u.id, s)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${active ? 'bg-[#00d4c8] text-[#0a1628] border-[#00d4c8]' : 'border-[#1e3a5f] text-[#4a6278] hover:border-[#8fa3b8]'}`}>
                          {SECTION_LABELS[s]}
                        </button>
                      );
                    })}
                    {memberSections.length === 0 && <span className="text-xs text-[#4a6278] italic">Click sections to assign</span>}
                  </div>
                </div>
              );
            })}
            {users.filter(u => u.role === 'MEMBER').length === 0 && (
              <p className="text-sm text-[#4a6278] text-center py-4">No members to assign</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="px-4 border border-[#1e3a5f] rounded-xl text-sm text-[#8fa3b8] hover:bg-[#162032] transition-colors">← Back</button>
            <button
              onClick={() => createProject.mutate()}
              disabled={createProject.isPending}
              className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-xl py-2.5 text-sm font-bold hover:bg-[#00b8ac] disabled:opacity-50 transition-colors"
            >
              {createProject.isPending ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
