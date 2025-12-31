export type UserProfile = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roles?: string[];
};

export type ProfileContextValue = {
  user: UserProfile;
  roleName: string;
  isLoading: boolean;
};
