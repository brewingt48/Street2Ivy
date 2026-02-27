'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TargetRole {
  id: string;
  title: string;
  description: string;
  skill_count: number;
  source: string;
}

interface TargetRoleSelectorProps {
  selectedRoleId: string | null;
  onRoleSelect: (roleId: string) => void;
}

export function TargetRoleSelector({ selectedRoleId, onRoleSelect }: TargetRoleSelectorProps) {
  const [roles, setRoles] = useState<TargetRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch('/api/target-roles');
        const data = await res.json();
        setRoles(data.roles || []);
      } catch (err) {
        console.error('Failed to fetch target roles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoles();
  }, []);

  if (loading) {
    return <div className="h-10 w-64 animate-pulse bg-slate-100 rounded-md" />;
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-slate-600">Target Role:</label>
      <Select value={selectedRoleId || ''} onValueChange={onRoleSelect}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select a career role..." />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              <div className="flex items-center gap-2">
                {role.title}
                {role.source === 'handshake_api' && (
                  <Badge variant="outline" className="text-xs">Handshake</Badge>
                )}
                <span className="text-xs text-slate-400">{role.skill_count} skills</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
