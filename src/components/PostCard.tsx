import { MapPin, Calendar, Users, Thermometer } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Post {
  id: number;
  title: string;
  author: string;
  authorTemp: number;
  image: string;
  date: string;
  location: string;
  participants: number;
  maxParticipants: number;
  keywords: string[];
  status: '모집중' | '완료';
  description: string;
}

interface PostCardProps {
  post: Post;
  onJoin: (postId: number) => void;
}

export function PostCard({ post, onJoin }: PostCardProps) {
  const getTempColor = (temp: number) => {
    if (temp >= 38) return 'text-green-600';
    if (temp >= 37) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <Badge 
          className={`absolute top-3 right-3 ${
            post.status === '모집중' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {post.status}
        </Badge>
      </div>

      <div className="p-5">
        <h3 className="text-gray-900 mb-2 line-clamp-1">{post.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{post.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{post.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{post.participants}/{post.maxParticipants}명</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {post.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="text-xs">
              {keyword}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
            <div>
              <div className="text-sm text-gray-900">{post.author}</div>
              <div className={`text-xs flex items-center gap-1 ${getTempColor(post.authorTemp)}`}>
                <Thermometer className="w-3 h-3" />
                {post.authorTemp}°C
              </div>
            </div>
          </div>

          {post.status === '모집중' && (
            <Button 
              size="sm" 
              onClick={() => onJoin(post.id)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              참여하기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
