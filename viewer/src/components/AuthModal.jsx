import { useState, useEffect } from 'react';
import { IconX } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { checkUsernameAvailable } from '../utils/authApi';

const AuthModal = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const { login, signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    username: '',
    nickname: '',
    password: '',
    passwordConfirm: '',
    email: '',
  });

  // Username availability check
  const [usernameCheck, setUsernameCheck] = useState({
    checking: false,
    available: null,
    message: '',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setLoginData({ username: '', password: '' });
      setSignupData({ username: '', nickname: '', password: '', passwordConfirm: '', email: '' });
      setError('');
      setUsernameCheck({ checking: false, available: null, message: '' });
    }
  }, [isOpen]);

  // Debounced username check
  useEffect(() => {
    if (tab !== 'signup') return;
    if (!signupData.username) {
      setUsernameCheck({ checking: false, available: null, message: '' });
      return;
    }

    // Validate format first
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(signupData.username)) {
      setUsernameCheck({
        checking: false,
        available: false,
        message: '3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다',
      });
      return;
    }

    setUsernameCheck({ checking: true, available: null, message: '확인 중...' });

    const timeoutId = setTimeout(async () => {
      const result = await checkUsernameAvailable(signupData.username);
      if (result.available) {
        setUsernameCheck({
          checking: false,
          available: true,
          message: '사용 가능한 아이디입니다',
        });
      } else {
        setUsernameCheck({
          checking: false,
          available: false,
          message: result.error || '이미 사용 중인 아이디입니다',
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [signupData.username, tab]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginData.username || !loginData.password) {
      setError('아이디와 비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginData.username, loginData.password);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || '로그인에 실패했습니다');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!signupData.username || !signupData.nickname || !signupData.password) {
      setError('필수 항목을 모두 입력해주세요');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(signupData.username)) {
      setError('아이디는 3-20자의 영문, 숫자, 언더스코어만 사용 가능합니다');
      return;
    }

    if (signupData.nickname.length < 2 || signupData.nickname.length > 30) {
      setError('닉네임은 2-30자여야 합니다');
      return;
    }

    if (signupData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }

    if (signupData.password !== signupData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (!usernameCheck.available) {
      setError('사용 가능한 아이디를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[AuthModal.handleSignup] Calling signup...');
      const result = await signup(
        signupData.username,
        signupData.nickname,
        signupData.password,
        signupData.email || null
      );
      console.log('[AuthModal.handleSignup] Got result:', result);

      if (result.success) {
        console.log('[AuthModal.handleSignup] Success! Calling onClose...');
        onClose();
      } else {
        console.log('[AuthModal.handleSignup] Failed, showing error');
        setError(result.error || '회원가입에 실패했습니다');
      }
    } catch (err) {
      console.error('[AuthModal.handleSignup] Exception:', err);
      setError('회원가입 중 오류가 발생했습니다');
    } finally {
      console.log('[AuthModal.handleSignup] Finally, setting isLoading=false');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTab('login');
                setError('');
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                tab === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setTab('signup');
                setError('');
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                tab === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              회원가입
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder="아이디를 입력하세요"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>
          )}

          {/* Signup form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={signupData.username}
                  onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                  placeholder="3-20자 (영문, 숫자, _)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="username"
                  required
                />
                {signupData.username && (
                  <p
                    className={`text-xs mt-1 ${
                      usernameCheck.available === true
                        ? 'text-green-600'
                        : usernameCheck.available === false
                        ? 'text-red-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {usernameCheck.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={signupData.nickname}
                  onChange={(e) => setSignupData({ ...signupData, nickname: e.target.value })}
                  placeholder="2-30자"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="nickname"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  placeholder="최소 6자"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={signupData.passwordConfirm}
                  onChange={(e) => setSignupData({ ...signupData, passwordConfirm: e.target.value })}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  이메일 <span className="text-slate-500 text-xs">(선택사항)</span>
                </label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  placeholder="이메일 주소 (나중에 추가 가능)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  autoComplete="email"
                />
                <p className="text-xs text-slate-500 mt-1">
                  이메일은 나중에 프로필에서 추가할 수 있습니다
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-600 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading || usernameCheck.checking || !usernameCheck.available}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '가입 중...' : '회원가입'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
