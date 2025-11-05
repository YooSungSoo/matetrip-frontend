export interface UserProfile {
  id: string;
  nickname: string;
  gender: string;
  intro: string;
  description: string;
  travelStyles: string[];
  travelTendency: string[];
  mbtiTypes: string;
  profileImage?: string; // 프로필 이미지는 응답에 없지만, 확장성을 위해 추가
}

export interface Requester {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface Participation {
  id: string;
  status: '대기중' | '승인' | '거절';
  requester: Requester;
  requestedAt: string;
}
