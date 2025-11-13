import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Star,
  MapPin,
  Calendar,
  Thermometer,
  Edit,
  Car,
  Cigarette,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  TRAVEL_STYLE_OPTIONS,
  //TRAVEL_STYLE_TYPES,
  type TravelStyleType,
} from '../constants/travelStyle';
import {
  GENDER_OPTIONS,
  //GENDER_TYPES,
  type GenderType,
} from '../constants/gender';
import { MBTI_OPTIONS, type MbtiType } from '../constants/mbti';
import {
  TENDENCY_OPTIONS,
  type TravelTendencyType,
} from '../constants/travelTendencyType';
import type { UpdateProfileDto } from '../types/updateprofiledto';
import { useAuthStore } from '../store/authStore';
import { type Post } from '../types/post';
import { API_BASE_URL } from '../api/client.ts'; // Import Post type

interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  trip: string;
}

// Removed Trip interface as we will use Post type directly

interface ProfileData {
  nickname: string;
  intro: string;
  description: string;
  gender: GenderType;
  age: number;
  //job: string;
  mbtiTypes: MbtiType;
  smoking: boolean;
  driverLicense: boolean;
  //mannerTemp: number;
  //totalTrips: number;
  //badges: string[];
  tendency: TravelTendencyType[];
  travelStyles: TravelStyleType[];
  reviews: Review[];
  posts: Post[]; // Changed from trips to posts
  profileImageId: string | null;
}

const EMPTY_PROFILE: ProfileData = {
  nickname: '',
  intro: '',
  description: '',
  gender: '남성',
  age: 28,
  mbtiTypes: 'ENFP',
  smoking: false,
  driverLicense: false,
  tendency: [],
  travelStyles: [],
  reviews: [],
  posts: [], // Changed from trips to posts
  profileImageId: null,
};

interface ProfileProps {
  isLoggedIn: boolean;
  onViewPost: (postId: string) => void;
  userId?: string;
}

export function Profile({
  isLoggedIn,
  onViewPost, // Changed _onViewPost to onViewPost
  userId,
}: ProfileProps) {
  const { user } = useAuthStore();
  const canEditProfile =
    userId == null || (user?.userId != null && String(userId) === user.userId);
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [userPosts, setUserPosts] = useState<Post[]>([]); // New state for user-specific posts

  const viewData = useMemo(
    () => (isEditing ? draft : profile),
    [isEditing, draft, profile]
  );

  const handleInput =
    <K extends keyof ProfileData>(key: K) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value =
        event.target.type === 'checkbox'
          ? (event.target as HTMLInputElement).checked
          : event.target.value;
      setDraft((prev) => ({
        ...prev,
        [key]: key === 'age' ? Number(value) : (value as ProfileData[K]),
      }));
    };

  const handleGenderChange = (value: GenderType) => {
    setDraft((prev) => ({ ...prev, gender: value }));
  };

  const handleMbtiChange = (value: MbtiType) => {
    setDraft((prev) => ({ ...prev, mbtiTypes: value }));
  };

  const handleTravelStyleToggle = (style: TravelStyleType) => {
    setDraft((prev) => {
      const alreadySelected = prev.travelStyles.includes(style);
      return {
        ...prev,
        travelStyles: alreadySelected
          ? prev.travelStyles.filter((item) => item !== style)
          : [...prev.travelStyles, style],
      };
    });
  };

  const handleTravelTendencyToggle = (tendency: TravelTendencyType) => {
    setDraft((prev) => {
      const alreadySelected = prev.tendency.includes(tendency);
      return {
        ...prev,
        tendency: alreadySelected
          ? prev.tendency.filter((item) => item !== tendency)
          : [...prev.tendency, tendency],
      };
    });
  };

  const mapDtoToProfile = (
    dto: UpdateProfileDto,
    prev: ProfileData
  ): ProfileData => ({
    ...prev,
    nickname: dto.nickname ?? prev.nickname,
    intro: dto.intro ?? prev.intro,
    description: dto.description ?? prev.description,
    gender: dto.gender ?? prev.gender,
    mbtiTypes: dto.mbtiTypes ?? prev.mbtiTypes,
    tendency: dto.tendency ?? prev.tendency,
    travelStyles: dto.travelStyles ?? prev.travelStyles,
    profileImageId: dto.profileImageId ?? prev.profileImageId,
  });

  // Fetch user profile data
  useEffect(() => {
    let isMounted = true;

    const fetchProfileData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profile/my`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to fetch profile data`);

        const data: UpdateProfileDto = await res.json();
        console.log(data);
        if (!isMounted) return;

        setProfile((prev) => {
          const next = mapDtoToProfile(data, prev);
          setDraft(next);
          return next;
        });
      } catch (error) {
        console.error('프로필 정보 로딩 중 에러:', error);
      }
    };

    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch user-specific posts
  useEffect(() => {
    let isMounted = true;

    const fetchUserPosts = async () => {
      if (!userId && !user?.userId) return; // Ensure userId is available

      const targetUserId = userId || user?.userId;
      if (!targetUserId) return;

      try {
        const res = await fetch(`${API_BASE_URL}/posts/user/${targetUserId}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to fetch user posts`);

        const data: Post[] = await res.json();
        console.log('User Posts:', data);
        if (!isMounted) return;
        setUserPosts(data);
      } catch (error) {
        console.error('사용자 게시글 로딩 중 에러:', error);
        setUserPosts([]);
      }
    };

    fetchUserPosts();
    return () => {
      isMounted = false;
    };
  }, [userId, user?.userId]); // Rerun when userId or logged-in user's ID changes

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImagePreviewRef = useRef<string | null>(null);

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [pendingProfileImageFile, setPendingProfileImageFile] =
    useState<File | null>(null);
  const [profileImageRemoteUrl, setProfileImageRemoteUrl] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    if (!viewData.profileImageId) {
      setProfileImageRemoteUrl(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/binary-content/${viewData.profileImageId}/presigned-url`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('presigned GET 요청 실패');
        const { url } = await res.json();
        if (!cancelled) setProfileImageRemoteUrl(url);
      } catch (err) {
        console.error('프로필 이미지 URL 불러오기 실패:', err);
        if (!cancelled) setProfileImageRemoteUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewData.profileImageId]);

  const profileImageUrl = profileImagePreview ?? profileImageRemoteUrl;

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingProfileImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    updateProfileImagePreview(objectUrl);
    event.target.value = '';
  };

  const startEditing = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(profile);
    setIsEditing(false);
    setPendingProfileImageFile(null);
    updateProfileImagePreview(null);
  };

  const saveProfile = async () => {
    let profileImageId = draft.profileImageId;
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
        if (!presignResponse.ok) throw new Error('presigned-url 요청 실패');
        const { uploadUrl, binaryContentId } = await presignResponse.json();

        const s3Response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
        });
        if (!s3Response.ok) throw new Error('S3 업로드 실패');
        profileImageId = binaryContentId;
      }
      const payload: UpdateProfileDto = {
        nickname: draft.nickname,
        description: draft.description,
        intro: draft.intro,
        gender: draft.gender,
        mbtiTypes: draft.mbtiTypes,
        travelStyles: draft.travelStyles,
        tendency: draft.tendency,
        profileImageId,
      };

      const res = await fetch(`${API_BASE_URL}/profile/my`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error(res.status, detail);
        throw new Error('업데이트 실패');
      }

      const updatedData: UpdateProfileDto = await res.json();
      setProfile((prev) => {
        const next = mapDtoToProfile(updatedData, prev);
        setDraft(next);
        return next;
      });
      setPendingProfileImageFile(null);
      updateProfileImagePreview(null);

      setIsEditing(false);
    } catch (err) {
      console.error('PATCH 실패:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border p-8 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
              {profileImageUrl ? (
                <ImageWithFallback
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover object-center"
                />
              ) : null}
            </div>
            {canEditProfile && isEditing && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={openFilePicker}
                >
                  프로필 사진 변경
                </Button>
              </>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="max-w-xl">
                <h2 className="text-gray-900 mb-2">{viewData.nickname}</h2>

                {isEditing ? (
                  <textarea
                    className="w-full min-h-[72px] resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    value={draft.intro}
                    onChange={handleInput('intro')}
                  />
                ) : (
                  <p className="text-gray-600 mb-3">{viewData.intro}</p>
                )}

                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-gray-900 mb-3">여행 성향</h4>
                  {canEditProfile && isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {TENDENCY_OPTIONS.map(({ value, label }) => {
                        const selected = draft.tendency.includes(value);
                        return (
                          <button
                            type="button"
                            key={value}
                            onClick={() => handleTravelTendencyToggle(value)}
                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                              selected
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {viewData.tendency.length > 0 ? (
                        viewData.tendency.map((tendency) => {
                          const label =
                            TENDENCY_OPTIONS.find(
                              (option) => option.value === tendency
                            )?.label ?? tendency;
                          return (
                            <Badge
                              key={tendency}
                              variant="outline"
                              className="text-xs"
                            >
                              {label}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-400">
                          등록된 여행 성향이 없습니다
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {canEditProfile &&
                (isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={cancelEditing}>
                      취소
                    </Button>
                    <Button
                      onClick={saveProfile}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      저장
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={startEditing}
                  >
                    <Edit className="w-4 h-4" />
                    프로필 수정
                  </Button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Thermometer className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600">37.5°C</span>
                </div>
                <div className="text-xs text-gray-600">매너온도</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <MapPin className="w-4 h-4 text-gray-900" />
                  {/* TODO: Calculate total trips from userPosts */}
                </div>
                <div className="text-xs text-gray-600">여행 횟수</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-gray-900">4.8</span>
                </div>
                <div className="text-xs text-gray-600">평균 평점</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="text-gray-900 mb-2">자기소개</h4>
          {canEditProfile && isEditing ? (
            <textarea
              className="w-full min-h-[140px] resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={draft.description}
              onChange={handleInput('description')}
            />
          ) : (
            <p className="text-gray-600 whitespace-pre-line">
              {viewData.description}
            </p>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="text-gray-900 mb-4">상세 정보</h4>
          {canEditProfile && isEditing ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>성별</span>
                <Select value={draft.gender} onValueChange={handleGenderChange}>
                  <SelectTrigger className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <SelectValue placeholder="성별을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)] rounded-lg border border-gray-200 bg-white shadow-md">
                    {GENDER_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2 text-sm text-gray-700">
                <span>MBTI</span>
                <Select
                  value={draft.mbtiTypes}
                  onValueChange={handleMbtiChange}
                >
                  <SelectTrigger className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                    <SelectValue placeholder="MBTI를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg  bg-white px-3 text-sm">
                    {MBTI_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>직업</span>
                <span className="w-full rounded-lg  px-3 py-2 ">디자이너</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.driverLicense}
                  onChange={handleInput('driverLicense')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>운전면허 있음</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.smoking}
                  onChange={handleInput('smoking')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>흡연자</span>
              </label>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">성별</div>
                  <div className="text-gray-900">{viewData.gender}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">나이</div>
                  <div className="text-gray-900">{viewData.age}세</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">MBTI</div>
                  <div className="text-gray-900">{viewData.mbtiTypes}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">직업</div>
                  <div className="text-gray-900">디자이너</div>
                </div>
              </div>

              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Car className="w-4 h-4" />
                  <span className="text-sm">
                    운전면허: {viewData.driverLicense ? '있음' : '없음'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Cigarette className="w-4 h-4" />
                  <span className="text-sm">
                    흡연: {viewData.smoking ? '흡연' : '비흡연'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 pt-6 border-t">
          <h4 className="text-gray-900 mb-3">여행 스타일</h4>
          {canEditProfile && isEditing ? (
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLE_OPTIONS.map(({ value, label }) => {
                const selected = draft.travelStyles.includes(value);
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => handleTravelStyleToggle(value)}
                    className={`rounded-full border px-4 py-1 text-sm transition-colors ${
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {viewData.travelStyles.map((style) => {
                const label =
                  TRAVEL_STYLE_OPTIONS.find((option) => option.value === style)
                    ?.label ?? style;
                return (
                  <Badge key={style} variant="outline" className="text-sm">
                    {label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="trips" className="w-full">
        <TabsList className="w-full bg-white border rounded-lg mb-6">
          <TabsTrigger value="trips" className="flex-1">
            여행 기록
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex-1">
            동행 찾기
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1">
            받은 리뷰
          </TabsTrigger>
          {isLoggedIn && (
            <TabsTrigger value="settings" className="flex-1">
              내 정보
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="trips">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPosts.map((post) => {
              const statusValue = post.status as string;
              const isRecruitOrTravel =
                statusValue === '모집중' || statusValue === '여행중';
              const displayStatus = isRecruitOrTravel
                ? 'recruiting'
                : 'completed';
              const badgeText = isRecruitOrTravel ? '모집중' : '완료';
              const badgeColorClass =
                displayStatus === 'completed' ? 'bg-gray-600' : 'bg-blue-600';

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onViewPost(post.id)}
                >
                  <div className="relative h-48">
                    {/* Placeholder image as Post type doesn't have an image field directly */}
                    <ImageWithFallback
                      src="https://via.placeholder.com/400x200?text=No+Image"
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      className={`absolute top-3 right-3 ${badgeColorClass}`}
                    >
                      {badgeText}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h4 className="text-gray-900 mb-2">{post.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {post.startDate} ~ {post.endDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="posts">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPosts
              .filter((post) => post.status === '모집중')
              .map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onViewPost(post.id)}
                >
                  <div className="relative h-48">
                    {/* Placeholder image */}
                    <ImageWithFallback
                      src="https://via.placeholder.com/400x200?text=No+Image"
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-3 right-3 bg-blue-600">
                      모집중
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h4 className="text-gray-900 mb-2">{post.title}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {post.startDate} ~ {post.endDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="space-y-4">
            {viewData.reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    <div>
                      <div className="text-gray-900">{review.author}</div>
                      <div className="text-sm text-gray-600">{review.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-3">{review.comment}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{review.trip}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {isLoggedIn && (
          <TabsContent value="settings">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-gray-900 mb-6">비밀번호 변경</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    현재 비밀번호
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  비밀번호 변경
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
