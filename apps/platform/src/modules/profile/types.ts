export type ProfileUser = {
  createdAt: string;
  email: string;
  id: string;
  image?: string | null;
  name: string;
  updatedAt: string;
};

export type UpdateProfileInput = {
  image?: string | null;
  name: string;
};
