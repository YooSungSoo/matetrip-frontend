import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  CheckCircle,
  ChevronRight,
  PlusCircle,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { PlaceRecommendationSection } from '../components/PlaceRecommendationSection';
import { PostDetail } from './PostDetail';
import { useAuthStore } from '../store/authStore';
import client, { API_BASE_URL } from '../api/client';
import { type Post } from '../types/post';
import { type CategoryCode } from '../types/place';
import type { MatchCandidateDto } from '../types/matching';
import { GridMatchingCard } from '../components/GridMatchingCard';
import { MainPostCardSkeleton } from '../components/AIMatchingSkeletion';
import { PoiDetailPanel } from '../components/ScheduleSidebar';
import PageContainer from '../components/PageContainer';
import { CategoryIcon } from '../components/CategoryIcon';
import { ReviewablePlacesCarousel } from '../components/ReviewablePlacesCarousel';
import { RecommendedPlaceCard } from '../components/RecommendedPlaceCard';

// --- Interfaces ---
interface PopularPlaceResponse {
  addplace_id: string;
  title: string;
  address: string;
  image_url?: string;
  summary?: string;
  latitude: number;
  longitude: number;
}

interface Place {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
  summary?: string;
  latitude: number;
  longitude: number;
  category: CategoryCode;
}

interface ReviewablePlaceInfo {
  id: string;
  title: string;
  address: string;
  region: string;
  latitude: number;
  longitude: number;
  category: string;
  image_url: string;
  tags: string[];
  summary: string;
  sido: string;
  createdAt: string;
  planDate: string;
}

interface ReviewableTrip {
  post: {
    id: string;
    title: string;
  };
  places: ReviewablePlaceInfo[];
}

interface NewMainPageProps {
  onCreatePost: () => void;
  onJoinWorkspace: (postId: string, workspaceName: string) => void;
  onViewProfile: (userId: string) => void;
  onEditPost: (post: Post) => void;
  onDeleteSuccess?: () => void;
}

// --- Constants ---
const CATEGORY_REVIEW_EXAMPLES: Record<string, string[]> = {
  음식: [
    '음식이 정말 맛있어요! 😋',
    '분위기 좋은 맛집이에요.',
    '가성비가 좋아서 만족스러웠어요.',
    '직원분들이 친절해요.',
  ],
  숙박: [
    '시설이 깨끗하고 편안했어요. 😴',
    '직원분들이 친절하고 서비스가 좋았어요.',
    '위치가 좋아서 여행하기 편했어요.',
    '뷰가 정말 멋진 숙소였어요! 🌇',
  ],
  '인문(문화/예술/역사)': [
    '유익하고 의미있는 시간이었어요. 🧐',
    '볼거리가 많아서 시간 가는 줄 몰랐어요.',
    '조용하고 평화로워서 힐링됐어요.',
    '아이들과 함께 오기 좋은 곳 같아요.',
  ],
  자연: [
    '경치가 정말 아름다워요. 🏞️',
    '산책하기 좋은 곳이에요.',
    '공기가 맑고 상쾌해서 좋았어요.',
    '인생샷을 건질 수 있어요! 📸',
  ],
  default: [
    '다음에 꼭 다시 방문하고 싶어요. 😊',
    '기대했던 것보다는 조금 아쉬웠어요.',
    '한 번쯤 가볼 만한 곳이에요.',
    '전반적으로 만족스러웠습니다! 👍',
  ],
};

// --- Helper Functions ---
const normalizeTextList = (values?: unknown): string[] => {
  if (!values) return [];
  const arrayValues = Array.isArray(values) ? values : [values];
  return arrayValues
    .map((value) => {
      if (!value) return '';
      if (typeof value === 'object') {
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.label === 'string') return candidate.label;
        if (typeof candidate.value === 'string') return candidate.value;
        if (typeof candidate.name === 'string') return candidate.name;
      }
      return String(value);
    })
    .map((text) => text.trim())
    .filter((text) => text.length > 0);
};

// --- Sub-components ---
function ReviewablePlaceCard({
  place,
  onClick,
}: {
  place: ReviewablePlaceInfo;
  onClick: () => void;
}) {
  return (
    <div
      className="group flex flex-col w-80 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg mr-4 flex-shrink-0"
      onClick={onClick}
    >
      <div className="relative h-48 bg-gray-300 overflow-hidden w-full">
        <img
          src={place.image_url || 'https://via.placeholder.com/300x200'}
          alt={place.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-lg font-bold text-gray-800 leading-snug truncate">
          {place.title}
        </h3>
        <div className="flex flex-col gap-1.5 text-sm text-gray-600 mt-2">
          <div className="flex items-center gap-1.5">
            <CategoryIcon
              category={place.category}
              className="w-4 h-4 text-gray-400"
            />
            <span>{place.category}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            <p className="truncate">{place.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  isOpen,
  onClose,
  place,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  place: ReviewablePlaceInfo;
  onSubmit: (review: {
    placeId: string;
    rating: number;
    content: string;
  }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rating === 0) {
      alert('별점을 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }
    onSubmit({ placeId: place.id, rating, content });
  };

  const reviewExamples =
    CATEGORY_REVIEW_EXAMPLES[place.category] ||
    CATEGORY_REVIEW_EXAMPLES.default;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-32 bg-cover bg-center p-6 flex flex-col justify-end"
          style={{ backgroundImage: `url(${place.image_url})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white">리뷰 작성하기</h2>
            <p className="text-gray-200">
              <span className="font-semibold">{place.title}</span>에서의 경험은
              어떠셨나요?
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5">
            <label className="block text-lg font-bold text-gray-800 mb-2">
              별점
            </label>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-9 h-9 cursor-pointer"
                  fill={
                    star <= (hoverRating || rating) ? '#FFC107' : 'transparent'
                  }
                  stroke={
                    star <= (hoverRating || rating) ? '#FFC107' : '#A0A0A0'
                  }
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="review-content"
              className="block text-lg font-bold text-gray-800 mb-2"
            >
              한 줄 리뷰
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {reviewExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setContent(example)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
            <input
              type="text"
              id="review-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="직접 입력하거나 위 예시를 선택하세요."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-8">
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSubmit}>제출하기</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// [신규] 성공 모달 컴포넌트
function SuccessModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mt-4 mb-2 text-gray-800">
          리뷰 등록 완료!
        </h2>
        <p className="text-gray-600 mb-6">
          소중한 리뷰를 남겨주셔서 감사합니다.
        </p>
        <Button onClick={onClose} className="w-full">
          확인
        </Button>
      </div>
    </div>
  );
}

// --- Main Component ---
export function NewMainPage({
  onCreatePost,
  onJoinWorkspace,
  onViewProfile,
  onEditPost,
  onDeleteSuccess,
}: NewMainPageProps) {
  const navigate = useNavigate();
  const { user, isAuthLoading } = useAuthStore();
  const isLoggedIn = !!user;

  // Data states
  const [posts, setPosts] = useState<Post[]>([]);
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [inspirations, setInspirations] = useState<Place[]>([]);
  const [reviewableTrips, setReviewableTrips] = useState<ReviewableTrip[]>([]);

  // Loading states
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isInspirationsLoading, setIsInspirationsLoading] = useState(true);
  const [isReviewablePlacesLoading, setIsReviewablePlacesLoading] =
    useState(true);

  const [activeReviewTabs, setActiveReviewTabs] = useState<
    Record<string, string>
  >({});

  // Panel/Modal states
  const [showPlaceDetailPanel, setShowPlaceDetailPanel] = useState(false);
  const [selectedPlaceIdForPanel, setSelectedPlaceIdForPanel] = useState<
    string | null
  >(null);
  const [showPostDetailPanel, setShowPostDetailPanel] = useState(false);
  const [selectedPostIdForPanel, setSelectedPostIdForPanel] = useState<
    string | null
  >(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPlaceForReview, setSelectedPlaceForReview] =
    useState<ReviewablePlaceInfo | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // [신규]

  const [writerProfileImages, setWriterProfileImages] = useState<
    Record<string, string | null>
  >({});

  // --- Data Fetching Effects ---
  useEffect(() => {
    if (isAuthLoading) return;
    const fetchPosts = async () => {
      setIsPostsLoading(true);
      try {
        const response = await client.get<Post[]>('/posts');
        const sorted = response.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPosts(sorted.filter((post) => post.status === '모집중'));
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsPostsLoading(false);
      }
    };
    fetchPosts();
  }, [isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading || !isLoggedIn || !user?.userId) {
      setIsMatchesLoading(false);
      return;
    }
    let isMounted = true;
    const fetchMatches = async () => {
      setIsMatchesLoading(true);
      try {
        const response = await client.post<MatchCandidateDto[]>(
          '/profile/matching/search',
          { limit: 5 }
        );
        if (isMounted) setMatches(response.data ?? []);
      } catch (error) {
        if (isMounted) console.error('Failed to fetch matches:', error);
      } finally {
        if (isMounted) setIsMatchesLoading(false);
      }
    };
    fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isLoggedIn, user?.userId]);

  useEffect(() => {
    if (isAuthLoading) return;
    const fetchInspirations = async () => {
      setIsInspirationsLoading(true);
      try {
        const response = await client.get<PopularPlaceResponse[]>(
          '/places/popular',
          { params: { page: 1, limit: 5 } }
        );
        const detailedPlaces = await Promise.all(
          response.data.map(async (item) => {
            try {
              const detailResponse = await client.get(
                `/places/${item.addplace_id}`
              );
              const place: Place = {
                id: item.addplace_id,
                title: item.title,
                address: item.address,
                imageUrl: item.image_url,
                summary: detailResponse.data.summary,
                latitude: detailResponse.data.latitude,
                longitude: detailResponse.data.longitude,
                category: detailResponse.data.category,
              };
              return place;
            } catch (error) {
              console.error(
                `Failed to fetch detail for ${item.addplace_id}:`,
                error
              );
              return null;
            }
          })
        );
        setInspirations(detailedPlaces.filter((p): p is Place => p !== null));
      } catch (error) {
        console.error('Failed to fetch inspirations:', error);
      } finally {
        setIsInspirationsLoading(false);
      }
    };
    fetchInspirations();
  }, [isAuthLoading]);

  const fetchReviewablePlaces = async () => {
    if (!isLoggedIn) {
      setIsReviewablePlacesLoading(false);
      return;
    }
    setIsReviewablePlacesLoading(true);
    try {
      const response = await client.get<ReviewableTrip[]>(
        '/place-user-reviews/reviewable'
      );
      const trips = response.data ?? [];
      setReviewableTrips(trips);

      if (trips.length > 0) {
        const initialTabs: Record<string, string> = {};
        trips.forEach((trip) => {
          if (trip.places.length > 0) {
            const firstDate = trip.places.reduce((earliest, current) => {
              return earliest < current.planDate ? earliest : current.planDate;
            }, trip.places[0].planDate);
            initialTabs[trip.post.id] = firstDate;
          }
        });
        setActiveReviewTabs(initialTabs);
      }
    } catch (error) {
      console.error('Failed to fetch reviewable places:', error);
      setReviewableTrips([]);
    } finally {
      setIsReviewablePlacesLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewablePlaces();
  }, [isLoggedIn]);

  // --- Memoized Calculations ---
  const matchedPosts = useMemo(() => {
    return matches
      .map((match) => {
        const post = posts.find((p) =>
          [p.writerId, p.writer?.id, p.writerProfile?.id]
            .filter(Boolean)
            .includes(match.userId)
        );
        if (!post) return null;
        return {
          post,
          score: Math.round(match.score * 100),
          tendency: normalizeTextList(match.overlappingTendencies),
          style: normalizeTextList(match.overlappingTravelStyles),
        };
      })
      .filter(
        (
          item
        ): item is {
          post: Post;
          score: number;
          tendency: string[];
          style: string[];
        } => item !== null
      )
      .slice(0, 5);
  }, [matches, posts]);

  useEffect(() => {
    const fetchAllWriterProfileImages = async () => {
      const imageIds = matchedPosts
        .map((item) => item.post.writer?.profile?.profileImageId)
        .filter((id): id is string => !!id);
      const uniqueImageIds = Array.from(new Set(imageIds));
      if (uniqueImageIds.length === 0) {
        setWriterProfileImages({});
        return;
      }
      try {
        const results = await Promise.all(
          uniqueImageIds.map(async (imageId) => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/binary-content/${imageId}/presigned-url`,
                { credentials: 'include' }
              );
              if (!response.ok)
                throw new Error('Failed to fetch presigned URL');
              const { url } = await response.json();
              return { imageId, url };
            } catch (error) {
              console.error(`Failed to load profile image ${imageId}:`, error);
              return { imageId, url: null };
            }
          })
        );
        const imageMap: Record<string, string | null> = {};
        results.forEach(({ imageId, url }) => {
          imageMap[imageId] = url;
        });
        setWriterProfileImages(imageMap);
      } catch (error) {
        console.error('Failed to fetch writer profile images:', error);
      }
    };
    if (matchedPosts.length > 0) fetchAllWriterProfileImages();
    else setWriterProfileImages({});
  }, [matchedPosts]);

  // --- Handlers ---
  const handleOpenPlaceDetailPanel = (placeId: string) => {
    setSelectedPlaceIdForPanel(placeId);
    requestAnimationFrame(() => setShowPlaceDetailPanel(true));
  };

  const handleClosePlaceDetailPanel = () => {
    setShowPlaceDetailPanel(false);
    setTimeout(() => setSelectedPlaceIdForPanel(null), 300);
  };

  const handleOpenPostDetailPanel = (postId: string) => {
    setSelectedPostIdForPanel(postId);
    setShowPostDetailPanel(true);
  };

  const handleClosePostDetailPanel = () => {
    setShowPostDetailPanel(false);
    setSelectedPostIdForPanel(null);
  };

  const handlePostClick = (postId: string) => {
    handleOpenPostDetailPanel(postId);
  };

  const handlePlaceClick = (placeId: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    handleOpenPlaceDetailPanel(placeId);
  };

  const handleInspirationClick = (place: Place) => {
    handleOpenPlaceDetailPanel(place.id);
  };

  const handleAllViewMatching = () => {
    if (!isLoggedIn) navigate('/login');
    else navigate('/ai-matching');
  };

  const handleAllViewInspiration = () => {
    navigate('/inspiration');
  };

  const handleOpenReviewModal = (place: ReviewablePlaceInfo) => {
    setSelectedPlaceForReview(place);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedPlaceForReview(null);
  };

  // [수정] 성공 모달을 띄우도록 핸들러 수정
  const handleSubmitReview = async ({
    placeId,
    rating,
    content,
  }: {
    placeId: string;
    rating: number;
    content: string;
  }) => {
    try {
      await client.post('/place-user-reviews', { placeId, rating, content });
      handleCloseReviewModal();
      setShowSuccessModal(true); // 성공 모달 띄우기
      fetchReviewablePlaces();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('리뷰 등록에 실패했습니다.');
    }
  };

  return (
    <div className="flex bg-white relative">
      <div className="flex-1 overflow-y-auto">
        {/* Section 0: CTA */}
        {isLoggedIn && (
          <section
            className="relative bg-gray-800 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://source.unsplash.com/1600x900/?travel,destination)`,
            }}
          >
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <h2 className="text-3xl font-bold text-white">
                {user.profile.nickname}님, 새로운 여행을 떠나보세요!
              </h2>
              <p className="mt-2 text-gray-200 max-w-2xl">
                나와 꼭 맞는 동행자와 함께 잊지 못할 추억을 만들 수 있어요.
                지금 바로 여행 계획을 시작해보세요.
              </p>
              <Button
                onClick={onCreatePost}
                className="mt-6 bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-6 text-base flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />새 동행 만들기
              </Button>
            </div>
          </section>
        )}

        <PageContainer className="flex flex-col gap-y-12 md:gap-y-16 lg:gap-y-20">
          {/* Section 1: AI 추천 동행 */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.profile.nickname}님을 위한 맞춤 여행 추천
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  나의 여행 성향을 분석해 MateTrip AI가 찾아낸 최고의 여행
                  파트너예요.
                </p>
              </div>
              <Button
                onClick={handleAllViewMatching}
                variant="ghost"
                className="text-sm self-start sm:self-auto flex items-center text-gray-600 hover:text-gray-900"
              >
                전체보기
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {!isLoggedIn ? (
              <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-6 border border-blue-100 text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  로그인이 필요합니다
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  당신에게 딱 맞는 동행을 AI가 추천해드려요
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  로그인하기
                </Button>
              </div>
            ) : isMatchesLoading || isPostsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {Array.from({ length: 5 }).map((_, index) => (
                  <MainPostCardSkeleton key={index} />
                ))}
              </div>
            ) : matchedPosts.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                추천할 동행이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {matchedPosts.map(({ post, score, tendency, style }, index) => (
                  <GridMatchingCard
                    key={post.id}
                    post={post}
                    matchingInfo={{
                      score,
                      tendency: tendency.join(', '),
                      style: style.join(', '),
                    }}
                    rank={index + 1}
                    writerProfileImageUrl={
                      post.writer?.profile?.profileImageId
                        ? (writerProfileImages[
                            post.writer.profile.profileImageId
                          ] ?? null)
                        : null
                    }
                    writerNickname={post.writer?.profile?.nickname ?? null}
                    onClick={() => handlePostClick(post.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section: 리뷰 가능한 장소 (탭 UI 적용) */}
          {isLoggedIn && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user?.profile.nickname}님의 리뷰를 기다리는 장소
                    </h2>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    다녀오신 장소에 대한 리뷰를 남겨주세요!
                  </p>
                </div>
              </div>
              {isReviewablePlacesLoading ? (
                <div className="space-y-4">
                  <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse" />
                  <div className="grid grid-cols-5 gap-4 md:gap-6">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="w-full h-40 bg-gray-200 rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ) : reviewableTrips.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
                  리뷰를 작성할 장소가 없습니다.
                </div>
              ) : (
                <div className="flex flex-col gap-y-8">
                  {reviewableTrips.map((trip) => {
                    const placesByDate = trip.places.reduce(
                      (acc, place) => {
                        const date = place.planDate;
                        if (!acc[date]) {
                          acc[date] = [];
                        }
                        acc[date].push(place);
                        return acc;
                      },
                      {} as Record<string, ReviewablePlaceInfo[]>
                    );

                    const sortedDates = Object.keys(placesByDate).sort();
                    const activeDate = activeReviewTabs[trip.post.id];

                    return (
                      <div key={trip.post.id}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          <span className="text-blue-600">
                            "{trip.post.title}"
                          </span>{' '}
                          여행
                        </h3>
                        <div className="border-b border-gray-200">
                          <nav
                            className="-mb-px flex space-x-6"
                            aria-label="Tabs"
                          >
                            {sortedDates.map((date) => (
                              <button
                                key={date}
                                type="button"
                                onClick={() =>
                                  setActiveReviewTabs((prev) => ({
                                    ...prev,
                                    [trip.post.id]: date,
                                  }))
                                }
                                className={`${
                                  date === activeDate
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                              >
                                {date}
                              </button>
                            ))}
                          </nav>
                        </div>
                        <div className="pt-6">
                          {activeDate && placesByDate[activeDate] && (
                            <ReviewablePlacesCarousel>
                              {placesByDate[activeDate].map((place) => (
                                <ReviewablePlaceCard
                                  key={place.id}
                                  place={place}
                                  onClick={() => handleOpenReviewModal(place)}
                                />
                              ))}
                            </ReviewablePlacesCarousel>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Section 2: 장소 추천 */}
          <PlaceRecommendationSection onPlaceClick={handlePlaceClick} />

          {/* Section 3: Inspiration */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-6 h-6 text-red-500" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Hot Place
                  </h2>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  MateTrip 유저들의 Pick!
                </p>
              </div>
              <Button
                onClick={handleAllViewInspiration}
                variant="ghost"
                className="text-sm self-start sm:self-auto flex items-center text-gray-600 hover:text-gray-900"
              >
                전체보기
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {isInspirationsLoading ? (
              <div className="grid grid-cols-5 gap-4 md:gap-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-full h-64 bg-gray-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : inspirations.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                추천할 장소가 없습니다.
              </div>
            ) : (
              <ReviewablePlacesCarousel>
                {inspirations.map((place) => (
                  <RecommendedPlaceCard
                    key={place.id}
                    imageUrl={place.imageUrl}
                    title={place.title}
                    address={place.address}
                    category={place.category}
                    onClick={() => handleInspirationClick(place)}
                  />
                ))}
              </ReviewablePlacesCarousel>
            )}
          </section>
        </PageContainer>
      </div>

      {/* Panels & Overlays */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 ${
          showPlaceDetailPanel || showPostDetailPanel
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => {
          if (showPlaceDetailPanel) handleClosePlaceDetailPanel();
          if (showPostDetailPanel) handleClosePostDetailPanel();
        }}
      />
      <PoiDetailPanel
        placeId={selectedPlaceIdForPanel}
        isVisible={showPlaceDetailPanel}
        onClose={handleClosePlaceDetailPanel}
        onNearbyPlaceSelect={handleOpenPlaceDetailPanel}
        onPoiSelect={() => {}}
        widthClass="w-1/2"
        onClick={(e) => e.stopPropagation()}
        positioning="fixed"
      />
      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
          showPostDetailPanel ? 'translate-x-0' : 'translate-x-full'
        } w-1/2`}
        onClick={(e) => e.stopPropagation()}
      >
        {selectedPostIdForPanel && (
          <PostDetail
            postId={selectedPostIdForPanel}
            onJoinWorkspace={(postId, workspaceName) => {
              onJoinWorkspace(postId, workspaceName);
              handleClosePostDetailPanel();
            }}
            onViewProfile={onViewProfile}
            onEditPost={onEditPost}
            onDeleteSuccess={onDeleteSuccess || (() => {})}
            onOpenChange={handleClosePostDetailPanel}
          />
        )}
      </div>

      {/* 리뷰 모달 렌더링 */}
      {isReviewModalOpen && selectedPlaceForReview && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleCloseReviewModal}
          place={selectedPlaceForReview}
          onSubmit={handleSubmitReview}
        />
      )}

      {/* [신규] 성공 모달 렌더링 */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
