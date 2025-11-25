import { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import client from '../api/client';
import type {
  MatchCandidateDto,
  MatchingInfo,
  MatchRecruitingPostDto,
} from '../types/matching';
import {
  KEYWORD_TYPES,
  type KeywordKey,
  type KeywordValue,
} from '../utils/keyword';
import type { MatchingResult } from '../types/matchSearch';

interface MatchingSearchBarProps {
  onSearchSuccess: (
    results: MatchingResult[],
    query: {
      location?: string;
      startDate?: string;
      endDate?: string;
      keyword?: KeywordValue[];
    }
  ) => void;
}

const KEYWORD_ENTRIES = Object.entries(KEYWORD_TYPES).map(([key, label]) => ({
  key: key as KeywordKey,
  label,
}));

export function MatchingSearchBar({ onSearchSuccess }: MatchingSearchBarProps) {
  const [locationQuery, setLocationQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedKeywords, setSelectedKeyword] = useState<KeywordValue[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasFilters = Boolean(
    startDate || endDate || locationQuery || selectedKeywords.length
  );

  const buildMatchingInfo = (candidate: MatchCandidateDto): MatchingInfo => ({
    score: Math.round((candidate.score ?? 0) * 100),
    vectorScore:
      candidate.vectorScore !== undefined
        ? Math.round(candidate.vectorScore * 100)
        : undefined,
    tendency: candidate.overlappingTendencies?.join(', '),
    style: candidate.overlappingTravelStyles?.join(', '),
  });

  const convertCandidateToResult = (
    candidate: MatchCandidateDto,
    post?: MatchRecruitingPostDto | null
  ): MatchingResult | null => {
    if (!post) {
      return null;
    }

    return {
      post,
      matchingInfo: buildMatchingInfo(candidate),
      writerProfileImageId:
        candidate.profile?.profileImageId ?? candidate.profileImageId ?? null,
      writerNickname:
        candidate.profile?.nickname ?? post.writer?.profile?.nickname ?? null,
    };
  };

  const executeMatchingSearch = async () => {
    const params: Record<string, unknown> = {};

    if (locationQuery.trim()) {
      params.locationQuery = locationQuery.trim();
    }
    if (startDate) {
      params.startDate = startDate;
    }
    if (endDate) {
      params.endDate = endDate;
    }
    if (selectedKeywords.length > 0) {
      params.keywords = selectedKeywords;
    }

    if (!Object.keys(params).length) {
      setError('검색 조건을 입력해주세요.');
      return;
    }

    if (isSearching) {
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const response = await client.get<
        MatchCandidateDto[] | { matches?: MatchCandidateDto[] }
      >('/profile/matching/detailsearch', {
        params: {
          ...params,
        },
        paramsSerializer: (requestParams) => {
          const usp = new URLSearchParams();
          Object.entries(requestParams).forEach(([key, value]) => {
            if (value === undefined || value === null) {
              return;
            }
            if (Array.isArray(value)) {
              value.forEach((item) => {
                if (item !== undefined && item !== null) {
                  usp.append(key, String(item));
                }
              });
            } else {
              usp.append(key, String(value));
            }
          });
          return usp.toString();
        },
      });

      const rawData = response.data;
      const candidates: MatchCandidateDto[] = Array.isArray(rawData)
        ? (rawData as MatchCandidateDto[])
        : (rawData?.matches ?? []);
      const filters = {
        location: locationQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        keyword: selectedKeywords.length ? selectedKeywords : undefined,
      };

      const normalized: MatchingResult[] = [];

      candidates.forEach((candidate) => {
        const posts: MatchRecruitingPostDto[] = candidate.recruitingPosts ?? [];
        posts.forEach((recruitingPost) => {
          const converted = convertCandidateToResult(candidate, recruitingPost);
          if (converted) {
            normalized.push(converted);
          }
        });
      });

      if (!normalized.length) {
        setError('조건에 맞는 추천 동행을 찾지 못했습니다.');
        onSearchSuccess([], filters);
        return;
      }

      onSearchSuccess(normalized, filters);
    } catch (err) {
      console.error('매칭 검색 실패:', err);
      setError('맞춤 검색 결과를 불러오지 못했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    executeMatchingSearch();
  };

  const handleKeywordSelect = (keyword: KeywordValue) => {
    setSelectedKeyword((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedKeyword([]);
  };

  return (
    <div ref={containerRef}>
      <div className="flex items-center gap-3">
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="여행지, 관심사, 여행 스타일로 검색..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-blue-200 focus:ring-blue-500 h-auto"
            />
          </div>
        </form>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`gap-2 px-6 py-3 h-auto border-gray-200 ${
              hasFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : ''
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </Button>
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-96 rounded-2xl border border-gray-200 bg-white shadow-xl p-5 z-50 space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  여행 기간
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-200"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  여행 키워드
                </h4>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {KEYWORD_ENTRIES.map((keyword) => {
                    const isSelected = selectedKeywords.includes(keyword.label);
                    return (
                      <button
                        key={keyword.key}
                        type="button"
                        onClick={() => handleKeywordSelect(keyword.label)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {keyword.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  초기화
                </button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsFilterOpen(false)}
                    className="text-gray-600"
                  >
                    닫기
                  </Button>
                  <Button type="button" onClick={executeMatchingSearch}>
                    적용
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
