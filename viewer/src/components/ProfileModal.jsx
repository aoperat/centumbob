import { useState, useEffect } from 'react';
import { IconX } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { checkEmailAvailable, sendVerificationCode } from '../utils/authApi';
import EmailVerificationModal from './EmailVerificationModal';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
  });

  const [emailCheck, setEmailCheck] = useState({
    checking: false,
    available: null,
    message: '',
  });

  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Reset messages when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccess('');
      setEmailCheck({ checking: false, available: null, message: '' });
    }
  }, [isOpen]);

  // Check email availability when email changes
  useEffect(() => {
    if (!formData.email) {
      setEmailCheck({ checking: false, available: null, message: '' });
      return;
    }

    // If email hasn't changed, don't check
    if (formData.email === user?.email) {
      setEmailCheck({ checking: false, available: true, message: '' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailCheck({
        checking: false,
        available: false,
        message: '유효한 이메일 주소를 입력해주세요',
      });
      return;
    }

    setEmailCheck({ checking: true, available: null, message: '확인 중...' });

    const timeoutId = setTimeout(async () => {
      const result = await checkEmailAvailable(formData.email);
      if (result.available) {
        setEmailCheck({
          checking: false,
          available: true,
          message: '사용 가능한 이메일입니다',
        });
      } else {
        setEmailCheck({
          checking: false,
          available: false,
          message: result.error || '이미 사용 중인 이메일입니다',
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email, user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.nickname) {
      setError('닉네임을 입력해주세요');
      return;
    }

    if (formData.nickname.length < 2 || formData.nickname.length > 30) {
      setError('닉네임은 2-30자여야 합니다');
      return;
    }

    if (formData.email && !emailCheck.available) {
      setError('사용 가능한 이메일을 입력해주세요');
      return;
    }

    // Check if anything changed
    const nicknameChanged = formData.nickname !== user?.nickname;
    const emailChanged = formData.email !== user?.email;

    if (!nicknameChanged && !emailChanged) {
      setError('변경된 내용이 없습니다');
      return;
    }

    setIsLoading(true);
    try {
      const updates = {};
      if (nicknameChanged) updates.nickname = formData.nickname;
      if (emailChanged) updates.email = formData.email || null;

      const result = await updateUserProfile(updates);

      if (result.success) {
        setSuccess('프로필이 성공적으로 업데이트되었습니다');

        // Show success message for 2 seconds then close
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || '프로필 업데이트에 실패했습니다');
      }
    } catch (err) {
      setError('프로필 업데이트 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

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
          <h2 className="text-xl font-bold text-slate-800">프로필 설정</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                아이디
              </label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">아이디는 변경할 수 없습니다</p>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                닉네임 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="2-30자"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                이메일 <span className="text-slate-500 text-xs">(선택사항)</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일 주소"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {formData.email && formData.email !== user.email && (
                <p
                  className={`text-xs mt-1 ${
                    emailCheck.available === true
                      ? 'text-green-600'
                      : emailCheck.available === false
                      ? 'text-red-600'
                      : 'text-slate-500'
                  }`}
                >
                  {emailCheck.message}
                </p>
              )}

              {/* Email verification status */}
              {user.email && (
                <div className="mt-2 flex items-center gap-2">
                  {user.email_verified ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                      인증됨
                    </span>
                  ) : (
                    <>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">
                        미인증
                      </span>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                        onClick={async () => {
                          setError('');
                          setSuccess('');
                          const result = await sendVerificationCode(user.email);
                          if (result.success) {
                            setShowVerificationModal(true);
                          } else {
                            setError(result.error || '인증 코드 발송에 실패했습니다');
                          }
                        }}
                      >
                        인증 이메일 발송
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password change (future feature) */}
            <div className="pt-2">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 font-bold"
                onClick={() => {
                  setError('비밀번호 변경 기능은 아직 구현되지 않았습니다');
                }}
              >
                비밀번호 변경
              </button>
            </div>

            {/* Buttons */}
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
                disabled={isLoading || (formData.email && formData.email !== user.email && !emailCheck.available)}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        email={user.email}
        onVerified={async () => {
          // Refresh user profile to show verified status
          const profileResult = await updateUserProfile({});
          if (profileResult.success) {
            setSuccess('이메일이 인증되었습니다');
          }
        }}
      />
    </div>
  );
};

export default ProfileModal;
