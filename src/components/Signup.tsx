import { useState } from 'react';
import { Map, Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SignupProps {
  onSignup: () => void;
  onLoginClick: () => void;
}

const TRAVEL_STYLES = [
  '힐링', '액티브', '맛집투어', '사진', '자연', '도시', '해변', '산', 
  '캠핑', '문화탐방', '쇼핑', '축제'
];

const PERSONALITY_TYPES = [
  { value: 'planned', label: '계획적', emoji: '📋' },
  { value: 'spontaneous', label: '즉흥적', emoji: '✨' },
  { value: 'active', label: '활동적', emoji: '⚡' },
  { value: 'relaxed', label: '여유로운', emoji: '🌿' },
  { value: 'social', label: '사교적', emoji: '👥' },
  { value: 'quiet', label: '조용한', emoji: '🤫' },
];

export function Signup({ onSignup, onLoginClick }: SignupProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    phone: '',
    travelStyles: [] as string[],
    personality: [] as string[],
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTravelStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      travelStyles: prev.travelStyles.includes(style)
        ? prev.travelStyles.filter(s => s !== style)
        : [...prev.travelStyles, style]
    }));
  };

  const togglePersonality = (personality: string) => {
    setFormData(prev => ({
      ...prev,
      personality: prev.personality.includes(personality)
        ? prev.personality.filter(p => p !== personality)
        : [...prev.personality, personality]
    }));
  };

  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup logic
    onSignup();
  };

  const progressValue = (step / 3) * 100;

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
            <span className="text-4xl">TripTogether</span>
          </div>
          <p className="text-xl text-center text-white/90 mb-8">
            당신의 완벽한 여행 동행을<br />찾아보세요
          </p>
          <div className="space-y-4 text-white/90">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-300" />
              <span>취향이 맞는 동행 찾기</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-300" />
              <span>AI 기반 여행 계획</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-300" />
              <span>실시간 협업 워크스페이스</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl text-gray-900">TripTogether</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-8">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900">회원가입</h3>
                <span className="text-sm text-gray-500">Step {step}/3</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <>
                  <p className="text-gray-600 mb-6">기본 정보를 입력해주세요</p>

                  <div>
                    <Label htmlFor="email">이메일</Label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
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
                        placeholder="8자 이상 입력해주세요"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                    <div className="relative mt-2">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="비밀번호를 다시 입력해주세요"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nickname">닉네임</Label>
                    <div className="relative mt-2">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="사용할 닉네임을 입력해주세요"
                        value={formData.nickname}
                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">연락처</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="010-0000-0000"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
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

                  <p className="text-gray-600 mb-6">선호하는 여행 스타일을 선택해주세요 (복수 선택 가능)</p>

                  <div>
                    <Label>여행 스타일</Label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {TRAVEL_STYLES.map((style) => (
                        <Badge
                          key={style}
                          variant={formData.travelStyles.includes(style) ? 'default' : 'outline'}
                          className={`cursor-pointer transition-colors ${
                            formData.travelStyles.includes(style)
                              ? 'bg-blue-600 hover:bg-blue-700'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleTravelStyle(style)}
                        >
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>여행 성향</Label>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {PERSONALITY_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => togglePersonality(type.value)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            formData.personality.includes(type.value)
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-2xl mb-1">{type.emoji}</div>
                          <div className="text-sm text-gray-900">{type.label}</div>
                        </button>
                      ))}
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

                  <p className="text-gray-600 mb-6">약관에 동의해주세요</p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => handleInputChange('agreeTerms', checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor="agreeTerms" className="text-sm text-gray-900 cursor-pointer">
                          (필수) 이용약관 동의
                        </label>
                        <button type="button" className="text-xs text-blue-600 hover:underline mt-1 block">
                          자세히 보기
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="agreePrivacy"
                        checked={formData.agreePrivacy}
                        onCheckedChange={(checked) => handleInputChange('agreePrivacy', checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor="agreePrivacy" className="text-sm text-gray-900 cursor-pointer">
                          (필수) 개인정보 수집 및 이용 동의
                        </label>
                        <button type="button" className="text-xs text-blue-600 hover:underline mt-1 block">
                          자세히 보기
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="agreeMarketing"
                        checked={formData.agreeMarketing}
                        onCheckedChange={(checked) => handleInputChange('agreeMarketing', checked)}
                      />
                      <div className="flex-1">
                        <label htmlFor="agreeMarketing" className="text-sm text-gray-900 cursor-pointer">
                          (선택) 마케팅 정보 수신 동의
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          이벤트, 프로모션 등의 혜택 정보를 받아보실 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={!formData.agreeTerms || !formData.agreePrivacy}
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
      </div>
    </div>
  );
}
