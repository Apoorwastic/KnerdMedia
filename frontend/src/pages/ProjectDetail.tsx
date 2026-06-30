import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, Trash2, Plus, X, Globe, Check, ExternalLink, Users, Building2, Phone, Link2, Layers } from 'lucide-react';
import api from '../lib/api';
import { Client, Section, User, ClientLink } from '../types';

const SECTIONS: Section[] = ['PERFORMANCE', 'RETENTION', 'CREATIVES'];
const SECTION_LABELS: Record<Section, string> = { PERFORMANCE: 'Performance', RETENTION: 'Retention', CREATIVES: 'Creatives' };
const SECTION_COLORS: Record<Section, string> = { PERFORMANCE: 'bg-blue-100 text-blue-700', RETENTION: 'bg-emerald-100 text-emerald-700', CREATIVES: 'bg-pink-100 text-pink-700' };
const INDUSTRIES = ['E-commerce','Fashion & Beauty','F&B','Health & Wellness','Tech','Travel','Finance','Real Estate','Other'];
const COLORS = ['#6366f1','#f97316','#16a34a','#ec4899','#8b5cf6','#0ea5e9','#f59e0b','#ef4444','#14b8a6','#64748b'];

type Tab = 'info' | 'team' | 'links';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', url: '' });
  const [addingLink, setAddingLink] = useState(false);

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['client', id],
    queryFn: () => api.get(`/clients/${id}`).then(r => r.data),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const [form, setForm] = useState<null | {
    name: string; description: string; founderName: string; contactPerson: string;
    industry: string; website: string; color: string;
    selectedSections: Section[];
    memberAccess: { userId: string; sections: Section[] }[];
  }>(null);

  const startEdit = () => {
    if (!client) return;
    setForm({
      name: client.name, description: client.description || '', founderName: client.founderName || '',
      contactPerson: client.contactPerson || '', industry: client.industry || '',
      website: client.website || '', color: client.color,
      selectedSections: client.sections.map(s => s.section as Section),
      memberAccess: client.members.map(m => ({
        userId: m.userId,
        sections: m.sections ? m.sections.split(',') as Section[] : client.sections.map(s => s.section as Section),
      })),
    });
    setEditing(true);
  };

  const updateClient = useMutation({
    mutationFn: () => api.put(`/clients/${id}`, {
      ...form,
      sections: form!.selectedSections,
      members: form!.memberAccess.filter(m => m.sections.length > 0).map(m => ({ userId: m.userId, sections: m.sections.join(',') })),
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      setEditing(false);
    }
  });

  const deleteClient = useMutation({
    mutationFn: () => api.delete(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      navigate('/accounts');
    }
  });

  const addLink = useMutation({
    mutationFn: () => api.post(`/clients/${id}/links`, linkForm).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', id] });
      setLinkForm({ title: '', url: '' });
      setAddingLink(false);
    }
  });

  const removeLink = useMutation({
    mutationFn: (linkId: string) => api.delete(`/clients/${id}/links/${linkId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', id] }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full" />
    </div>
  );
  if (!client) return <div className="text-center text-gray-400 py-20">Project not found</div>;

  const sectionList = client.sections.map(s => s.section as Section);

  const toggleFormSection = (s: Section) => {
    if (!form) return;
    setForm(f => f ? ({
      ...f,
      selectedSections: f.selectedSections.includes(s) ? f.selectedSections.filter(x => x !== s) : [...f.selectedSections, s],
    }) : f);
  };

  const toggleMemberSection = (userId: string, s: Section) => {
    if (!form) return;
    setForm(f => {
      if (!f) return f;
      const existing = f.memberAccess.find(m => m.userId === userId);
      const newSections = existing
        ? existing.sections.includes(s) ? existing.sections.filter(x => x !== s) : [...existing.sections, s]
        : [s];
      return {
        ...f,
        memberAccess: existing
          ? f.memberAccess.map(m => m.userId === userId ? { ...m, sections: newSections } : m)
          : [...f.memberAccess, { userId, sections: newSections }],
      };
    });
  };

  const getMemberSections = (userId: string) => form?.memberAccess.find(m => m.userId === userId)?.sections || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/accounts')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to accounts
        </button>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1.5 px-3 py-2 border border-red-100 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">Delete "{client.name}"?</p>
            <p className="text-xs text-red-600 mt-0.5">This will permanently delete all tasks and data for this account.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">Cancel</button>
            <button onClick={() => deleteClient.mutate()} disabled={deleteClient.isPending} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              {deleteClient.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Brand header */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="h-16 w-full" style={{ backgroundColor: client.color }} />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-7 mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md flex-shrink-0" style={{ backgroundColor: client.color }}>
              {client.name.charAt(0)}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              {client.industry && <p className="text-sm text-gray-400">{client.industry}</p>}
            </div>
          </div>
          {/* Sections */}
          <div className="flex flex-wrap gap-2">
            {sectionList.map(s => (
              <span key={s} className={`text-xs px-2.5 py-1 rounded-full font-medium ${SECTION_COLORS[s]}`}>{SECTION_LABELS[s]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
        {(['info', 'team', 'links'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-[#1a1a1a] text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            {t === 'info' ? 'Brand info' : t === 'team' ? 'Team' : 'Links'}
          </button>
        ))}
      </div>

      {/* ─── TAB: Brand Info ─── */}
      {tab === 'info' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          {editing && form ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Brand name</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.name} onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" value={form.description} onChange={e => setForm(f => f ? { ...f, description: e.target.value } : f)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Founder / Key person</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.founderName} onChange={e => setForm(f => f ? { ...f, founderName: e.target.value } : f)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Brand contact</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.contactPerson} onChange={e => setForm(f => f ? { ...f, contactPerson: e.target.value } : f)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={form.industry} onChange={e => setForm(f => f ? { ...f, industry: e.target.value } : f)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Website</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="brandname.com" value={form.website} onChange={e => setForm(f => f ? { ...f, website: e.target.value } : f)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Brand color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => f ? { ...f, color: c } : f)} className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'scale-110 ring-2 ring-gray-800 ring-offset-1' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Departments</label>
                <div className="flex gap-2">
                  {SECTIONS.map(s => {
                    const active = form.selectedSections.includes(s);
                    return (
                      <button key={s} onClick={() => toggleFormSection(s)} className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 text-gray-400'}`}>
                        {SECTION_LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => updateClient.mutate()} disabled={!form.name.trim() || updateClient.isPending} className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {updateClient.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={() => setEditing(false)} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <InfoRow icon={<Building2 size={14} />} label="Description" value={client.description} full />
              <InfoRow icon={<Phone size={14} />} label="Founder / Key person" value={client.founderName} />
              <InfoRow icon={<Phone size={14} />} label="Brand contact" value={client.contactPerson} />
              <InfoRow icon={<Layers size={14} />} label="Industry" value={client.industry} />
              <InfoRow icon={<Globe size={14} />} label="Website" value={client.website} isLink />
              {client.createdAt && <InfoRow icon={<Check size={14} />} label="Added" value={format(new Date(client.createdAt), 'MMM d, yyyy')} />}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Team ─── */}
      {tab === 'team' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {editing && form ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">Assign members and their section access.</p>
              {users.filter(u => u.role === 'MEMBER').map(u => {
                const ms = getMemberSections(u.id);
                return (
                  <div key={u.id} className={`p-3 rounded-xl border ${ms.length > 0 ? 'border-gray-300 bg-gray-50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-11">
                      {form.selectedSections.map(s => {
                        const active = ms.includes(s);
                        return (
                          <button key={s} onClick={() => toggleMemberSection(u.id, s)} className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${active ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                            {SECTION_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2 pt-2">
                <button onClick={() => updateClient.mutate()} disabled={updateClient.isPending} className="flex-1 bg-[#1a1a1a] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {updateClient.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={() => setEditing(false)} className="px-4 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {client.members.length === 0 && <p className="text-sm text-gray-400">No team members assigned.</p>}
              {client.members.map(m => {
                const memberSections = m.sections
                  ? m.sections.split(',') as Section[]
                  : sectionList;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold flex-shrink-0">{m.user.name.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                      <p className="text-xs text-gray-400">{m.user.email}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {memberSections.map(s => (
                        <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTION_COLORS[s]}`}>{SECTION_LABELS[s]}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { setTab('team'); startEdit(); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 pt-1">
                <Pencil size={12} /> Edit team
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: Links ─── */}
      {tab === 'links' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Link2 size={14} /> Account links</h3>
            <button onClick={() => setAddingLink(v => !v)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <Plus size={13} /> Add link
            </button>
          </div>

          {addingLink && (
            <div className="flex gap-2 bg-gray-50 rounded-xl p-3">
              <div className="flex-1 space-y-2">
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Label (e.g. Brand Guidelines)" value={linkForm.title} onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))} />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="URL (https://...)" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => addLink.mutate()} disabled={!linkForm.title.trim() || !linkForm.url.trim() || addLink.isPending} className="px-3 py-1.5 bg-[#1a1a1a] text-white rounded-lg text-xs font-medium disabled:opacity-50">
                  {addLink.isPending ? '…' : 'Save'}
                </button>
                <button onClick={() => setAddingLink(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-white">Cancel</button>
              </div>
            </div>
          )}

          {(!client.links || client.links.length === 0) && !addingLink && (
            <p className="text-sm text-gray-400">No links yet. Add account guidelines, drive folders, reports, etc.</p>
          )}

          <div className="space-y-2">
            {client.links?.map((link: ClientLink) => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 group transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Link2 size={14} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{link.title}</p>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block" onClick={e => e.stopPropagation()}>
                    {link.url}
                  </a>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                    <ExternalLink size={13} />
                  </a>
                  <button onClick={() => removeLink.mutate(link.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, isLink, full }: { icon: React.ReactNode; label: string; value?: string; isLink?: boolean; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">{icon} {label}</p>
      {isLink ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          {value} <ExternalLink size={11} />
        </a>
      ) : (
        <p className="text-sm text-gray-900">{value}</p>
      )}
    </div>
  );
}
