import { useTranslation } from "@repo/i18n";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlatformAppShell } from "../modules/app-shell/app-shell";
import { meQueryOptions } from "../modules/auth/hooks/use-auth";
import { UnauthorizedError } from "../modules/auth/auth-api";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw redirect({ to: "/login" });
      }

      throw error;
    }
  },
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();

  return (
    <PlatformAppShell>
      <section className="mx-auto grid max-w-2xl gap-3 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">{t("home.eyebrow")}</p>
        <h1 className="text-3xl font-semibold text-balance">{t("home.title")}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{t("home.description")}</p>
      </section>
    </PlatformAppShell>
  );
}
