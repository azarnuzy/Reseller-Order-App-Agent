import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, updateProfile } from "../profile-api";

export const profileQueryKey = ["profile"] as const;

export const currentUserQueryOptions = queryOptions({
  queryKey: [...profileQueryKey, "current-user"],
  queryFn: getCurrentUser,
  retry: false,
});

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryOptions.queryKey, user);
      void queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}
