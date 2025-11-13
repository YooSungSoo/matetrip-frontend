export interface UserProfile {
  id: string;
  nickname: string;
  gender: string;
  description: string;
  intro: string;
  mbtiTypes: string;
  travelStyles: string[];
  tendency: string[];
  profileImageId?: string;
  mannerTemperature?: number;
  mannerTemp?: number;
}

export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}
