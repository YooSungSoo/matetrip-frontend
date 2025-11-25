import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  X,
  Upload,
  Trash2,
  Lock,
  Map,
  Tent,
  Utensils,
  Camera,
  Heart,
  Car,
  MapPin,
  Shapes,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from './ui/badge';
import { TRAVEL_STYLE_TYPES } from '../constants/travelStyle';
//import { TRAVEL_TENDENCY_TYPE } from '../constants/travelTendencyType';
//import type { UserProfile } from '../types/user';
import { API_BASE_URL } from '../api/client';
import type { UpdateProfileDto } from '../types/updateprofiledto';
import type { TravelStyleType } from '../constants/travelStyle';
import type { TravelTendencyType } from '../constants/travelTendencyType';
import { useAuthStore } from '../store/authStore';
import type { GenderType } from '../constants/gender.ts';
import type { MbtiType } from '../constants/mbti.ts';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: () => void;
  user: {
    id: string;
    nickname: string;
    email?: string;
    profileImageId: string | null;
    intro: string; // shortBio 대신 intro 사용
    description: string; // detailedBio 대신 description 사용
    travelStyles: TravelStyleType[];
    tendency: TravelTendencyType[];
    gender?: GenderType;
    mbtiTypes?: MbtiType;
  } | null;
}

const TENDENCY_CATEGORIES: Array<{
  id: string;
  title: string;
  icon: typeof Map;
  items: TravelTendencyType[];
}> = [
  {
    id: 'place',
    title: '장소',
    icon: MapPin,
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

export function EditProfileModal({
  open,
  onOpenChange,
  onProfileUpdated,
  user,
}: EditProfileModalProps) {
  const [activeTab, setActiveTab] = useState('edit');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [shortBio, setShortBio] = useState(user?.intro || '');
  const [detailedBio, setDetailedBio] = useState(user?.description || '');
  const [selectedTravelStyles, setSelectedTravelStyles] = useState<
    TravelStyleType[]
  >(user?.travelStyles || []);
  const [selectedTravelTendencies, setSelectedTravelTendencies] = useState<
    TravelTendencyType[]
  >(user?.tendency || []);
  const [styleError, setStyleError] = useState<string>('');
  const [activeTendencyTab, setActiveTendencyTab] = useState<string>('place');
  const [currentProfileImageId, setCurrentProfileImageId] = useState<
    string | null
  >(user?.profileImageId ?? null);
  const [profileImageRemoteUrl, setProfileImageRemoteUrl] = useState<
    string | null
  >(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [pendingProfileImageFile, setPendingProfileImageFile] =
    useState<File | null>(null);
  const profileImagePreviewRef = useRef<string | null>(null);
  const originalDescriptionRef = useRef<string>(user?.description ?? '');
  const originalTravelStylesRef = useRef<TravelStyleType[]>(
    user?.travelStyles || []
  );
  const originalTravelTendenciesRef = useRef<TravelTendencyType[]>(
    user?.tendency || []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageDeleting, setIsImageDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTendencyModalOpen, setIsTendencyModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!open || !user) {
      return;
    }
    setNickname(user.nickname || '');
    setShortBio(user.intro || '');
    setDetailedBio(user.description || '');
    originalDescriptionRef.current = user.description || '';
    setSelectedTravelStyles(user.travelStyles || []);
    setSelectedTravelTendencies(user.tendency || []);
    originalTravelStylesRef.current = user.travelStyles || [];
    originalTravelTendenciesRef.current = user.tendency || [];
    setCurrentProfileImageId(user.profileImageId ?? null);
    setPendingProfileImageFile(null);
    setProfileImagePreview(null);
    setProfileImageRemoteUrl(null);
    setSaveError(null);
  }, [open, user]);

  useEffect(() => {
    return () => {
      if (profileImagePreviewRef.current) {
        URL.revokeObjectURL(profileImagePreviewRef.current);
      }
    };
  }, []);

  const defaultAvatar = user
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.nickname ?? 'user'
      )}&background=random`
    : null;

  useEffect(() => {
    if (!open || !user) {
      return;
    }
    if (!currentProfileImageId) {
      setProfileImageRemoteUrl(defaultAvatar);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/binary-content/${currentProfileImageId}/presigned-url`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('프로필 이미지 URL 요청 실패');
        const { url } = await res.json();
        if (!cancelled) {
          setProfileImageRemoteUrl(url);
        }
      } catch (error) {
        console.error('프로필 이미지 URL 불러오기 실패:', error);
        if (!cancelled) {
          setProfileImageRemoteUrl(defaultAvatar);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProfileImageId, defaultAvatar, open, user]);

  const profileImageUrl =
    profileImagePreview ?? profileImageRemoteUrl ?? defaultAvatar ?? '';

  const currentTendencyTab = TENDENCY_CATEGORIES.find(
    (tab) => tab.id === activeTendencyTab
  );
  const tendencyGridRows = currentTendencyTab
    ? Math.ceil(currentTendencyTab.items.length / 2)
    : 1;

  if (!user) return null;

  // 여행 스타일 태그
  const allStyleTags = Object.values(TRAVEL_STYLE_TYPES);

  const updateProfileImagePreview = (nextUrl: string | null) => {
    if (
      profileImagePreviewRef.current &&
      profileImagePreviewRef.current !== nextUrl
    ) {
      URL.revokeObjectURL(profileImagePreviewRef.current);
    }
    profileImagePreviewRef.current = nextUrl;
    setProfileImagePreview(nextUrl);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingProfileImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    updateProfileImagePreview(previewUrl);
    event.target.value = '';
  };
  //👀 delte API  호출
  const handleImageDelete = async () => {
    if (isImageDeleting) return;

    // 로컬에 선택해 둔 새 파일만 있는 경우 서버 호출 없이 초기화
    if (pendingProfileImageFile && !currentProfileImageId) {
      setPendingProfileImageFile(null);
      updateProfileImagePreview(null);
      setProfileImageRemoteUrl(defaultAvatar);
      return;
    }

    if (!currentProfileImageId) {
      updateProfileImagePreview(null);
      setProfileImageRemoteUrl(defaultAvatar);
      return;
    }

    setIsImageDeleting(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/binary-content/${currentProfileImageId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || '이미지 삭제에 실패했습니다.');
      }
      setPendingProfileImageFile(null);
      updateProfileImagePreview(null);
      setCurrentProfileImageId(null);
      setProfileImageRemoteUrl(defaultAvatar);
    } catch (error) {
      console.error('이미지 삭제 실패:', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : '이미지 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setIsImageDeleting(false);
    }
  };

  const handleNicknameCheck = () => {
    // 중복 확인 로직 (Mock)
    alert('사용 가능한 닉네임입니다.');
  };

  // const handleAddStyle = (style: TravelStyleType) => {
  //   if (!selectedTravelStyles.includes(style)) {
  //     setSelectedTravelStyles([...selectedTravelStyles, style]);
  //   }
  // };
  const validateStyleCount = (count: number) => {
    // if (count === 0) {
    //   setStyleError('여행 스타일을 최소 1개 선택해주세요.');
    // }
    if (count > 3) {
      setStyleError('여행 스타일을 3개 이하로 선택해주세요');
    } else {
      setStyleError('');
    }
  };

  const handleToggleStyle = (style: TravelStyleType) => {
    setSelectedTravelStyles((prev) => {
      // 이미 선택된 항목이면 제거(토글)
      if (prev.includes(style)) {
        const next = prev.filter((item) => item !== style);
        validateStyleCount(next.length);
        return next;
      }

      // 새로 선택 시 3개 초과를 막는다
      if (prev.length >= 3) {
        setStyleError('여행 스타일을 3개 이하로 선택해주세요');
        return prev;
      }

      const next = [...prev, style];
      validateStyleCount(next.length);
      return next;
    });
  };

  const handleToggleTendency = (style: TravelTendencyType) => {
    setSelectedTravelTendencies((prev) =>
      prev.includes(style)
        ? prev.filter((item) => item !== style)
        : [...prev, style]
    );
  };

  const handleRemoveStyle = (style: TravelStyleType) => {
    const next = selectedTravelStyles.filter((s) => s !== style);
    validateStyleCount(next.length);
    setSelectedTravelStyles(next);
  };

  const handleRemoveTendency = (tendency: TravelTendencyType) => {
    setSelectedTravelTendencies(
      selectedTravelTendencies.filter((t) => t !== tendency)
    );
  };

  // const handleAddTendency = (tendency: TravelTendencyType) => {
  //   if (!selectedTravelTendencies.includes(tendency)) {
  //     setSelectedTravelTendencies([...selectedTravelTendencies, tendency]);
  //   }
  // };

  const parseErrorMessage = async (
    response: Response
  ): Promise<string | null> => {
    // JSON이면 message 필드 우선, 아니면 텍스트로 반환
    try {
      const data = await response.clone().json();
      const apiMessage = (data as { message?: string | string[] }).message;
      if (Array.isArray(apiMessage) && apiMessage.length > 0) {
        return apiMessage[0];
      }
      if (typeof apiMessage === 'string') {
        return apiMessage;
      }
    } catch (error) {
      console.error('프로필 오류 응답 파싱 실패:', error);
    }
    try {
      const fallback = await response.text();
      return fallback || null;
    } catch {
      return null;
    }
  };

  //👀 save API  호출
  const handleSaveProfile = async () => {
    if (!user || isSaving) return;
    // if (selectedTravelStyles.length === 0) {
    //   setStyleError('여행 스타일을 최소 1개 선택해주세요.');
    //   return;
    // }
    if (selectedTravelStyles.length > 3) {
      setStyleError('여행 스타일을 3개 이하로 선택해주세요.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    let nextProfileImageId = currentProfileImageId;

    try {
      if (pendingProfileImageFile) {
        const file = pendingProfileImageFile;
        const safeFileType = file.type || 'application/octet-stream';
        const presignResponse = await fetch(
          `${API_BASE_URL}/binary-content/presigned-url`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              fileType: safeFileType,
            }),
          }
        );
        if (!presignResponse.ok) {
          throw new Error('이미지 업로드 URL 생성에 실패했습니다.');
        }
        const { uploadUrl, binaryContentId } = await presignResponse.json();
        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
        });
        if (!s3Response.ok) {
          throw new Error('이미지 업로드에 실패했습니다.');
        }
        nextProfileImageId = binaryContentId;
      }

      // const descriptionChanged =
      //   (originalDescriptionRef.current ?? '') !== detailedBio;
      // const stylesChanged =
      //   JSON.stringify(originalTravelStylesRef.current) !==
      //   JSON.stringify(selectedTravelStyles);
      // const tendenciesChanged =
      //   JSON.stringify(originalTravelTendenciesRef.current) !==
      //   JSON.stringify(selectedTravelTendencies);

      const payload: UpdateProfileDto = {
        nickname,
        intro: shortBio,
        description: detailedBio,
        travelStyles: selectedTravelStyles,
        tendency: selectedTravelTendencies,
        profileImageId: nextProfileImageId,
      };
      // 사진외의 프로필 수정
      const response = await fetch(`${API_BASE_URL}/profile/my`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await parseErrorMessage(response);
        // Nova가 상세소개를 거부해 400을 주는 경우 그대로 보여준다
        if (response.status === 400 && detail?.includes('상세소개')) {
          throw new Error(detail);
        }
        throw new Error(detail || '프로필 업데이트에 실패했습니다.');
      }

      //변경되면 호출(새로고침)
      useAuthStore.setState((state) => {
        if (!state.user) {
          return state;
        }
        return {
          ...state,
          user: {
            ...state.user,
            profile: {
              ...state.user.profile,
              nickname,
              intro: shortBio,
              description: detailedBio,
              travelStyles: selectedTravelStyles,
              tendency: selectedTravelTendencies,
              profileImageId: nextProfileImageId ?? null,
            },
          },
        };
      });
      originalDescriptionRef.current = detailedBio;
      originalTravelStylesRef.current = selectedTravelStyles;
      originalTravelTendenciesRef.current = selectedTravelTendencies;

      setPendingProfileImageFile(null);
      updateProfileImagePreview(null);
      setCurrentProfileImageId(nextProfileImageId ?? null);
      onProfileUpdated();
      onOpenChange(false);
      //   window.location.reload();
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : '프로필 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    alert('비밀번호가 변경되었습니다.');
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col"
          aria-describedby={undefined}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <DialogTitle className="text-gray-900">프로필 수정</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 탭 메뉴 */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'edit'
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('edit')}
            >
              프로필 수정
            </button>
            <button
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === 'account'
                  ? 'border-b-2 border-gray-900 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('account')}
            >
              계정 관리
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          <div
            className="p-6 overflow-y-auto"
            style={{ maxHeight: 'calc(90vh - 120px)' }}
          >
            {/* 프로필 수정 탭 */}
            {activeTab === 'edit' && (
              <div className="space-y-6">
                {/* 프로필 사진 */}
                <div className="space-y-4">
                  <div className="flex items-start gap-6">
                    <div className="relative group">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white ring-2 ring-gray-200 ring-offset-2 ring-offset-white transition-all group-hover:ring-gray-300">
                        {/* res.json()에서 받은 url을 <img src={url}>로 쓰면 브라우저가 그 URL을 이용해 S3에서 실제 이미지를 내려 받는 HTTP 요청을 자동으로 보내는데, 
                        이건 코드로 직접 쓰진 않아도 브라우저 레벨에서 발생하는 2번째 호출 */}
                        {profileImageUrl ? (
                          <ImageWithFallback
                            src={profileImageUrl}
                            alt="프로필 사진"
                            className="w-full h-full object-cover object-center"
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 pt-2">
                      <p className="text-gray-600 text-sm">
                        프로필 사진을 업로드하거나 삭제할 수 있습니다.
                      </p>
                      <div className="flex gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelected}
                        />
                        <Button
                          type="button"
                          size="default"
                          variant="default"
                          onClick={handleImageUpload}
                          className="flex-1 bg-primary hover:bg-primary-strong"
                          disabled={isSaving || isImageDeleting}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          이미지 업로드
                        </Button>
                        <Button
                          type="button"
                          size="default"
                          variant="outline"
                          onClick={handleImageDelete}
                          disabled={isSaving || isImageDeleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 닉네임 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">닉네임</Label>
                  <div className="flex gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="닉네임을 입력하세요"
                      className="flex-1 bg-white"
                    />
                    <Button
                      size="default"
                      variant="outline"
                      onClick={handleNicknameCheck}
                    >
                      중복 확인
                    </Button>
                  </div>
                </div>

                {/* 한 줄 소개 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">한 줄 소개</Label>
                  <Input
                    className="bg-white"
                    value={shortBio}
                    onChange={(e) => setShortBio(e.target.value)}
                    placeholder="한 줄로 자신을 소개해주세요"
                    maxLength={50}
                  />
                  <p className="text-gray-500 text-xs text-right">
                    {shortBio.length}/50
                  </p>
                </div>

                {/* 상세 소개 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">상세 소개</Label>
                  <Textarea
                    value={detailedBio}
                    onChange={(e) => setDetailedBio(e.target.value)}
                    placeholder="자세한 소개를 작성해주세요"
                    rows={6}
                    maxLength={1000}
                  />
                  <p className="text-gray-500 text-xs text-right">
                    {detailedBio.length}/1000
                  </p>
                </div>

                {/* 여행 스타일 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">여행 스타일</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTravelStyles.map((style) => (
                      <Badge
                        key={style}
                        variant="secondary"
                        className="bg-primary text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                      >
                        #{style}
                        <button
                          onClick={() => handleRemoveStyle(style)}
                          className="hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsStyleModalOpen(true)}
                  >
                    + 추가
                  </Button>
                  {styleError && (
                    <p className="text-sm text-red-500">{styleError}</p>
                  )}
                </div>

                {/* 여행 성향 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">여행 성향</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTravelTendencies.map((tendency) => (
                      <Badge
                        key={tendency}
                        variant="secondary"
                        className="bg-primary text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                      >
                        #{tendency}
                        <button
                          onClick={() => handleRemoveTendency(tendency)}
                          className="hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTendencyModalOpen(true)}
                  >
                    + 추가
                  </Button>
                </div>

                {/* 저장 버튼 */}
                <div className="pt-4 border-t">
                  {saveError && (
                    <p className="mb-3 text-sm text-red-500">{saveError}</p>
                  )}
                  <Button
                    onClick={handleSaveProfile}
                    className="w-full bg-primary hover:bg-primary-strong"
                    disabled={isSaving}
                  >
                    {isSaving ? '저장 중...' : '변경사항 저장'}
                  </Button>
                </div>
              </div>
            )}

            {/* 계정 관리 탭 */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* 이메일 주소 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">이메일 주소</Label>
                  <Input
                    value={user.email || 'user@example.com'}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-gray-500 text-xs">
                    이메일은 변경할 수 없습니다.
                  </p>
                </div>

                {/* 비밀번호 변경 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">비밀번호</Label>
                  <Button
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(true)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    비밀번호 변경
                  </Button>
                </div>

                {/* 본인 인증 */}
                <div className="space-y-3">
                  <Label className="text-base font-bold">본인 인증</Label>
                  <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-lg flex items-center gap-2">
                    ✅ PASS 본인 인증 완료
                  </div>
                </div>

                {/* 회원 탈퇴 */}
                <div className="pt-8 border-t">
                  <button className="text-gray-400 hover:text-gray-600 text-sm underline">
                    회원 탈퇴
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 여행 성향 태그 추가 모달 */}
      <Dialog open={isTendencyModalOpen} onOpenChange={setIsTendencyModalOpen}>
        <DialogContent
          className="max-w-4xl w-full"
          aria-describedby={undefined}
        >
          <DialogTitle className="text-gray-900 mb-4">
            여행 성향 태그 선택
          </DialogTitle>
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="w-full md:w-48 max-w-[180px] shrink-0 bg-slate-100/50 md:rounded-l-2xl">
              <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible scrollbar-hide p-2 md:p-2.5 gap-2">
                {TENDENCY_CATEGORIES.map((tab) => {
                  const isActive = activeTendencyTab === tab.id;
                  const count = tab.items.filter((k) =>
                    selectedTravelTendencies.includes(k)
                  ).length;
                  const Icon = tab.icon;

                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setActiveTendencyTab(tab.id)}
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
                      <span className="whitespace-nowrap">{tab.title}</span>
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

            <div className="flex-1 min-w-0 py-4 md:py-5 pr-3 pl-0 md:pl-1 bg-white md:rounded-l-2xl">
              <div className="mb-4 text-left">
                {currentTendencyTab && (
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentTendencyTab.title}
                  </h3>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  마음에 드는 키워드를 모두 골라주세요.
                </p>
              </div>

              <div
                className="animate-in fade-in slide-in-from-right-4 duration-300 h-[260px]"
                key={activeTendencyTab}
              >
                <div
                  className="grid grid-cols-2 gap-2.5 h-full"
                  style={{
                    gridTemplateRows: `repeat(${tendencyGridRows}, minmax(0, 1fr))`,
                  }}
                >
                  {currentTendencyTab &&
                    currentTendencyTab.items.map((label) => {
                      const isSelected =
                        selectedTravelTendencies.includes(label);
                      return (
                        <Button
                          key={label}
                          variant="outline"
                          onClick={() =>
                            handleToggleTendency(label as TravelTendencyType)
                          }
                          className={`
                            relative group py-2 px-2 h-full w-full min-w-[120px] rounded-md text-sm font-medium transition-all duration-200 border text-center flex items-center justify-center gap-1.5 whitespace-nowrap
                            ${
                              isSelected
                                ? 'bg-primary border-primary text-white shadow-primary-soft hover:bg-primary-strong hover:text-white active:bg-primary-strong'
                                : 'bg-white text-slate-600 border-slate-100 hover:border-primary hover:bg-primary-10 hover:text-slate-800'
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
        </DialogContent>
      </Dialog>

      {/* 여행 스타일 태그 추가 모달 */}
      <Dialog open={isStyleModalOpen} onOpenChange={setIsStyleModalOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogTitle className="text-gray-900 mb-4">
            여행 스타일 태그 선택
          </DialogTitle>
          <div className="grid grid-cols-4 gap-3">
            {allStyleTags.map((tag) => {
              const isSelected = selectedTravelStyles.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleStyle(tag as TravelStyleType)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 변경 모달 */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogTitle className="text-gray-900 mb-4">
            비밀번호 변경
          </DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>현재 비밀번호</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>새 비밀번호</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>새 비밀번호 확인</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                취소
              </Button>
              <Button className="flex-1" onClick={handlePasswordChange}>
                변경
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
