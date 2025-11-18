import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from './ui/button';
//import { SearchBar } from './SearchBar';
import client from '../api/client';
import { type Post } from '../types/post';
import { MainPostCardSkeleton } from './AIMatchingSkeletion';
import { MatchingCarousel } from './MatchingCarousel';
import { GridMatchingCard } from './GridMatchingCard';
import { PostDetail } from './PostDetail';
import { Dialog, DialogContent } from './ui/dialog';
import { useAuthStore } from '../store/authStore';
import type { MatchingInfo, MatchCandidateDto } from '../types/matching';
import { MatchingSearchBar } from './MatchingSearchBar';
import { toast } from 'sonner';

interface MainPageProps {
  onSearch: (params: {
    startDate?: string;
    endDate?: string;
    location?: string;
    title?: string;
    keyword?: string;
  }) => void;
  onViewPost: (postId: string) => void;
  onCreatePost: () => void;
  isLoggedIn: boolean;
  fetchTrigger: number;
}

const normalizeOverlapText = (values?: unknown): string | undefined => {
  if (!values) {
    return undefined;
  }

  const arrayValues = Array.isArray(values) ? values : [values];

  const normalized = arrayValues
    .map((value) => {
      if (!value) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object') {
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.label === 'string') {
          return candidate.label;
        }
        if (typeof candidate.value === 'string') {
          return candidate.value;
        }
        if (typeof candidate.name === 'string') {
          return candidate.name;
        }
      }
      return String(value);
    })
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (!normalized.length) {
    return undefined;
  }

  return normalized.join(', ');
};

// 임시 매칭 정보 생성 함수 (추후 실제 API로 교체 가능)
// const generateMockMatchingInfo = (index: number): MatchingInfo => {
//   const scores = [92, 85, 78, 73, 68, 65, 62, 58, 55, 52];
//   const tendencies = ['즉흥적', '계획적', '주도적', '따라가는'];
//   const styles = ['호텔', '게스트하우스', '에어비앤비', '캠핑'];
//
//   return {
//     score: scores[index % scores.length] || 50,
//     tendency: tendencies[index % tendencies.length],
//     style: styles[index % styles.length],
//     vectorscore: Math.floor(Math.random() * 30) + 60, // 60-90 사이 랜덤값
//   };
// };

export function MainPage({
  onViewPost,
  fetchTrigger,
  isLoggedIn,
}: MainPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [_isMatchesLoading, setIsMatchesLoading] = useState(true);
  
  // 모달 상태 관리
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // const [startDate, setStartDate] = useState('');
  // const [endDate, setEndDate] = useState('');
  // const [selectedKeyword, setSelectedKeyword] = useState<KeywordValue | ''>('');
  const filterContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    const fetchAllPosts = async () => {
      setIsLoading(true);
      try {
        const initialPostsResponse = await client.get<Post[]>('/posts');

        const sortedInitialPosts = initialPostsResponse.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // '최신 동행 모집' 섹션에는 '모집중'인 글만 필터링하여 설정
        const recruitingPosts = sortedInitialPosts.filter(
          (post) => post.status === '모집중'
        );
        setPosts(recruitingPosts);
        console.log(`최신 동행 글 목록`, sortedInitialPosts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPosts();
  }, [isAuthLoading, fetchTrigger]);

  useEffect(() => {
    if (isAuthLoading || !isLoggedIn || !user?.userId) {
      return;
    }

    let isMounted = true;

    const fetchMatches = async () => {
      setIsMatchesLoading(true);
      try {
        const res = await client.post<MatchCandidateDto[]>(
          '/profile/matching/search',
          {
            limit: 15,
          }
        );
        if (!isMounted) {
          return;
        }
        console.log('match response', res.data);
        setMatches(res.data ?? []);
        
        // TODO: 매너온도 API 연동
        // 향후 백엔드에서 MatchCandidateDto에 mannerTemperature 필드 추가 예정
        // 또는 별도 엔드포인트: GET /users/:userId/profile 호출하여 매너온도 가져오기
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to fetch matches', err);
      } finally {
        if (isMounted) {
          setIsMatchesLoading(false);
        }
      }
    };

    fetchMatches();
    console.log('matching search 완료!');

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isLoggedIn, user?.userId]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const { recommendedPosts, matchingInfoByPostId } = useMemo(() => {
    const toPercent = (value?: number) => {
      if (value === undefined || value === null) {
        return 0;
      }
      return Math.round(value <= 1 ? value * 100 : value);
    };

    const entries: Array<{ post: Post; info: MatchingInfo }> = [];
    const seenPostIds = new Set<string>();

    matches.forEach((candidate) => {
      const matchedPost = posts.find((post) => {
        const writerIds = [
          post.writerId,
          post.writer?.id,
          post.writerProfile?.id,
        ].filter(Boolean);
        return writerIds.includes(candidate.userId);
      });

      if (!matchedPost || seenPostIds.has(matchedPost.id)) {
        return;
      }

      seenPostIds.add(matchedPost.id);

      const tendencyText = normalizeOverlapText(
        candidate.overlappingTendencies
      );

      const styleText = normalizeOverlapText(candidate.overlappingTravelStyles);

      entries.push({
        post: matchedPost,
        info: {
          score: toPercent(candidate.score),
          vectorscore:
            candidate.vectorScore !== undefined
              ? toPercent(candidate.vectorScore)
              : undefined,
          tendency: tendencyText,
          style: styleText,
          // 매너온도 임시 데이터 (35.0 ~ 40.0 사이 랜덤값)
          mannerTemperature: Math.floor(Math.random() * 50 + 350) / 10,
        },
      });
    });

    return {
      recommendedPosts: entries.map((entry) => entry.post),
      matchingInfoByPostId: entries.reduce<Record<string, MatchingInfo>>(
        (acc, entry) => {
          acc[entry.post.id] = entry.info;
          return acc;
        },
        {}
      ),
    };
  }, [matches, posts]);

  const handleCardClick = (post: Post) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    // 모달 직접 열기 (메인페이지 이동 대신)
    setSelectedPostId(post.id);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-16 py-22">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            MateTrip AI가 추천하는 최적의 여행 파트너
          </h1>
        </div>
        {/* 로그인하지 않은 사용자를 위한 안내 배너 */}
        {!isLoggedIn && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    AI 맞춤 추천을 받아보세요
                  </h3>
                  <p className="text-sm text-gray-600">
                    로그인하면 당신에게 딱 맞는 동행을 AI가 추천해드려요
                  </p>
                </div>
              </div>
              <Button
                onClick={() => (window.location.href = '/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                로그인하기
              </Button>
            </div>
          </div>
        )}
        {/* Recommended Posts Section - 모든 사용자에게 표시 */}
        <section className="mb-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : recommendedPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              추천할 동행이 없습니다.
            </div>
          ) : (
            <MatchingCarousel
              posts={recommendedPosts}
              matchingInfoByPostId={matchingInfoByPostId}
              onCardClick={handleCardClick}
            />
          )}
        </section>

        {/* 전체 추천 동행 그리드 */}
        <section className="mb-12">
          {/* Search Bar and Filters - 로그인한 사용자에게만 표시 */}
          {isLoggedIn && <MatchingSearchBar />}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {Array.from({ length: 8 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : recommendedPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              추천할 동행이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {recommendedPosts.map((post, index) => (
                <GridMatchingCard
                  key={post.id}
                  post={post}
                  rank={index + 1}
                  matchingInfo={
                    matchingInfoByPostId?.[post.id] ?? { score: 0 }
                  }
                  onClick={() => handleCardClick(post)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PostDetail 모달 */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedPostId(null);
          }
        }}
      >
        <DialogContent className="w-full !max-w-[1100px] h-[90vh] p-0 flex flex-col [&>button]:hidden border-0 rounded-lg overflow-hidden">
          {selectedPostId && (
            <PostDetail
              postId={selectedPostId}
              onJoinWorkspace={async (postId, workspaceName) => {
                try {
                  await client.post('/workspace', {
                    postId,
                    workspaceName,
                  });
                  setIsModalOpen(false);
                  setSelectedPostId(null);
                  toast.success('워크스페이스에 입장했습니다.');
                } catch (error) {
                  console.error('Failed to create or join workspace:', error);
                  toast.error('워크스페이스에 입장하는 중 오류가 발생했습니다.');
                }
              }}
              onViewProfile={(userId) => {
                console.log('View profile:', userId);
                // 프로필 보기 로직
              }}
              onEditPost={(post) => {
                setIsModalOpen(false);
                setSelectedPostId(null);
                // 게시글 수정 로직
                console.log('Edit post:', post);
              }}
              onDeleteSuccess={() => {
                setIsModalOpen(false);
                setSelectedPostId(null);
                toast.success('게시글이 삭제되었습니다.');
                // 목록 새로고침
                window.location.reload();
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setIsModalOpen(false);
                  setSelectedPostId(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
