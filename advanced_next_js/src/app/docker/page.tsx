export const dynamic = "force-dynamic";

import { DockerFormButton } from "@components/buttons/index";
import { UserDetails } from "@components/index";
import { Suspense, type JSX } from "react";

export default async function Docker(): Promise<JSX.Element> {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black text-2xl font-black">
      <h1>Pls add your details here</h1>
      <span>
        <DockerFormButton />
      </span>
      <h1 className="text-3xl mt-5">
        These details are the fetched directly from postgres:
      </h1>
      <Suspense
        fallback={
          <div className="mt-5 text-xl font-normal">
            Loading user details...
          </div>
        }
      >
        <UserDetails />
      </Suspense>
    </div>
  );
}
