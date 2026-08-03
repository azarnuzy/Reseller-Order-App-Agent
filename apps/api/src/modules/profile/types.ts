export type ProfileUser = {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  image: string | null;
  name: string;
  updatedAt: Date;
};

export type ProfileResponse = {
  user: ProfileUser;
};
