import { useState } from 'react';
import { Search, Calendar, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface MainPageProps {
  onSearch: (params: { date?: string; location?: string }) => void;
  onViewPost: (postId: number) => void;
  onUserClick: (userId: number) => void;
}

// TODO: 백엔드 연동 시 API에서 추천 사용자 목록 가져오기
// const RECOMMENDED_USERS = await fetchRecommendedUsers();
const RECOMMENDED_USERS = [
  {
    id: 1,
    name: '바다조아',
    avatar: '',
    travelStyle: ['힐링', '사진', '맛집투어'],
    matchRate: 95,
  },
  {
    id: 2,
    name: '산악인',
    avatar: '',
    travelStyle: ['액티브', '등산', '자연'],
    matchRate: 88,
  },
  {
    id: 3,
    name: '도시탐험가',
    avatar: '',
    travelStyle: ['카페', '쇼핑', '핫플'],
    matchRate: 82,
  },
];

const REGION_CATEGORIES = [
  {
    id: 1,
    name: '제주도',
    image:
      'https://images.unsplash.com/photo-1614088459293-5669fadc3448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NjE4NjQwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '힐링 여행의 성지',
  },
  {
    id: 2,
    name: '부산',
    image:
      'https://images.unsplash.com/photo-1665231342828-229205867d94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFjaCUyMHBhcmFkaXNlfGVufDF8fHx8MTc2MTg4Mzg2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '바다와 도시의 조화',
  },
  {
    id: 3,
    name: '서울',
    image:
      'https://images.unsplash.com/photo-1597552661064-af143a5f3bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW91bCUyMGtvcmVhfGVufDF8fHx8MTc2MTk4MjQzNHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '트렌디한 도심 여행',
  },
  {
    id: 4,
    name: '경주',
    image:
      'https://images.unsplash.com/photo-1668850443435-c01eec56c4e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxneWVvbmdqdSUyMGtvcmVhfGVufDF8fHx8MTc2MTk4MjQzNHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '역사 문화 탐방',
  },
  {
    id: 5,
    name: '강릉',
    image:
      'https://images.unsplash.com/photo-1684042229029-8a899193a8e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW5nbmV1bmclMjBrb3JlYXxlbnwxfHx8fDE3NjE5ODI0MzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '동해안의 낭만',
  },
  {
    id: 6,
    name: '전주',
    image:
      'https://images.unsplash.com/photo-1520645521318-f03a712f0e67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwdHJhdmVsfGVufDF8fHx8MTc2MTkxMjEzMXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '맛집 투어의 메카',
  },
];

export function MainPage({ onSearch, onViewPost, onUserClick }: MainPageProps) {
  const [searchDate, setSearchDate] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch({ date: searchDate, location: searchLocation });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section with Search */}
      <div className="text-center mb-12">
        {/* Search Box */}
        <Card className="max-w-3xl mx-auto p-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="date"
                  aria-label="여행 일정"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  aria-label="여행지"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
              >
                <Search className="w-4 h-4" />
                검색
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Recommended Users Section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-gray-900">당신과 잘 맞는 동행</h2>
          <Badge variant="secondary" className="ml-2">
            AI 추천
          </Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {RECOMMENDED_USERS.map((user) => (
            <Card
              key={user.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                onUserClick(user.id);
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-1">{user.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-purple-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>{user.matchRate}% 매칭</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.travelStyle.map((style) => (
                  <Badge key={style} variant="secondary" className="text-xs">
                    {style}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Region Categories */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-gray-900">인기 여행지</h2>
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
  );
}
