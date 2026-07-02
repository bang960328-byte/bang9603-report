import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message ?? '로그인에 실패했습니다.');
    }
  };

  const fillTestAccount = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-navy-800">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">COSS 성과지표 총괄관리 시스템</h1>
          <p className="mt-1 text-sm text-gray-500">데이터보안·활용 혁신융합대학사업단</p>
          <p className="mt-0.5 text-xs font-medium text-navy-600">2026년도 3차년도</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">아이디(이메일)</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@coss.kangwon.ac.kr"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
            </div>

            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 rounded-md border border-navy-100 bg-navy-50/60 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-navy-700">
              <Info className="h-3.5 w-3.5" />
              테스트 계정 안내 (클릭 시 자동 입력)
            </p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li>
                <button
                  type="button"
                  className="underline decoration-dotted underline-offset-2 hover:text-navy-700"
                  onClick={() => fillTestAccount('admin@coss.kangwon.ac.kr', 'admin1234')}
                >
                  관리자: admin@coss.kangwon.ac.kr / admin1234
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="underline decoration-dotted underline-offset-2 hover:text-navy-700"
                  onClick={() => fillTestAccount('kw@coss.kangwon.ac.kr', 'kw1234')}
                >
                  대학 담당자(강원대): kw@coss.kangwon.ac.kr / kw1234
                </button>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          강원대학교 데이터보안·활용 혁신융합대학사업단 (COSS) 내부 업무시스템
        </p>
      </div>
    </div>
  );
}
