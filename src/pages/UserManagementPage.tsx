import { useEffect, useState } from 'react';
import { Plus, Save, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getUsers, upsertUser } from '@/services/api';
import type { User, UserRole } from '@/types';
import { UNIVERSITIES } from '@/types';

const emptyForm: Omit<User, 'user_id'> = {
  name: '',
  email: '',
  role: 'university',
  university_name: UNIVERSITIES[0],
  password: '',
  status: '사용',
};

export function UserManagementPage() {
  const { user: actor } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    getUsers().then((data) => {
      setUsers(data);
      setIsLoading(false);
    });
  }, []);

  const updateUserField = (userId: string, field: keyof User, value: string) => {
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, [field]: value } : u)));
  };

  const handleSaveUser = async (target: User) => {
    if (!actor) return;
    setSavingId(target.user_id);
    const res = await upsertUser(target, { user_id: actor.user_id, user_name: actor.name });
    setSavingId(null);
    if (res.success) {
      showToast('success', `${target.name} 계정 정보가 저장되었습니다.`);
    } else {
      showToast('error', res.message ?? '저장에 실패했습니다.');
    }
  };

  const handleAddUser = async () => {
    if (!actor) return;
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast('error', '이름, 이메일, 비밀번호는 필수 입력값입니다.');
      return;
    }
    const nextId = `U${String(users.length + 1).padStart(3, '0')}`;
    const newUser: User = { user_id: nextId, ...form };
    const res = await upsertUser(newUser, { user_id: actor.user_id, user_name: actor.name });
    if (res.success) {
      setUsers((prev) => [...prev, newUser]);
      setForm(emptyForm);
      setShowAddForm(false);
      showToast('success', '사용자 계정이 추가되었습니다.');
    } else {
      showToast('error', res.message ?? '계정 추가에 실패했습니다.');
    }
  };

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        description="시스템 사용자 계정과 권한, 소속대학, 사용 여부를 관리합니다."
        actions={
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-700"
          >
            <UserPlus className="h-4 w-4" />
            사용자 추가
          </button>
        }
      />

      {showAddForm && (
        <Card title="신규 사용자 추가" className="mb-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">이름</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">이메일(아이디)</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">초기 비밀번호</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">권한</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              >
                <option value="admin">admin (관리자)</option>
                <option value="university">university (대학 담당자)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">소속대학</label>
              <select
                value={form.university_name}
                onChange={(e) => setForm((f) => ({ ...f, university_name: e.target.value }))}
                disabled={form.role === 'admin'}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 disabled:bg-gray-100"
              >
                {form.role === 'admin' && <option value="전체">전체</option>}
                {UNIVERSITIES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">계정 사용 여부</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as User['status'] }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              >
                <option value="사용">사용</option>
                <option value="중지">중지</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAddUser}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-700"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-3 py-2">사용자ID</th>
                <th className="whitespace-nowrap px-3 py-2">이름</th>
                <th className="whitespace-nowrap px-3 py-2">이메일</th>
                <th className="whitespace-nowrap px-3 py-2">권한</th>
                <th className="whitespace-nowrap px-3 py-2">소속대학</th>
                <th className="whitespace-nowrap px-3 py-2">사용 여부</th>
                <th className="whitespace-nowrap px-3 py-2 text-center">저장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && users.map((u) => (
                <tr key={u.user_id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-500">{u.user_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-700">{u.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600">{u.email}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserField(u.user_id, 'role', e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    >
                      <option value="admin">admin</option>
                      <option value="university">university</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <select
                      value={u.university_name}
                      onChange={(e) => updateUserField(u.user_id, 'university_name', e.target.value)}
                      disabled={u.role === 'admin'}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 disabled:bg-gray-100"
                    >
                      <option value="전체">전체</option>
                      {UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>{uni}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <select
                      value={u.status}
                      onChange={(e) => updateUserField(u.user_id, 'status', e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    >
                      <option value="사용">사용</option>
                      <option value="중지">중지</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleSaveUser(u)}
                      disabled={savingId === u.user_id}
                      className="inline-flex items-center gap-1 rounded-md bg-navy-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:bg-gray-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      저장
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p>}
        </div>
      </Card>
    </div>
  );
}
