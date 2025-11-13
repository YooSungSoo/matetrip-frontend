import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from './ui/dialog';
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
import type { TravelTendencyType } from '../constants/travelTendencyType';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onViewPost: (postId: string) => void;
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
    };
  };
  rating: number;
  // comment: string;
  // API 응답 필드명인 content로 변경
  content: string;
  createdAt: string;
}

export function ProfileModal({
  open,
  onOpenChange,
  userId,
  onViewPost,
}: ProfileModalProps) {
  const { user: loggedInUser } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [travelHistory, setTravelHistory] = useState<Post[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false); // State for EditProfileModal
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
          // API 응답이 POST가 아닌 GET으로 추정됩니다.
          client.get<Review[]>(`/reviews/user/${userId}`),
        ]);

      // [디버그용] 참여한 동행 데이터 확인
      console.log(
        'GET /users/{userId}/participations 응답:',
        participatedPostsRes.data
      );

      console.log('GET /profile/user/{userId} 응답', profileRes.data);

      setProfile(profileRes.data);
      //imageId가 있으면 url 호출
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

      // 작성한 동행과 참여한 동행 목록을 합치고 중복을 제거합니다.
      const written = writtenPostsRes.data || [];
      const participated = Array.isArray(participatedPostsRes.data)
        ? participatedPostsRes.data
        : [];
      const combinedPosts = [...written, ...participated];

      // ID를 기준으로 중복을 제거하고, 최신순(createdAt)으로 정렬합니다.
      const uniquePosts = Array.from(
        new Map(combinedPosts.map((post) => [post.id, post])).values()
      ).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setTravelHistory(uniquePosts);
      setReviews(reviewsRes.data);
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
    }
  }, [open, userId, fetchProfileData]);

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true); // Open the EditProfileModal
  };

  const handleCardClick = (post: Post) => {
    onViewPost(post.id); // 게시글 상세 보기로 이동
  };

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
            <p className="text-gray-700">
              프로필 정보를 불러오는 중 오류가 발생했습니다.
            </p>
            <Button onClick={() => fetchProfileData()}>다시 시도</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isLoading || !profile) {
    //setProfileImageUrl(null);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            프로필 정보를 불러오는 중입니다...
          </div>
        </DialogContent>
      </Dialog>
    );
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
            <DialogTitle className="text-gray-900">
              {profile.nickname}님의 프로필
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-50 no-scrollbar">
            {/* --- 프로필 상단 --- */}
            <div className="flex gap-6">
              <div className="flex-1 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-6">
                    <ImageWithFallback
                      src={
                        profileImageUrl ||
                        `https://ui-avatars.com/api/?name=${profile?.nickname}&background=random`
                      }
                      alt={profile.nickname}
                      className="w-24 h-24 rounded-full object-cover ring-2 ring-gray-100"
                    />
                    <div className="flex flex-col gap-2 pt-2">
                      <h3 className="text-gray-900 text-2xl font-bold">
                        {profile.nickname}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.travelStyles?.map((style) => (
                          <Badge key={style} variant="secondary">
                            {translateKeyword(style)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 flex-shrink-0"
                      onClick={handleEditProfile}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      프로필 수정
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm mb-1">매너온도</p>
                    <div className="flex items-center justify-center gap-1 text-blue-600 font-semibold">
                      <Thermometer className="w-4 h-4" />
                      <p>
                        {mannerTemperature != null
                          ? `${mannerTemperature.toFixed(1)}°C`
                          : '정보 없음'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm mb-1">여행횟수</p>
                    <div className="flex items-center justify-center gap-1 font-semibold">
                      <Car className="w-4 h-4" />
                      <p>{travelHistory.length}회</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
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
                        <button // 더보기/접기 버튼 조건 수정
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
                            <Badge key={tendency} variant="secondary">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {travelHistory.length > 0 ? (
                      travelHistory.map((post) => (
                        <WorkspaceCard
                          key={post.id}
                          post={post}
                          onClick={() => handleCardClick(post)}
                        />
                      ))
                    ) : (
                      <p className="text-gray-500 col-span-2 text-center py-8">
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
                                // TODO: UserProfile에 profileImageId가 추가되면 해당 필드를 사용해야 합니다.
                                // 현재는 닉네임 기반의 fallback 이미지만 사용합니다.
                                src={`https://ui-avatars.com/api/?name=${review.reviewer.profile?.nickname}&background=random`}
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
          onOpenChange={(open) => {
            if (!open) {
              // 모달이 닫힐 때 프로필 데이터를 다시 불러옵니다.
              fetchProfileData();
            }
            setIsEditProfileModalOpen(open);
          }}
          user={{
            id: profile.id,
            nickname: profile.nickname,
            email: loggedInUser?.profile?.email,
            profileImageId: profile.profileImageId ?? null,
            intro: profile.intro || '', // profile.intro를 intro로 직접 전달
            description: profile.description || '', // profile.description을 description으로 직접 전달
            travelStyles: (profile.travelStyles || []) as TravelStyleType[],
            tendency: (profile.tendency || []) as TravelTendencyType[],
            // gender: profile.gender,
            // mbtiTypes: profile.mbtiTypes,
          }}
        />
      )}
    </>
  );
}
