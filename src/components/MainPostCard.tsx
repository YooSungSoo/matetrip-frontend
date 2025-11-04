import { Calendar, MapPin } from 'lucide-react';
// Temporarily redefine Post type locally to include writerProfile,
// as ../types/post is not provided for modification.
// This should ideally be updated in ../types/post directly.
interface WriterProfile {
  id: string;
  nickname: string;
  gender?: string;
  description?: string;
  intro?: string;
  mbtiTypes?: string;
  travelStyles?: string[];
}

interface Post {
  id: string;
  writerId: string;
  writerProfile: WriterProfile;
  createdAt: string;
  title: string;
  status: '모집중' | '모집완료' | '여행중' | '여행완료';
  location: string;
  maxParticipants: number;
  keywords: string[];
  startDate: string;
  endDate: string;
}
import { translateKeyword } from '../utils/keyword';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface MainPostCardProps {
  post: Post;
  onClick: (postId: string) => void;
}

export function MainPostCard({ post, onClick }: MainPostCardProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '모집중':
        return 'bg-blue-100 text-blue-800';
      case '모집완료':
        return 'bg-gray-100 text-gray-800';
      case '여행중':
        return 'bg-green-100 text-green-800';
      case '여행완료':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer flex flex-col justify-between"
      onClick={() => onClick(post.id)}
    >
      <div>
        <div className="mb-3">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-bold text-gray-900 flex-1 pr-4 break-words">
            {post.title}
          </h3>
          <Badge className={getStatusBadgeClass(post.status)}>{post.status}</Badge>
          </div>
          {/* Display writer's nickname */}
          <p className="text-sm text-gray-600">{post.writerProfile?.nickname || '알 수 없는 사용자'}</p>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{post.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{`${post.startDate} ~ ${post.endDate}`}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {post.keywords.map((keyword) => (
          <Badge key={keyword} variant="secondary">
            {translateKeyword(keyword)}
          </Badge>
        ))}
      </div>
    </Card>
  );
}