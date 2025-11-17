import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
//import { SearchBar } from './SearchBar';
import client from '../api/client';
import { type Post } from '../types/post';
import { MainPostCardSkeleton } from './MainPostCardSkeleton';
import { MatchingCarousel } from './MatchingCarousel';
import { useAuthStore } from '../store/authStore';
import type { MatchingInfo, MatchCandidateDto } from '../types/matching';
import { type KeywordValue } from '../utils/keyword';
import { MatchingSearchBar } from './MatchingSearchBar';

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

const REGION_CATEGORIES = [
  {
    id: 1,
    name: '제주도',
    image:
      'https://images.unsplash.com/photo-1614088459293-5669fadc3448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NjE4NjQwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '힐링 여행의 성지',
  },
  {
    id: 2,
    name: '부산',
    image:
      'https://images.unsplash.com/photo-1665231342828-229205867d94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxiZWFjaCUyMHBhcmFhZGlzZfGVufDF8fHx8MTc2MTg4Mzg2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '바다와 도시의 조화',
  },
  {
    id: 3,
    name: '서울',
    image:
      'https://images.unsplash.com/photo-1597552661064-af143a5f3bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxzZW91bCUyMGtvcmVhfGVufDF8fHx8MTc2MTk4MjQzNHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '트렌디한 도심 여행',
  },
  {
    id: 4,
    name: '경주',
    image:
      'https://images.unsplash.com/photo-1668850443435-c01eec56c4e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxnYnllb25namUlMjBrb3JlYXxlbnwxfHx8fDE3NjE5ODI0MzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '역사 문화 탐방',
  },
  {
    id: 5,
    name: '강릉',
    image:
      'https://images.unsplash.com/photo-1684042229029-8a99193a8e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxnYW5nbmV1bmclMjBrb3JlYXxlbnwxfHx8fDE3NjE5ODI0MzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '동해안의 낭만',
  },
  {
    id: 6,
    name: '전주',
    image:
      'https://images.unsplash.com/photo-1520645521318-f03a12f0e67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjaXR5JTIwdHJhdmVsfGVufDF8fHx8MTc2MTkxMjEzMXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '맛집 투어의 메카',
  },
];

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
const generateMockMatchingInfo = (index: number): MatchingInfo => {
  const scores = [92, 85, 78, 73, 68, 65, 62, 58, 55, 52];
  const tendencies = ['즉흥적', '계획적', '주도적', '따라가는'];
  const styles = ['호텔', '게스트하우스', '에어비앤비', '캠핑'];

  return {
    score: scores[index % scores.length] || 50,
    tendency: tendencies[index % tendencies.length],
    style: styles[index % styles.length],
    vectorscore: Math.floor(Math.random() * 30) + 60, // 60-90 사이 랜덤값
  };
};

export function MainPage({
  onSearch,
  onViewPost,
  fetchTrigger,
  isLoggedIn,
}: MainPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);

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
            limit: 5,
          }
        );
        if (!isMounted) {
          return;
        }
        console.log('match response', res.data);
        setMatches(res.data ?? []);
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

  // const normalizedFilters = {
  //   startDate: startDate || undefined,
  //   endDate: endDate || undefined,
  //   keyword: selectedKeyword || undefined,
  // };

  // const runSearch = () => {
  //   const titleQuery = searchQuery.trim();
  //   const payload = {
  //     ...normalizedFilters,
  //     title: titleQuery || undefined,
  //   };
  //   if (
  //     !payload.title &&
  //     !payload.startDate &&
  //     !payload.endDate &&
  //     !payload.keyword
  //   ) {
  //     return;
  //   }
  //   onSearch(payload);
  // };

  // const handleFilterApply = () => {
  //   runSearch();
  //   setIsFilterOpen(false);
  // };

  // const handleFilterReset = () => {
  //   setStartDate('');
  //   setEndDate('');
  //   setSelectedKeyword('');
  // };

  // const isFilterActive = Boolean(startDate || endDate || selectedKeyword);

  // const handleSearchSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   runSearch();
  // };

  const handleCardClick = (post: Post) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    onViewPost(post.id);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-16 py-12">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium text-gray-900 mb-2">
            당신과 잘 맞는 동행
          </h1>
          <p className="text-base text-gray-600">
            MateTrip AI가 추천하는 최적의 여행 파트너
          </p>
        </div>
        {/* Search Bar and Filters - 로그인한 사용자에게만 표시 */}
        {isLoggedIn && <MatchingSearchBar />}
        {/* {isLoggedIn && (
          <div className="mb-10 flex items-start gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="여행지, 관심사, 여행 스타일로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </form>
            <div className="relative" ref={filterContainerRef}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={`gap-2 px-6 py-3 h-auto ${
                  isFilterActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                Filters
              </Button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl p-5 z-20 space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      여행 기간
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      여행 키워드
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                      {KEYWORD_OPTIONS.map((option) => {
                        const isSelected = selectedKeyword === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setSelectedKeyword(isSelected ? '' : option.value)
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleFilterReset}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      초기화
                    </button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsFilterOpen(false)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        닫기
                      </Button>
                      <Button type="button" onClick={handleFilterApply}>
                        필터 적용
                      </Button>
                    </div>
                  </div>
                </div>
              )}*/}
        {/* </div>
          </div> 
        )} */}
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
          <h2 className="text-xl font-medium text-gray-900 mb-6">
            AI 추천 동행
          </h2>
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
              // : featuredItems.slice(0, 10).reduce(
              //     (acc, post, index) => {
              //       acc[post.id] = generateMockMatchingInfo(index);
              //       return acc;
              //     },
              //     {} as Record<string, MatchingInfo>
              //   )

              onCardClick={handleCardClick}
            />
          )}
        </section>
        {/* Region Categories Section */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">인기 여행지</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {REGION_CATEGORIES.map((region) => (
              <button
                key={region.id}
                onClick={() => onSearch({ location: region.name })}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden hover:shadow-lg transition-all"
              >
                <ImageWithFallback
                  src={region.image}
                  alt={region.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="mb-1">{region.name}</h3>
                  <p className="text-xs text-gray-200">{region.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
