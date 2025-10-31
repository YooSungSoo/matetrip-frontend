import { useState } from 'react';
import { PostCard } from './PostCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface FeedProps {
  onJoinWorkspace: (postId: number) => void;
}

const MOCK_POSTS = [
  {
    id: 1,
    title: '제주도 힐링 여행 같이 가실 분 🌊',
    author: '여행러버',
    authorTemp: 36.5,
    image: 'https://images.unsplash.com/photo-1614088459293-5669fadc3448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NjE4NjQwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025.11.15 - 11.18',
    location: '제주도',
    participants: 3,
    maxParticipants: 4,
    keywords: ['힐링', '자연', '맛집투어'],
    status: '모집중' as const,
    description: '제주도에서 여유롭게 힐링하면서 맛집도 탐방할 분들 구합니다!',
  },
  {
    id: 2,
    title: '설악산 단풍 트레킹 🍁',
    author: '산악인',
    authorTemp: 38.2,
    image: 'https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZXxlbnwxfHx8fDE3NjE4NjkyNjh8MA&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025.11.05 - 11.07',
    location: '강원도 속초',
    participants: 5,
    maxParticipants: 6,
    keywords: ['등산', '단풍', '액티브'],
    status: '모집중' as const,
    description: '가을 단풍이 절정인 설악산을 함께 오르실 분들!',
  },
  {
    id: 3,
    title: '부산 해운대 바다 여행 🏖️',
    author: '바다조아',
    authorTemp: 37.8,
    image: 'https://images.unsplash.com/photo-1665231342828-229205867d94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHBhcmFkaXNlfGVufDF8fHx8MTc2MTg4Mzg2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025.11.20 - 11.22',
    location: '부산',
    participants: 2,
    maxParticipants: 4,
    keywords: ['해변', '사진', '야경'],
    status: '모집중' as const,
    description: '부산 해운대에서 바다 보면서 힐링! 야경 사진도 찍고 맛집도 가요',
  },
  {
    id: 4,
    title: '서울 핫플 탐방 투어 🏙️',
    author: '서울러',
    authorTemp: 36.9,
    image: 'https://images.unsplash.com/photo-1520645521318-f03a712f0e67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwdHJhdmVsfGVufDF8fHx8MTc2MTkxMjEzMXww&ixlib=rb-4.1.0&q=80&w=1080',
    date: '2025.11.10 - 11.11',
    location: '서울',
    participants: 4,
    maxParticipants: 4,
    keywords: ['카페', '쇼핑', '핫플'],
    status: '완료' as const,
    description: '성수동, 연남동 등 서울의 핫플레이스를 함께 다녀왔습니다',
  },
];

export function Feed({ onJoinWorkspace }: FeedProps) {
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">함께 떠나는 여행</h1>
        <p className="text-gray-600">새로운 동행과 함께 특별한 여행을 계획해보세요</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="여행지, 키워드로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            필터
          </Button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 rounded-md transition-colors ${
                sortBy === 'latest' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-md transition-colors ${
                sortBy === 'popular' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              인기순
            </button>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 whitespace-nowrap">전체</Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 whitespace-nowrap">힐링</Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 whitespace-nowrap">액티브</Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 whitespace-nowrap">맛집투어</Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 whitespace-nowrap">사진</Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-50 whitespace-nowrap">자연</Badge>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_POSTS.map((post) => (
          <PostCard key={post.id} post={post} onJoin={onJoinWorkspace} />
        ))}
      </div>
    </div>
  );
}
