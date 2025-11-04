import { Calendar, MapPin, Users, Thermometer } from 'lucide-react';
import { type BadgeProps, Badge } from './ui/badge';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { translateKeyword } from '../utils/keyword';

// Define WriterProfile interface based on the new API response
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
  id: string; // Changed from number to string
  writerId: string; // Added
  writerProfile: WriterProfile; // Added
  createdAt: string; // Added
  title: string;
  // author: string; // Removed, replaced by writerProfile.nickname
  // authorTemp?: number; // Removed, not in new API response
  image?: string; // Made optional, as per SearchResults.tsx passing a fallback
  // date: string; // Removed, replaced by startDate and endDate
  startDate: string; // Added
  endDate: string; // Added
  location: string;
  participants?: number; // Made optional, not in sample JSON
  maxParticipants: number;
  keywords: string[];
  status: '모집중' | '모집완료' | '여행중' | '여행완료'; // Expanded based on MainPostCard's getStatusBadgeClass
  description?: string; // Made optional, not in sample JSON
  matchRate?: number;
}

interface PostCardProps {
  post: Post;
  onClick: (postId: string) => void;
  image?: string;
}

export function PostCard({ post, onClick, image }: PostCardProps) {
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(post.id)}
    >
      <div className="relative h-48">
        <ImageWithFallback
          src={image || post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <Badge
          className={`absolute top-3 right-3 ${
            post.status === '모집중' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          {post.status}
        </Badge>
      </div>

      <div className="p-4">
        <h3 className="text-gray-900 mb-2 line-clamp-1">{post.title}</h3>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
          {/* Display writer's nickname */}
          <span className="text-sm text-gray-600">{post.writerProfile?.nickname || '알 수 없는 사용자'}</span>
          {/* authorTemp and its display are removed as they are not in the new API response */}
        </div>

        <div className="space-y-2 mb-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {/* Display startDate and endDate instead of a single 'date' field */}
            <span>{`${post.startDate} ~ ${post.endDate}`}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{post.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {post.participants !== undefined ? `${post.participants} / ` : ''}{post.maxParticipants}명
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {post.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="text-xs">
              {translateKeyword(keyword)}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
