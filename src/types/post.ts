export type PostStatus = '모집중' | '모집완료' | '여행중' | '여행완료';

export interface Post {
  id: string;
  writerId: string;
  createdAt: string;
  title: string;
  status: PostStatus;
  location: string;
  maxParticipants: number;
  keywords: string[];
  startDate: string;
  endDate: string;
}
