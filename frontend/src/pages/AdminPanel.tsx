import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import api from '../lib/api';
import { User, Role } from '../types';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../stores/authStore';

const CAPABILITIES = [
  { key: 'view_assigned', label: 'View assigned clients', superAdmin: true, admin: true, member: true },
  { key: 'view_all', label: 'View all clients', superAdmin: true, admin: true, member: false },
  { key: 'create_assign', label: 'Create & assign tasks', superAdmin: true, admin: true, member: false },
  { key: 'recurring', label: 'Create recurring tasks', superAdmin: true, admin: true, member: false },
  { key: 'events', label: 'Add / schedule events', superAdmin: true, admin: true, member: false },
  { key: 'members', label: 'Add or remove members', superAdmin: true, admin: true, member: false },
  { key: 'roles', label: 'Change member roles', superAdmin: true, admin: false, member: false },
  { key: 'delete', label: 'Delete clients / data', superAdmin: true, admin: true, member: false },
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-900/40 text-purple-300',
  ADMIN: 'bg-blue-900/40 text-blue-300',
  MEMBER: 'bg-[#162032] text-gray-300',
};

const roleLabels: Record<string, string> = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin', MEMBER: 'Member' };

export default function AdminPanel() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'MEMBER' as Role });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>('MEMBER');

  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setAddOpen(false); setForm({ name: '', email: '', password: '', role: 'MEMBER' }); }
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.put(`/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingUser(null); }
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
  });

  const canManage = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const canChangeRoles = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin panel</h1>
          <p className="text-sm text-[#8fa3b8] mt-0.5">Manage team members, roles and permissions</p>
        </div>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 bg-[#00d4c8] text-[#0a1628] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#00b8ac]">
            <Plus size={15} /> Add member
          </button>
        )}
      </div>

      {/* Team members */}
      <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e3a5f]">
          <h2 className="font-semibold text-white">Team members</h2>
        </div>
        <div className="divide-y divide-[#1e3a5f]">
          {users.map(u => (
            <div key={u.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: u.role === 'SUPER_ADMIN' ? '#8b5cf6' : u.role === 'ADMIN' ? '#3b82f6' : '#6b7280' }}>
                {u.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{u.name}</p>
                <p className="text-xs text-[#4a6278]">{u.email}</p>
              </div>
              {editingUser?.id === u.id ? (
                <div className="flex items-center gap-2">
                  <select className="border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-2 py-1.5 text-sm" value={editRole} onChange={e => setEditRole(e.target.value as Role)}>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super admin</option>}
                  </select>
                  <button onClick={() => updateRole.mutate({ id: u.id, role: editRole })} className="p-1.5 bg-green-900/20 text-green-400 rounded-lg hover:bg-green-900/40"><Check size={14} /></button>
                  <button onClick={() => setEditingUser(null)} className="p-1.5 bg-[#162032] text-gray-300 rounded-lg hover:bg-[#1e3a5f]"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[u.role] || roleColors.MEMBER}`}>{roleLabels[u.role] || u.role}</span>
                  {u.clients && u.clients.length > 0 && (
                    <span className="text-xs text-[#4a6278] max-w-[200px] truncate">{u.clients.map(c => c.name).join(', ')}</span>
                  )}
                  {u.clients && u.clients.length === 0 && <span className="text-xs text-[#4a6278]">All clients</span>}
                  {canChangeRoles && u.id !== currentUser?.id && (
                    <button onClick={() => { setEditingUser(u); setEditRole(u.role); }} className="p-1.5 hover:bg-[#162032] rounded-lg text-[#4a6278]"><Edit2 size={13} /></button>
                  )}
                  {canManage && u.id !== currentUser?.id && u.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => { if (confirm(`Remove ${u.name}?`)) deleteUser.mutate(u.id); }} className="p-1.5 hover:bg-red-900/20 rounded-lg text-red-400"><Trash2 size={13} /></button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Roles & permissions */}
      <div className="bg-[#0d1f38] border border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e3a5f]">
          <h2 className="font-semibold text-white">Roles & permissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e3a5f]">
                <th className="px-5 py-3 text-left text-sm font-medium text-[#8fa3b8]">Capability</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-[#8fa3b8]">Super admin</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-[#8fa3b8]">Admin</th>
                <th className="px-5 py-3 text-center text-sm font-medium text-[#8fa3b8]">Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {CAPABILITIES.map(cap => (
                <tr key={cap.key} className="hover:bg-[#162032]">
                  <td className="px-5 py-3.5 text-sm text-gray-200">{cap.label}</td>
                  {(['superAdmin', 'admin', 'member'] as const).map(role => (
                    <td key={role} className="px-5 py-3.5 text-center">
                      <div className={`inline-flex w-5 h-5 rounded border ${cap[role] ? 'bg-green-900/20 border-green-700/40' : 'bg-[#162032] border-[#1e3a5f]'} items-center justify-center`}>
                        {cap[role] && <div className="w-2 h-2 rounded-sm bg-green-500" />}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#1e3a5f] flex items-center gap-2 text-xs text-[#4a6278]">
          <div className="w-3.5 h-3.5 rounded border border-[#1e3a5f] bg-[#162032]" />
          Members only see clients they're assigned to and cannot add members or delete data.
        </div>
      </div>

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add team member" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Full name *</label>
            <input className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-lg px-3 py-2 text-sm" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email *</label>
            <input type="email" className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-lg px-3 py-2 text-sm" placeholder="jane@knerdmedia.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
            <input type="password" className="w-full border border-[#1e3a5f] bg-[#162032] text-white placeholder:text-[#4a6278] rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for default (knerd123)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Role</label>
            <select className="w-full border border-[#1e3a5f] bg-[#162032] text-white rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              {currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super admin</option>}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => createUser.mutate()} disabled={!form.name || !form.email || createUser.isPending} className="flex-1 bg-[#00d4c8] text-[#0a1628] rounded-lg py-2.5 text-sm font-medium hover:bg-[#00b8ac] disabled:opacity-50">
              {createUser.isPending ? 'Adding...' : 'Add member'}
            </button>
            <button onClick={() => setAddOpen(false)} className="px-4 border border-[#1e3a5f] rounded-lg text-sm text-gray-200 hover:bg-[#162032]">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
