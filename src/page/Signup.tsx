import React, { useState } from 'react';
import {
  Tent,
  Heart,
  Camera,
  Car,
  Sparkles,
  User,
  Shapes,
  MapPin,
  Utensils,
  ArrowRight,
  Compass,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Pen,
  FileText,
} from 'lucide-react';
import axios from 'axios';
import client from '../api/client';
import { MBTI_TYPES } from '../constants/mbti';
import {
  TRAVEL_STYLE_OPTIONS,
  type TravelStyleType,
} from '../constants/travelStyle';
import { type TravelTendencyType } from '../constants/travelTendencyType';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { useRef } from 'react';
import { useAuthStore } from '../store/authStore'; // useAuthStore 임포트 추가

interface CategoryItem {
  id: string;
  title: string;
  icon: React.ElementType;
  question: string;
  items: TravelTendencyType[];
}

interface SignupProps {
  onSignup: () => void;
  onLoginClick: () => void;
}

type Step1Field =
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'nickname'
  | 'gender';

// --- 데이터 정의 ---
const CATEGORIZED_KEYWORDS: CategoryItem[] = [
  {
    id: 'place',
    title: '장소',
    icon: MapPin,
    question: '어떤 여행지를 좋아하시나요?',
    items: [
      '도시',
      '시골',
      '전통도시',
      '휴양도시',
      '항구도시',
      '전통시장',
      '야시장',
      '바다',
      '섬',
      '산',
      '계곡',
      '호수',
    ],
  },
  {
    id: 'activity',
    title: '활동',
    icon: Tent,
    question: '어떤 액티비티를 즐기고 싶으신가요?',
    items: [
      '트레킹',
      '등산',
      '캠핑',
      '자전거',
      '서핑',
      '스노클링',
      '프리다이빙',
      '낚시',
      '스키',
      '스노보드',
      '골프',
      '러닝',
    ],
  },
  {
    id: 'food',
    title: '음식',
    icon: Utensils,
    question: '여행 중 음식은 무엇이 좋으세요?',
    items: [
      '길거리음식',
      '로컬레스토랑',
      '맛집탐방',
      '카페디저트',
      '비건필요',
      '돼지고기비선호',
      '해산물비선호',
      '매운맛선호',
      '순한맛선호',
      '해산물선호',
      '육류선호',
    ],
  },
  {
    id: 'culture',
    title: '문화',
    icon: Camera,
    question: '관심 있는 문화 생활이 있으신가요?',
    items: [
      '건축물탐방',
      '야경감상',
      '박물관',
      '미술관',
      '유적지탐방',
      '공연뮤지컬',
      '콘서트',
      '스포츠관람',
      '현지축제',
      '놀이공원',
      '아쿠아리움',
      '동물원',
    ],
  },
  {
    id: 'stay',
    title: '숙소',
    icon: Heart,
    question: '편안한 밤을 위해 어디서 머물까요?',
    items: [
      '호텔',
      '리조트',
      '게스트하우스',
      '모텔',
      '펜션',
      '에어비앤비',
      '글램핑',
      '풀빌라',
    ],
  },
  {
    id: 'transport',
    title: '이동/방식',
    icon: Car,
    question: '어떤 이동수단과 여행방식을 선호하시나요?',
    items: [
      '렌터카',
      '캠핑카',
      '대중교통',
      '기차여행',
      '오토바이여행',
      '배낭여행',
      '호캉스',
      '운전가능',
    ],
  },
  {
    id: 'etc',
    title: '기타',
    icon: Shapes,
    question: '기타 선호사항이 있나요?',
    items: [
      '소수인원선호',
      '조용한동행선호',
      '수다떠는동행선호',
      '조용한휴식',
      '빡빡한일정',
      '여유로운일정',
      '숙소우선',
      '음식우선',
      '사진촬영',
      '풍경촬영',
      '비흡연',
      '흡연',
      '비음주',
      '음주',
    ],
  },
];

export function Signup({ onSignup, onLoginClick }: SignupProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('place');
  const [styleError, setStyleError] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<string>('');

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLInputElement>(null);

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    gender: '남성', // Default to '남성'
    phone: '',
    mbti: '',
    travelStyles: new Set<TravelStyleType>(),
    tendency: new Set<TravelTendencyType>(),
    intro: '',
    description: '',
  });

  // useAuthStore에서 isAuthLoading 상태를 가져옵니다.
  const { isAuthLoading } = useAuthStore();

  //const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const step1Fields: Step1Field[] = [
    'email',
    'password',
    'confirmPassword',
    'nickname',
    'gender',
  ];
  const step1Refs: Record<
    Step1Field,
    React.RefObject<HTMLInputElement | null>
  > = {
    email: emailRef,
    password: passwordRef,
    confirmPassword: confirmPasswordRef,
    nickname: nicknameRef,
    gender: genderRef,
  };

  const clearNativeError = (field: Step1Field) => {
    const ref = step1Refs[field].current;
    if (ref) {
      ref.setCustomValidity('');
    }
  };

  const handleInputChange = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (step1Fields.includes(field as Step1Field)) {
      clearNativeError(field as Step1Field);
      if (field === 'password') {
        clearNativeError('confirmPassword');
      }
    }
  };

  const toggleTravelStyle = (style: TravelStyleType) => {
    setFormData((prev) => {
      const newSet = new Set(prev.travelStyles);
      if (newSet.has(style)) {
        newSet.delete(style);
        // if (newSet.size === 0) {
        //   setStyleError('여행 스타일을 최소 1개 선택해주세요.');
        // } else {
        //   setStyleError('');
        // }
      } else {
        if (newSet.size >= 3) {
          setStyleError('여행 스타일은 3개 이하로 선택해주세요.');
          setTimeout(() => setStyleError(''), 3000);
          return prev;
        }
        newSet.add(style);
        setStyleError('');
      }
      return { ...prev, travelStyles: newSet };
    });
  };

  const toggleTravelTendency = (tendency: TravelTendencyType) => {
    setFormData((prev) => {
      const newSet = new Set(prev.tendency);
      if (newSet.has(tendency)) {
        newSet.delete(tendency);
      } else {
        newSet.add(tendency);
      }
      return { ...prev, tendency: newSet };
    });
  };

  // 상세소개 검증: 길이/내용/반복/특수문자 비율 등을 점검
  const isValidSummary = (summary?: string): boolean => {
    const text = summary?.trim();
    if (!text || text.length < 10) {
      return false;
    }
    const punctuationCount = (text.match(/[^\w가-힣\s]/g) ?? []).length; // 특수문자 비율 40% 이하
    const punctuationRatio = punctuationCount / text.length;
    if (punctuationRatio > 0.4) {
      return false;
    }

    const tokens = text.split(/\s+/).filter(Boolean); // 단어 다양성 검사
    const uniqueTokenCount = new Set(tokens).size;
    if (uniqueTokenCount <= 2 && text.length < 20) {
      return false;
    }

    if (/(.)\1{6,}/.test(text)) {
      // 동일 문자 7회 이상 반복 금지
      return false;
    }
    const uniqueChars = new Set(text.replace(/\s+/g, '').split('')); // 문자 종류가 3개 이하인 긴 텍스트 거르기
    if (uniqueChars.size <= 3 && text.length >= 10) {
      return false;
    }

    return true;
  };

  const setNativeError = (field: Step1Field, message: string) => {
    const ref = step1Refs[field].current;
    if (!ref) return false;
    ref.setCustomValidity(message);
    ref.reportValidity();
    return false;
  };

  const resetStep1Validity = () => {
    step1Fields.forEach((field) => clearNativeError(field));
  };

  const validateStep1 = () => {
    resetStep1Validity();

    if (!formData.email.trim()) {
      return setNativeError('email', '이메일을 입력해주세요.');
    }
    if (!formData.password) {
      return setNativeError('password', '비밀번호를 입력해주세요.');
    }
    if (!formData.confirmPassword) {
      return setNativeError('confirmPassword', '비밀번호 확인을 입력해주세요.');
    }
    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      return setNativeError('confirmPassword', '비밀번호가 일치하지 않습니다.');
    }
    if (!formData.nickname.trim()) {
      return setNativeError('nickname', '닉네임을 입력해주세요.');
    }
    if (!formData.gender) {
      const genderInput = step1Refs.gender.current;
      if (genderInput) {
        genderInput.setCustomValidity('성별을 선택해주세요.');
        genderInput.reportValidity();
      }
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) {
      return;
    }
    if (step === 2) {
      // if (formData.travelStyles.size === 0) {
      //   setStyleError('여행 스타일을 최소 1개 선택해주세요.');
      //   return;
      // }
      if (formData.travelStyles.size > 3) {
        setStyleError('여행 스타일은 3개 이하로 선택해주세요.');
        setTimeout(() => setStyleError(''), 3000);
        return;
      }
    }
    setStyleError('');
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();

    if (isSubmitting) return;

    const isStep1Valid = validateStep1();
    if (!isStep1Valid) {
      setStep(1);
      return;
    }

    if (!isValidSummary(formData.description)) {
      setDescriptionError('상세소개를 10자 이상, 의미있는 내용으로 채워주세요');
      return;
    }

    try {
      setIsSubmitting(true);

      // Sets → Arrays로 변환해 백엔드가 기대하는 배열 형태로 전달
      const travelStylesArray = Array.from(formData.travelStyles);
      const tendencyArray = Array.from(formData.tendency);

      const requestData = {
        email: formData.email,
        password: formData.password,
        profile: {
          nickname: formData.nickname,
          gender: formData.gender,
          mbtiTypes: formData.mbti,
          travelStyles: travelStylesArray,
          tendency: tendencyArray,
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
        const apiMessage = (
          error.response.data as { message?: string | string[] }
        )?.message;
        const message = Array.isArray(apiMessage) ? apiMessage[0] : apiMessage;

        // Nova LLM가 상세소개가 부적절하다 판단 시 400으로 내려오는 에러 메시지를 그대로 노출
        if (error.response.status === 400 && message?.includes('상세소개')) {
          setDescriptionError(message);
          setStep(3);
        }
      }
      console.error('Signup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 타이틀 및 설명 텍스트 동적 생성
  const getStepHeader = () => {
    switch (step) {
      case 1:
        return { title: '회원가입', desc: '기본 정보를 입력해주세요.' };
      case 2:
        return {
          title: '회원가입',
          desc: '여행 취향을 분석하여 딱 맞는 친구를 찾아드릴게요.',
        };
      case 3:
        return {
          title: '회원가입',
          desc: '프로필을 완성하고 자신을 소개해 보세요.',
        };
      default:
        return { title: '가입 완료', desc: '' };
    }
  };

  const { title, desc } = getStepHeader();

  const currentTabInfo = CATEGORIZED_KEYWORDS.find(
    (tab) => tab.id === activeTab
  );
  const numRows = currentTabInfo
    ? Math.ceil(currentTabInfo.items.length / 2)
    : 1;

  // 인증 로딩 중일 때 스켈레톤 UI를 보여줍니다.
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans animate-pulse">
        <div className="flex-1 flex justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl md:max-w-lg">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm overflow-hidden border border-slate-100 relative min-h-[560px] flex flex-col p-8">
              {/* Logo Skeleton */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
              </div>

              {/* Step Indicator Skeleton */}
              <div className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 mb-8">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
              </div>

              {/* Form Fields Skeleton */}
              <div className="space-y-5 max-w-xl mx-auto w-full px-6">
                <div className="h-6 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded-md"></div>

                <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded-md"></div>

                <div className="h-6 w-28 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded-md"></div>

                <div className="h-6 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-10 bg-gray-200 rounded-md"></div>

                <div className="h-6 w-12 bg-gray-200 rounded mb-2"></div>
                <div className="flex gap-4 mt-2">
                  <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                  <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>

              {/* Button Skeleton */}
              <div className="mt-8 px-6">
                <div className="h-12 w-full bg-gray-200 rounded-lg"></div>
              </div>
            </div>
            <div className="mt-4 mb-4 text-center text-sm text-gray-200">
              <div className="h-4 w-48 mx-auto bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 flex justify-center items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl md:max-w-lg">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm overflow-hidden border border-slate-100 relative min-h-[560px] flex flex-col">
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-(--primary-10) border-t-primary rounded-full animate-spin" />
                <div className="text-sm font-semibold text-slate-700">
                  추천 동행 매칭 중...
                </div>
              </div>
            )}
            {step > 1 && step < 4 && (
              <Button
                variant="ghost"
                onClick={handlePrevStep}
                className="absolute top-4 left-6 text-slate-400 hover:text-primary flex items-center gap-1 text-sm font-bold transition-colors z-10 h-auto p-2"
              >
                <ArrowLeft className="w-4 h-4" />
                이전
              </Button>
            )}

            {step < 4 && (
              <div className="px-5 md:px-6 pt-8 pb-3 bg-white flex flex-col items-center text-center relative">
                <div className="flex items-center gap-2 mb-4">
                  <img
                    src="/logo-without-title.png"
                    alt="MateTrip Logo"
                    className="w-14 h-14 shrink-0"
                  />
                  <span
                    className="text-2xl text-gray-900 whitespace-nowrap"
                    style={{ fontFamily: 'Princess Sofia, cursive' }}
                  >
                    MateTrip
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {title}
                </h1>
                <p className="text-slate-500 text-sm mt-1 mb-6">{desc}</p>

                <div className="w-full max-w-xs flex items-center justify-center gap-3">
                  <div className="text-primary font-bold text-base whitespace-nowrap">
                    Step {step}
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {step < 4 && <div className="w-full px-6 my-2" />}

            {step === 1 && (
              <div className="flex-1 px-5 md:px-6 py-5 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-5 max-w-xl mx-auto w-full px-6">
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
                        ref={emailRef}
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
                        ref={passwordRef}
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
                    <div className="relative mt-2 w-full ">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="비밀번호를 다시 입력해주세요"
                        value={formData.confirmPassword}
                        ref={confirmPasswordRef}
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
                        ref={nicknameRef}
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
                        <input
                          id="male"
                          type="radio"
                          value="남성"
                          name="gender"
                          checked={formData.gender === '남성'}
                          ref={genderRef}
                          onChange={(e) =>
                            handleInputChange('gender', e.target.value)
                          }
                          className="h-4 w-4 appearance-none border-2 border-gray-300 rounded-full checked:bg-primary checked:border-primary-strong focus:outline-none focus:ring-0 focus:ring-offset-0"
                          required
                        />
                        <Label
                          htmlFor="male"
                          className="cursor-pointer font-normal"
                        >
                          남성
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="female"
                          type="radio"
                          value="여성"
                          name="gender"
                          checked={formData.gender === '여성'}
                          onChange={(e) =>
                            handleInputChange('gender', e.target.value)
                          }
                          className="h-4 w-4 appearance-none border-2 border-gray-300 rounded-full checked:bg-primary checked:border-primary-strong focus:outline-none focus:ring-0 focus:ring-offset-0"
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
                </div>
                <div className="mt-6 pb-3">
                  <Button
                    onClick={handleNextStep}
                    className="w-full bg-primary hover:bg-primary-strong text-white py-2 h-auto rounded-lg font-bold text-lg shadow-primary-soft flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                    다음 단계로
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="px-5 md:px-6 py-3">
                  <div className="flex flex-col gap-1 mb-5">
                    <div className="flex items-center justify-start gap-2">
                      <div className="p-2 bg-primary-10 rounded-full">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900 text-left flex items-center gap-2">
                        여행 스타일
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-10 text-primary ">
                          3개 선택 가능
                        </span>
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500 py-1">
                      나를 가장 잘 표현하는 키워드를 3개 이하로 골라주세요
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-start gap-2.5">
                    {TRAVEL_STYLE_OPTIONS.map((style) => {
                      const isSelected = formData.travelStyles.has(style.value);
                      return (
                        <Button
                          key={style.value}
                          onClick={() => toggleTravelStyle(style.value)}
                          variant="outline"
                          className={`
                          px-3 py-1.5 h-auto rounded-md text-xs font-medium transition-all duration-200 border select-none
                          ${
                            isSelected
                              ? 'bg-primary border-primary text-white shadow-primary-soft hover:bg-primary-strong hover:text-white active:bg-primary-strong'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:bg-primary-10 hover:text-slate-800'
                          }
                        `}
                        >
                          {style.label}
                        </Button>
                      );
                    })}
                  </div>
                  {styleError && (
                    <p className="text-xs text-rose-500 mt-2">{styleError}</p>
                  )}
                </div>

                <div className="w-full px-5 md:px-6" />

                <div className="px-5 md:px-6 pt-3">
                  <div className="flex flex-col gap-1 mb-5">
                    <div className="flex items-center justify-start gap-2">
                      <div className="p-2 bg-primary-10 rounded-full">
                        <Compass className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900 text-left">
                        여행 성향
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500 py-1">
                      마음 가는 키워드를 자유롭게 골라주세요.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 px-1 md:px-3 gap-2 md:gap-3 min-h-0">
                  <div className="w-full md:w-48 max-w-40 shrink-0 bg-slate-100/40 md:rounded-l-2xl mb-4 md:mb-0">
                    <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible scrollbar-hide p-2 md:p-2.5 gap-2">
                      {CATEGORIZED_KEYWORDS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        const count = tab.items.filter((k) =>
                          formData.tendency.has(k)
                        ).length;

                        return (
                          <Button
                            key={tab.id}
                            variant="ghost"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                            justify-start h-auto flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all relative text-left md:rounded-l-2xl w-full
                            ${
                              isActive
                                ? 'bg-white text-primary shadow-md shadow-slate-100 z-10'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                            }
                          `}
                          >
                            <div
                              className={`p-1 rounded-2xl transition-colors ${isActive ? 'bg-primary-10 text-primary' : 'bg-transparent text-slate-400'}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="whitespace-nowrap">
                              {tab.title}
                            </span>
                            {count > 0 && (
                              <span
                                className={`ml-auto w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}
                              >
                                {count}
                              </span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 py-5 md:py-6 pr-3 pl-0 md:pl-1 bg-white md:rounded-l-2xl">
                    <div className="mb-6 text-left">
                      {currentTabInfo && (
                        <>
                          <h3 className="text-md font-bold text-slate-900 mb-1">
                            {currentTabInfo.title}
                          </h3>
                          <p className="text-slate-500 text-xs">
                            {currentTabInfo.question}
                          </p>
                        </>
                      )}
                    </div>

                    <div
                      className="animate-in fade-in slide-in-from-right-4 duration-300 h-[250px]"
                      key={activeTab}
                    >
                      <div
                        className="grid grid-cols-2 gap-2.5 h-full"
                        style={{
                          gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
                        }}
                      >
                        {currentTabInfo &&
                          currentTabInfo.items.map((label) => {
                            const isSelected = formData.tendency.has(label);
                            return (
                              <Button
                                key={label}
                                variant="outline"
                                onClick={() => toggleTravelTendency(label)}
                                className={`
                              relative group py-2 px-2 h-full w-full min-w-[120px] rounded-md text-sm font-medium transition-all duration-200 border select-none
                              ${
                                isSelected
                                  ? 'bg-primary border-primary text-white shadow-primary-soft hover:bg-primary-strong hover:text-white active:bg-primary-strong'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:bg-primary-10 hover:text-slate-800'
                              }
                            `}
                              >
                                {label}
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full px-6 mt-1" />

                <div className="px-5 md:px-6 pt-3">
                  <div className="flex flex-col gap-1 mb-5">
                    <div className="flex items-center justify-start gap-2">
                      <div className="p-2 bg-primary-10 rounded-full">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900 text-left">
                        MBTI 성격 유형
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500 py-1 pl-1">
                      MBTI를 선택하여 자신을 더 잘 표현해보세요.
                    </p>
                  </div>
                  <select
                    id="mbti"
                    value={formData.mbti}
                    onChange={(e) => handleInputChange('mbti', e.target.value)}
                    className="w-full mt-1 px-4 py-3 h-auto border bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-[color:var(--primary)] focus:border-transparent outline-none transition-all font-medium text-slate-900"
                  >
                    <option value="">MBTI를 선택해주세요</option>
                    {MBTI_TYPES.map((mbti) => (
                      <option key={mbti} value={mbti}>
                        {mbti}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-5 md:px-6 py-7  flex justify-center mt-auto">
                  <Button
                    onClick={handleNextStep}
                    className="w-full bg-primary hover:bg-primary-strong text-white py-2 h-auto rounded-lg font-bold text-lg shadow-primary-soft flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                    다음 단계로
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex-1 px-5 md:px-6 py-6 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="max-w-xl mx-auto w-full space-y-4">
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
                    <Label
                      htmlFor="description"
                      className="font-semibold flex items-center gap-2"
                    >
                      상세소개
                      <span className="relative inline-flex items-center group">
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full border border-primary bg-primary-10 text-[10px] font-semibold text-primary shadow-[0_1px_3px_rgba(59,130,246,0.25)] hover:bg-primary-10 hover:border-primary transition-colors cursor-default">
                          i
                        </span>
                        <span className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 block w-72 md:w-80 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black text-left whitespace-normal wrap-break-word shadow-lg opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-150 leading-normal">
                          키워드 유사도와 상세소개 유사도를 합산하여 프로필
                          유사도를 측정합니다.
                          <br />
                          적절하지 않은 상세소개는 등록되지 않을 수 있습니다.
                        </span>
                      </span>
                    </Label>
                    <div className="relative mt-2">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Textarea
                        id="description"
                        placeholder="자신에 대해 자유롭게 소개해주세요. (여행 스타일, 좋아하는 것 등)"
                        value={formData.description}
                        onChange={(e) => {
                          setDescriptionError('');
                          handleInputChange('description', e.target.value);
                        }}
                        className="pl-10 min-h-32"
                      />
                    </div>
                    {descriptionError && (
                      <p className="text-xs text-rose-500 mt-2">
                        {descriptionError}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 text-right">
                    * 자세히 적을수록, 마음이 딱 맞는 동행을 만날 확률이
                    높아져요!
                  </p>
                </div>

                <div className="pt-7">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-strong disabled:bg-primary-80 disabled:cursor-not-allowed text-white py-2 h-auto rounded-lg font-bold text-lg shadow-primary-soft shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                    {isSubmitting ? '추천 동행 매칭 중...' : '회원가입 완료'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 mb-4 text-center text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={onLoginClick}
              className="text-primary hover:text-primary-strong"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
