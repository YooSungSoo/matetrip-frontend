import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Map as MapIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import client from '../api/client';
import type { ApiErrorResponse, LoginSuccessResponse } from '../types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LoginProps {
  onLogin: () => void;
  onSignupClick: () => void;
}

/**
 * Main Application Component
 */
export function Login({ onLogin, onSignupClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이전 에러 메시지 초기화
    setErrorMessage('');

    try {
      // 1. NestJS 백엔드에 로그인 요청
      const response = await client.post<LoginSuccessResponse>(
        '/auth/login',
        {
          email: email,
          password: password,
        },
        { withCredentials: true }
      ); // 쿠키 전달을 위해 withCredentials 설정

      if (response.status === 200) {
        // 2. 로그인 성공
        onLogin(); // App.tsx의 handleLogin을 호출하여 Zustand 상태를 업데이트합니다.
        navigate('/main'); // 메인으로 이동
      }
    } catch (error) {
      // 3. 로그인 실패. axios 에러 객체(AxiosError)로 타입 가드 수행
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data as ApiErrorResponse;
        setErrorMessage(apiError.message || '로그인에 실패했습니다.');
      } else {
        // 네트워크 오류 또는 알 수 없는 오류
        setErrorMessage(
          '서버에 연결할 수 없거나 알 수 없는 오류가 발생했습니다.'
        );
      }

      console.error('로그인 중 에러 발생 : ', error);
    }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Send password reset email to:', resetEmail);
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      {/* Card Container */}
      <div className="w-full max-w-lg md:max-w-md bg-white shadow-sm rounded-3xl p-8 md:p-10 border border-gray-100">
        {/* Header Logo */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-linear-to-br bg-primary p-2.5 rounded-xl shadow-primary-soft text-white">
              <MapIcon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              MateTrip
            </h1>
          </div>
        </div>

        {/* Login Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">로그인</h2>
            <p className="text-gray-500 text-sm mt-1">
              여행의 시작, 메이트트립과 함께하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">이메일</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p className="text-red-500 text-sm text-center">{errorMessage}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  로그인 상태 유지
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary-strong"
              >
                비밀번호 찾기
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r bg-primary hover:bg-primary-strong"
            >
              로그인
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-500 mb-2">아직 계정이 없으신가요?</p>
            <button
              type="button"
              onClick={onSignupClick}
              className="text-primary hover:text-primary-strong"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>

      {/* Footer Terms (Separated) */}
      <div className="mt-8 text-center px-4 max-w-md animate-in fade-in duration-700">
        <p className="text-xs text-gray-400 leading-relaxed">
          로그인함으로써 MateTrip의{' '}
          <a href="#" className="text-blue-500 hover:underline font-medium">
            이용약관
          </a>{' '}
          및{' '}
          <a href="#" className="text-blue-500 hover:underline font-medium">
            개인정보처리방침
          </a>
          에 동의합니다.
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-gray-900 mb-2">비밀번호 찾기</h3>
            <p className="text-gray-600 mb-6 text-sm">
              가입하신 이메일 주소를 입력하시면 임시 비밀번호를 보내드립니다.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="resetEmail">이메일</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="example@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-strong"
                >
                  임시 비밀번호 발송
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
