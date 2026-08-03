import { createApiClient, fetchCurrentUser, updateCurrentUserProfile } from "@repo/api-client";
import type { ProfileUser, UpdateProfileInput } from "./types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const apiClient = createApiClient(apiBaseUrl);

export async function getCurrentUser() {
  return (await fetchCurrentUser(apiClient)) as ProfileUser;
}

export async function updateProfile(input: UpdateProfileInput) {
  return (await updateCurrentUserProfile(apiClient, input)) as ProfileUser;
}
