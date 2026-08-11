"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AdminService, { AdminUser } from '@/services/adminService';
import Toggle from '@/components/Toggle';
import TextInput from '@/components/TextInput';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [allRoles, setAllRoles] = useState<string[]>([]);
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [addRoleFor, setAddRoleFor] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState('');
    const [roleLoading, setRoleLoading] = useState(false);

    const [invite, setInvite] = useState({ email: '', firstName: '', lastName: '', role: 'Admin' });
    const [inviting, setInviting] = useState(false);

    const load = (deleted: boolean) => {
        setLoading(true);
        AdminService.getUsers(deleted)
            .then(setUsers)
            .catch(err => toast.error(err instanceof Error ? err.message : 'Kunne ikke laste brukere'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(includeDeleted); }, [includeDeleted]);
    useEffect(() => { AdminService.getRoles().then(setAllRoles).catch(() => toast.error('Kunne ikke laste roller')); }, []);

    const setRoles = (id: string, roles: string[]) =>
        setUsers(prev => prev.map(u => (u.id === id ? { ...u, roles } : u)));

    const assignRole = async (user: AdminUser) => {
        if (!selectedRole) return;
        setRoleLoading(true);
        try {
            await AdminService.addRole(user.id, selectedRole);
            setRoles(user.id, [...user.roles, selectedRole]);
            toast.success(`${user.firstName} har fått rollen ${selectedRole}`);
            setAddRoleFor(null);
            setSelectedRole('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke tildele rollen');
        } finally {
            setRoleLoading(false);
        }
    };

    const removeRole = async (user: AdminUser, role: string) => {
        try {
            await AdminService.removeRole(user.id, role);
            setRoles(user.id, user.roles.filter(r => r !== role));
            toast.success(`${role} er fjernet fra ${user.firstName}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke fjerne rollen');
        }
    };

    const deleteUser = async (user: AdminUser) => {
        const label = `${user.firstName} ${user.lastName}`.trim() || user.email;
        if (!confirm(`Slette ${label}? Navn, e-post og passord blir fjernet, og brukeren kan ikke logge inn igjen.`)) return;
        try {
            await AdminService.deleteUser(user.id);
            toast.success('Brukeren er slettet');
            load(includeDeleted);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke slette brukeren');
        }
    };

    const sendInvite = async () => {
        if (!invite.email.trim() || !invite.firstName.trim() || !invite.lastName.trim()) {
            toast.error('Fyll ut navn og e-post');
            return;
        }
        setInviting(true);
        try {
            await AdminService.invite(invite.email.trim(), invite.firstName.trim(), invite.lastName.trim(), invite.role);
            toast.success('Invitasjon sendt. Brukeren får en kode for å sette passord.');
            setInvite({ email: '', firstName: '', lastName: '', role: invite.role });
            load(includeDeleted);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kunne ikke sende invitasjonen');
        } finally {
            setInviting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Brukere</h2>
                <Toggle label="Vis slettede" checked={includeDeleted} onChange={setIncludeDeleted} />
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Inviter bruker</h3>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="w-40">
                        <TextInput label="Fornavn" value={invite.firstName} onChange={e => setInvite({ ...invite, firstName: e.target.value })} />
                    </div>
                    <div className="w-40">
                        <TextInput label="Etternavn" value={invite.lastName} onChange={e => setInvite({ ...invite, lastName: e.target.value })} />
                    </div>
                    <div className="flex-1 min-w-[14rem]">
                        <TextInput label="E-post" type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} />
                    </div>
                    <label className="text-xs text-gray-600">
                        Rolle
                        <select
                            value={invite.role}
                            onChange={e => setInvite({ ...invite, role: e.target.value })}
                            className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                            {allRoles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </label>
                    <button
                        onClick={sendInvite}
                        disabled={inviting}
                        className="rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
                    >
                        {inviting ? 'Sender…' : 'Send invitasjon'}
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    Brukeren får en e-post med en kode og setter passordet selv på siden for glemt passord.
                </p>
            </div>

            {loading ? (
                <p className="text-gray-500">Laster…</p>
            ) : (
                <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
                    {users.map(user => {
                        const isAddingRole = addRoleFor === user.id;
                        const available = allRoles.filter(r => !user.roles.includes(r));
                        return (
                            <li key={user.id} className="p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className={user.isDeleted ? 'text-gray-400' : 'text-gray-800'}>
                                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                                        <span className="ml-2 text-xs text-gray-500">{user.email}</span>
                                        {user.isDeleted && <span className="ml-2 text-xs text-gray-400">(slettet)</span>}
                                    </div>
                                    {!user.isDeleted && (
                                        <button
                                            onClick={() => deleteUser(user)}
                                            title="Slett bruker"
                                            className="shrink-0 p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    {user.roles.map(role => (
                                        <span key={role} className="flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700">
                                            {role}
                                            <button onClick={() => removeRole(user, role)} className="hover:text-red-600 transition-colors" title={`Fjern ${role}`}>
                                                <XMarkIcon className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                    {user.roles.length === 0 && <span className="text-xs text-gray-400">Ingen roller</span>}
                                    {!isAddingRole && !user.isDeleted && available.length > 0 && (
                                        <button
                                            onClick={() => { setAddRoleFor(user.id); setSelectedRole(available[0]); }}
                                            className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-800 transition"
                                        >
                                            <PlusIcon className="h-3 w-3" /> Legg til rolle
                                        </button>
                                    )}
                                </div>

                                {isAddingRole && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedRole}
                                            onChange={e => setSelectedRole(e.target.value)}
                                            className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                                        >
                                            {available.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <button onClick={() => assignRole(user)} disabled={roleLoading} className="rounded-lg bg-gray-900 text-white text-xs px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50 transition">
                                            {roleLoading ? '…' : 'Legg til'}
                                        </button>
                                        <button onClick={() => setAddRoleFor(null)} className="rounded-lg border border-gray-300 text-gray-700 text-xs px-3 py-1.5 hover:bg-gray-50 transition">
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
