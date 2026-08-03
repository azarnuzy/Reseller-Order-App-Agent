export type ProfileUser = {
  createdAt: Date;
  email: string;
  id: string;
  image: string | null;
  name: string;
  updatedAt: Date;
};

export type ProfileResponse = {
  user: ProfileUser;
};
