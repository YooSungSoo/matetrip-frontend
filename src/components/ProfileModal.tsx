import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogClose,
} from './ui/dialog';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  X,
  Thermometer,
  Car,
  Pencil,
  Star,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react';
import { Badge } from './ui/badge';
import client from '../api/client'; // prettier-ignore
import { useAuthStore } from '../store/authStore';
import { type Post } from '../types/post';
import { type UserProfile } from '../types/user';
import { translateKeyword } from '../utils/keyword';
import { WorkspaceCard } from './WorkspaceCard';
import { EditProfileModal } from './EditProfileModal'; // Import EditProfileModal
import type { TravelStyleType } from '../constants/travelStyle';
import type { TravelTendencyType } from '../constants/travelTendencyType'; // prettier-ignore
import type { GenderType } from '../constants/gender';
import type { MbtiType } from '../constants/mbti';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onViewPost: (postId: string) => void;
  onLogoutClick?: () => void;
}

interface Review {
  id: string;
  reviewer: {
    id: string;
    createdAt: string;
    updatedAt: string | null;
    email: string;
    profile: {
      id: string;
      createdAt: string;
      updatedAt: string | null;
      nickname: string;
      gender: string;
      intro: string;
      description: string;
      travelStyles: TravelStyleType[];
      travelTendency: TravelTendencyType[];
      mbtiTypes: string;
      profileImageId: string | null;
    };
  };
  rating: number;
  content: string;
  createdAt: string;
}

function ProfileModalSkeleton({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl min-w-[900px] h-[80vh] p-0 overflow-hidden flex flex-col border-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 text-left">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <X className="w-5 h-5" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50 no-scrollbar">
          {/* --- 프로필 상단 스켈레톤 --- */}
          <div className="flex gap-6">
            <div className="flex-1 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex flex-col gap-2 pt-2">
                    <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
                      <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-100 rounded-lg p-4 h-20 animate-pulse" />
                <div className="bg-gray-100 rounded-lg p-4 h-20 animate-pulse" />
                <div className="bg-gray-100 rounded-lg p-4 h-20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* --- 탭 메뉴 스켈레톤 --- */}
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
            <div className="flex border-b border-gray-200">
              <div className="flex-1 py-3 h-12 bg-gray-100 animate-pulse" />
              <div className="flex-1 py-3 h-12 bg-white" />
              <div className="flex-1 py-3 h-12 bg-white" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-4/5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileModal({
  open,
  onOpenChange,
  userId,
  onViewPost,
  onLogoutClick,
}: ProfileModalProps) {
  const { user: loggedInUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [travelHistory, setTravelHistory] = useState<Post[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewerImageUrls, setReviewerImageUrls] = useState<
    Record<string, string | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const isCurrentUser = loggedInUser?.userId === userId;

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [profileRes, writtenPostsRes, participatedPostsRes, reviewsRes] =
        await Promise.all([
          client.get<UserProfile>(`/profile/user/${userId}`),
          client.get<Post[]>(`/users/${userId}/posts`),
          client.get<Post[]>(`/users/${userId}/participations`),
          client.get<Review[]>(`/reviews/user/${userId}`),
        ]);

      setProfile(profileRes.data);
      if (profileRes.data.profileImageId) {
        try {
          const presignedRes = await client.get<{ url: string }>(
            `/binary-content/${profileRes.data.profileImageId}/presigned-url`
          );
          setProfileImageUrl(presignedRes.data.url);
        } catch (presignedError) {
          console.error('프로필 이미지 URL 불러오기 실패:', presignedError);
          setProfileImageUrl(null);
        }
      } else {
        setProfileImageUrl(null);
      }
      setError(null);

      const written = writtenPostsRes.data || [];
      const participated = Array.isArray(participatedPostsRes.data)
        ? participatedPostsRes.data
        : [];
      const combinedPosts = [...written, ...participated];
      const uniquePosts = Array.from(
        new Map(combinedPosts.map((post) => [post.id, post])).values()
      ).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTravelHistory(uniquePosts);

      const reviewsData = reviewsRes.data;
      setReviews(reviewsData);
      const reviewerIdsWithImages = reviewsData
        .map((review) => {
          const imageId = review.reviewer.profile?.profileImageId;
          return imageId ? { imageId, reviewerId: review.reviewer.id } : null;
        })
        .filter(
          (item): item is { imageId: string; reviewerId: string } =>
            item !== null
        );

      if (reviewerIdsWithImages.length > 0) {
        try {
          const uniqueImageIds = Array.from(
            new Set(reviewerIdsWithImages.map((item) => item.imageId))
          );
          const presignedResponses = await Promise.all(
            uniqueImageIds.map(async (imageId) => {
              try {
                const { data } = await client.get<{ url: string }>(
                  `/binary-content/${imageId}/presigned-url`
                );
                return { imageId, url: data.url };
              } catch (err) {
                console.error('Reviewer image presigned fetch failed:', err);
                return { imageId, url: null as string | null };
              }
            })
          );

          setReviewerImageUrls((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const { imageId, url } of presignedResponses) {
              if (next[imageId] !== url) {
                next[imageId] = url;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        } catch (err) {
          console.error('Failed to fetch reviewer images:', err);
        }
      } else {
        setReviewerImageUrls({});
      }
    } catch (error) {
      setError(error);
      console.error('Failed to fetch profile data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      fetchProfileData();
    } else if (!open) {
      // 모달이 닫힐 때 내부 상태를 초기화합니다.
      // 닫기 애니메이션 시간을 고려하여 약간의 딜레이를 줍니다.
      const timer = setTimeout(() => {
        setIsLoading(true);
        setProfile(null);
        setError(null);
        setActiveTab('overview');
        setProfileImageUrl(null);
        setTravelHistory([]);
        setReviews([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, userId, fetchProfileData]);

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleCardClick = (post: Post) => {
    onViewPost(post.id);
  };

  if (!open) {
    return null;
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
            <p className="text-gray-700">
              프로필 정보를 불러오는 중 오류가 발생했습니다.
            </p>
            <Button
              onClick={() => fetchProfileData()}
              className="bg-gray-900 text-white hover:bg-gray-700"
            >
              다시 시도
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading || !profile) {
    return <ProfileModalSkeleton open={open} onOpenChange={onOpenChange} />;
  }

  const rawMannerTemperature =
    profile.mannerTemperature ?? profile.mannerTemp ?? null;
  const parsedMannerTemperature =
    typeof rawMannerTemperature === 'number'
      ? rawMannerTemperature
      : rawMannerTemperature != null
        ? Number(rawMannerTemperature)
        : null;
  const mannerTemperature = Number.isFinite(parsedMannerTemperature)
    ? parsedMannerTemperature
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl min-w-[900px] h-[80vh] p-0 overflow-hidden flex flex-col border-0"
          aria-describedby={undefined}
        >
          <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 text-left">
            <DialogTitle className="text-gray-900 font-bold">
              {profile.nickname}님의 프로필
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50 no-scrollbar">
            {/* --- 프로필 상단 --- */}
            <div className="flex gap-6">
              <div className="flex-1 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-6">
                    <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                      <ImageWithFallback
                        src={
                          profileImageUrl ||
                          `https://ui-avatars.com/api/?name=${profile?.nickname}&background=random`
                        }
                        alt={profile.nickname}
                        className="w-24 h-24 rounded-full object-cover object-center ring-2 ring-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <h3 className="text-gray-900 text-2xl font-bold">
                        {profile.nickname}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.travelStyles?.map((style) => (
                          <Badge
                            key={style}
                            className="bg-gray-800 text-gray-100 hover:bg-gray-700"
                          >
                            {translateKeyword(style)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="h-9 bg-gray-900 text-white hover:bg-gray-700"
                        onClick={handleEditProfile}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        프로필 수정
                      </Button>
                      {onLogoutClick && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={onLogoutClick}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          로그아웃
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <p className="text-gray-600 text-sm mb-1">매너온도</p>
                    <div className="flex items-center justify-center gap-1 text-blue-600 font-semibold">
                      <Thermometer className="w-4 h-4" />
                      <p>
                        {mannerTemperature != null
                          ? `${mannerTemperature.toFixed(1)}°C`
                          : '정보 없음'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <p className="text-gray-600 text-sm mb-1">여행횟수</p>
                    <div className="flex items-center justify-center gap-1 font-semibold text-gray-900">
                      <Car className="w-4 h-4" />
                      <p>{travelHistory.length}회</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 text-center flex items-center justify-center">
                    <p className="font-semibold text-green-600">
                      ✅ 본인인증 완료
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- 탭 메뉴 --- */}
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex border-b border-gray-200">
                {[
                  { key: 'overview', label: '소개' },
                  { key: 'history', label: '여행 기록' },
                  { key: 'reviews', label: '받은 리뷰' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`flex-1 py-3 text-center transition-colors text-sm font-medium ${
                      activeTab === tab.key
                        ? 'border-b-2 border-gray-900 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-gray-900 mb-2 font-bold">
                        한줄 소개
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile.intro ||
                          '아직 한줄 소개가 작성되지 않았습니다.'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-gray-900 mb-2 font-bold">
                        상세 소개
                      </h4>
                      <div
                        className={`text-gray-700 leading-relaxed whitespace-pre-wrap ${
                          !isBioExpanded && 'line-clamp-3'
                        }`}
                      >
                        {profile.description ||
                          '아직 상세 소개가 작성되지 않았습니다.'}
                      </div>
                      {(profile.description?.split('\n').length > 3 ||
                        (profile.description &&
                          profile.description.length > 150)) && (
                        <button
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="w-full mt-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          {isBioExpanded ? '접기' : '더보기'}
                          {isBioExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <div>
                      <h4 className="text-gray-900 mb-2 font-bold">
                        여행 성향
                      </h4>
                      {profile.tendency?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.tendency.map((tendency) => (
                            <Badge
                              key={tendency}
                              className="bg-gray-800 text-gray-100 hover:bg-gray-700"
                            >
                              {translateKeyword(tendency)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          선택한 여행 성향이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {travelHistory.length > 0 ? (
                      travelHistory.map((post) => (
                        <WorkspaceCard
                          key={post.id}
                          post={post}
                          onClick={() => handleCardClick(post)}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-3 text-center py-8">
                        여행 기록이 없습니다.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b border-gray-200 pb-4 last:border-b-0"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <ImageWithFallback
                                src={
                                  (review.reviewer.profile?.profileImageId
                                    ? (reviewerImageUrls[
                                        review.reviewer.profile.profileImageId
                                      ] ?? null)
                                    : null) ??
                                  `https://ui-avatars.com/api/?name=${review.reviewer.profile?.nickname}&background=random`
                                }
                                alt={review.reviewer.profile?.nickname}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div>
                                <span className="text-gray-900 font-medium">
                                  {review.reviewer.profile?.nickname}
                                </span>
                                <div className="flex mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <span className="text-gray-500 text-xs">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm ml-13">
                            {review.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        받은 리뷰가 없습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {profile && (
        <EditProfileModal
          open={isEditProfileModalOpen}
          onOpenChange={setIsEditProfileModalOpen}
          onProfileUpdated={() => {
            fetchProfileData();
          }}
          user={{
            id: profile.id,
            nickname: profile.nickname,
            email: loggedInUser?.profile?.email,
            profileImageId: profile.profileImageId ?? null,
            intro: profile.intro || '',
            description: profile.description || '',
            travelStyles: (profile.travelStyles || []) as TravelStyleType[],
            tendency: (profile.tendency || []) as TravelTendencyType[],
            gender: profile.gender as GenderType,
            mbtiTypes: profile.mbtiTypes as MbtiType,
          }}
        />
      )}
    </>
  );
}
