import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/signout-button";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Catat Duit</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {session.user.email}
      </p>
      <div className="flex gap-2">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      </div>
      <SignOutButton />
    </main>
  );
}
