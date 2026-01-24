import { useState, useEffect } from 'react';
import { IconX } from './Icons';
import { sendVerificationCode, verifyEmail } from '../utils/authApi';
import { useAuth } from '../hooks/useAuth';

const EmailVerificationModal = ({ isOpen, onClose, email, onVerified }) => {
  const { refreshSession } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timer <= 0) {
      if (timer <= 0) setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timer]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setSuccess('');
      setTimer(600);
      setCanResend(false);
    }
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    setIsSending(true);
    setError('');
    setSuccess('');

    try {
      const result = await sendVerificationCode(email);

      if (result.success) {
        setSuccess('인증 코드가 재발송되었습니다');
        setTimer(600);
        setCanResend(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || '인증 코드 발송에 실패했습니다');
      }
    } catch (err) {
      setError('인증 코드 발송 중 오류가 발생했습니다');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code || code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError('인증 코드는 숫자만 입력 가능합니다');
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyEmail(email, code);

      if (result.success) {
        setSuccess('이메일이 성공적으로 인증되었습니다');

        // Refresh auth context to update user data
        await refreshSession();

        // Call callback if provided
        if (onVerified) {
          onVerified();
        }

        // Close modal after 1.5 seconds
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || '인증에 실패했습니다');
      }
    } catch (err) {
      setError('인증 중 오류가 발생했습니다');
    } finally {
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
          <h2 className="text-xl font-bold text-slate-800">이메일 인증</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Info */}
          <div className="text-center space-y-2">
            <p className="text-slate-700">
              <span className="font-bold">{email}</span>로
            </p>
            <p className="text-slate-700">인증 코드가 발송되었습니다.</p>
            <p className="text-sm text-slate-500">
              이메일에서 6자리 인증 코드를 확인하여 입력해주세요.
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 text-center">
                인증 코드
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                placeholder="6자리 숫자 입력"
                maxLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-center text-2xl font-bold tracking-widest"
                autoFocus
              />
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className={`${timer <= 60 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                  {formatTime(timer)} 남음
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || isSending}
                  className="text-blue-600 hover:text-blue-700 font-bold disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {isSending ? '발송 중...' : '재발송'}
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '인증 중...' : '인증하기'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </form>

          {/* Help text */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            <div className="font-bold mb-1">도움말</div>
            <ul className="space-y-1 list-disc list-inside">
              <li>이메일을 받지 못하셨다면 스팸함을 확인해주세요</li>
              <li>인증 코드는 10분간 유효합니다</li>
              <li>코드가 만료되면 "재발송" 버튼을 클릭하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
