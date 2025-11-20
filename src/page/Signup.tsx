import { useState } from 'react';
import {
  Map,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Pen,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import axios from 'axios';
import client from '../api/client';
import {
  TRAVEL_STYLE_OPTIONS,
  type TravelStyleType,
} from '../constants/travelStyle';
import {
  TENDENCY_OPTIONS,
  type TravelTendencyType,
} from '../constants/travelTendencyType';

interface SignupProps {
  onSignup: () => void;
  onLoginClick: () => void;
}

const MBTI_TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
];

export function Signup({ onSignup, onLoginClick }: SignupProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    gender: '',
    phone: '',
    mbti: '',
    travelStyles: [] as TravelStyleType[],
    tendency: [] as TravelTendencyType[],
    intro: '',
    description: '',
  });

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTravelStyle = (style: TravelStyleType) => {
    setFormData((prev) => ({
      ...prev,
      travelStyles: prev.travelStyles.includes(style)
        ? prev.travelStyles.filter((s) => s !== style)
        : [...prev.travelStyles, style],
    }));
  };

  const toggleTravelTendency = (travelTendency: TravelTendencyType) => {
    setFormData((prev) => ({
      ...prev,
      tendency: prev.tendency.includes(travelTendency)
        ? prev.tendency.filter((p) => p !== travelTendency)
        : [...prev.tendency, travelTendency],
    }));
  };

  const handleNextStep = () => {
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return;
    }

    try {
      const requestData = {
        email: formData.email,
        password: formData.password,
        profile: {
          nickname: formData.nickname,
          gender: formData.gender,
          mbtiTypes: formData.mbti,
          travelStyles: formData.travelStyles,
          tendency: formData.tendency,
          intro: formData.intro,
          description: formData.description,
        },
      };
      // db쌓기(임베딩 까지)
      const signupResponse = await client.post('/auth/signup', requestData);

      // 회원가입 성공(201 Created) 후, 바로 로그인 처리
      if (signupResponse.status === 201) {
        const loginResponse = await client.post('/auth/login', {
          email: formData.email,
          password: formData.password,
        });

        if (loginResponse.status === 200) {
          // // // 📌메인페이지 가기 전에 임베딩 처리 하기 (matching-profile 에 내용넣기)

          // const userId =
          //   signupResponse.data?.id || loginResponse.data?.user?.id;

          // if (userId) {
          //   const syncPayload = {
          //     //userId,
          //     description: formData.description || '',
          //     // 필요하면 travelStyles / tendency도 추가
          //   };
          //   await client.post('/matching/profile/embedding', syncPayload);
          //   console.log('임베딩 완료!');
          // } else {
          //   throw new Error('Unable to determine userId after signup/login');
          // }

          // summary 랑 embedding 호출
          // 로그인 성공 시 성공 모달을 띄웁니다.
          //setShowSuccessModal(true);
          onSignup();
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // const apiError = error.response.data as ApiErrorResponse;
        // setErrorMessage(apiError.message || '회원가입에 실패했습니다.');
      } else {
        // setErrorMessage('알 수 없는 오류가 발생했습니다.');
      }
      console.error('Signup error:', error);
    }
  };

  const progressValue = (step / 3) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Map className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl text-gray-900">MateTrip</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="text-center mb-2">
              <h3 className="text-2xl font-bold text-gray-900">회원가입</h3>
            </div>
            <span className="block text-center text-sm text-gray-500 mb-4">
              Step {step}/3
            </span>
            <Progress value={progressValue} className="h-2" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <>
                <p className="text-gray-600 mb-6">기본 정보를 입력해주세요</p>

                <div>
                  <Label htmlFor="email" className="font-semibold">
                    이메일
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange('email', e.target.value)
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="font-semibold">
                    비밀번호
                  </Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8자 이상 입력해주세요"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange('password', e.target.value)
                      }
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

                <div>
                  <Label htmlFor="confirmPassword" className="font-semibold">
                    비밀번호 확인
                  </Label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange('confirmPassword', e.target.value)
                      }
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="nickname" className="font-semibold">
                    닉네임
                  </Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="nickname"
                      type="text"
                      placeholder="사용할 닉네임을 입력해주세요"
                      value={formData.nickname}
                      onChange={(e) =>
                        handleInputChange('nickname', e.target.value)
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">성별</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="male"
                        type="radio"
                        value="남성"
                        name="gender"
                        checked={formData.gender === '남성'}
                        onChange={(e) =>
                          handleInputChange('gender', e.target.value)
                        }
                        className="h-4 w-4 accent-blue-600"
                      />
                      <Label
                        htmlFor="male"
                        className="cursor-pointer font-normal"
                      >
                        남성
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="female"
                        type="radio"
                        value="여성"
                        name="gender"
                        checked={formData.gender === '여성'}
                        onChange={(e) =>
                          handleInputChange('gender', e.target.value)
                        }
                        className="h-4 w-4 accent-blue-600"
                      />
                      <Label
                        htmlFor="female"
                        className="cursor-pointer font-normal"
                      >
                        여성
                      </Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="font-semibold">
                    연락처
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="010-0000-0000"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange('phone', e.target.value)
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant={isPhoneVerified ? 'outline' : 'default'}
                      className={isPhoneVerified ? 'gap-1' : ''}
                      onClick={() => setIsPhoneVerified(true)}
                    >
                      {isPhoneVerified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">인증완료</span>
                        </>
                      ) : (
                        '인증하기'
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  다음
                </Button>
              </>
            )}

            {/* Step 2: Travel Style */}
            {step === 2 && (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    이전
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  선호하는 여행 스타일을 선택해주세요 (복수 선택 가능)
                </p>

                <div>
                  <Label className="font-semibold">여행 스타일</Label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {TRAVEL_STYLE_OPTIONS.map(({ value, label }) => (
                      <Badge
                        key={value}
                        variant={
                          formData.travelStyles.includes(value)
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer transition-colors ${
                          formData.travelStyles.includes(value)
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleTravelStyle(value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="font-semibold">여행 성향</Label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {TENDENCY_OPTIONS.map(({ value, label }) => (
                      <Badge
                        key={value}
                        variant={
                          formData.tendency.includes(value)
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer transition-colors ${
                          formData.tendency.includes(value)
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => toggleTravelTendency(value)}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="mbti" className="font-semibold">
                    MBTI (선택)
                  </Label>
                  <select
                    id="mbti"
                    value={formData.mbti}
                    onChange={(e) => handleInputChange('mbti', e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="">MBTI를 선택해주세요</option>
                    {MBTI_TYPES.map((mbti) => (
                      <option key={mbti} value={mbti}>
                        {mbti}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  다음
                </Button>
              </>
            )}

            {/* Step 3: Terms */}
            {step === 3 && (
              <>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    이전
                  </button>
                </div>

                <p className="text-gray-600 mb-6">
                  프로필을 완성하고 자신을 소개해보세요.
                </p>

                <div>
                  <Label htmlFor="intro" className="font-semibold">
                    한줄소개
                  </Label>
                  <div className="relative mt-2">
                    <Pen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="intro"
                      type="text"
                      placeholder="예) 바다를 사랑하는 여행러 🌊"
                      value={formData.intro}
                      onChange={(e) =>
                        handleInputChange('intro', e.target.value)
                      }
                      className="pl-10"
                      maxLength={50}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="font-semibold">
                    상세소개
                  </Label>
                  <div className="relative mt-2">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Textarea
                      id="description"
                      placeholder="자신에 대해 자유롭게 소개해주세요. (여행 스타일, 좋아하는 것 등)"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange('description', e.target.value)
                      }
                      className="pl-10 min-h-32"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  회원가입 완료
                </Button>
              </>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            className="text-blue-600 hover:text-blue-700"
          >
            로그인
          </button>
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              회원가입 성공!
            </h3>
            <p className="text-gray-600 mb-8">
              MateTrip에 오신 것을 환영합니다.
            </p>
            <Button
              onClick={onSignup}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
