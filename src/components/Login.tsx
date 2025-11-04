import { useState } from 'react';
import { Map, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ImageWithFallback } from './figma/ImageWithFallback';
import client from '../api/client';
import type { ApiErrorResponse, LoginSuccessResponse } from '../types';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface LoginProps {
  onLogin: () => void;
  onSignupClick: () => void;
}

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
        navigate('/'); // 홈으로 이동
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

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    // Handle social login logic
    console.log(`Login with ${provider}`);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Send password reset email to:', resetEmail);
    setShowForgotPassword(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1667690705933-a75d7921ca57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBhZHZlbnR1cmUlMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc2MTkxMzg5OHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Travel Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-600/90" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Map className="w-10 h-10 text-white" />
            </div>
            <span className="text-4xl">MateTrip</span>
          </div>
          <p className="text-xl text-center text-white/90 mb-8">
            새로운 동행과 함께하는
            <br />
            특별한 여행의 시작
          </p>
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl mb-2">1000+</div>
              <div className="text-white/80 text-sm">활성 유저</div>
            </div>
            <div>
              <div className="text-3xl mb-2">500+</div>
              <div className="text-white/80 text-sm">진행된 여행</div>
            </div>
            <div>
              <div className="text-3xl mb-2">4.8★</div>
              <div className="text-white/80 text-sm">평균 만족도</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl text-gray-900">MateTrip</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-8">
            <div className="mb-8">
              <h2 className="text-gray-900 mb-2">로그인</h2>
              <p className="text-gray-600">다시 만나서 반가워요! 👋</p>
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
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  비밀번호 찾기
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                로그인
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">또는</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleSocialLogin('google')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 계속하기
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-yellow-400 text-gray-900 hover:bg-yellow-50"
                onClick={() => handleSocialLogin('kakao')}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1.2 4.4c-.1.4.3.7.6.5l5.2-3.4c.2 0 .5 0 .7 0 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
                </svg>
                카카오로 계속하기
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={onSignupClick}
                className="text-blue-600 hover:text-blue-700"
              >
                회원가입
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            로그인함으로써 MateTrip의{' '}
            <a href="#" className="text-blue-600 hover:underline">
              이용약관
            </a>{' '}
            및{' '}
            <a href="#" className="text-blue-600 hover:underline">
              개인정보처리방침
            </a>
            에 동의합니다.
          </p>
        </div>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
