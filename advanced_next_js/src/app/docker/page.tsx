export const dynamic = "force-dynamic";

import { DockerFormButton } from "@components/buttons/index";
import { UserDetailsTable } from "@components/tables/index";
import UserRepository from "@repositories/user_repository";
import { type JSX } from "react";

export default async function Docker(): Promise<JSX.Element> {
  const user_repository = new UserRepository();
  const res = await user_repository.get_user_details();
  if (!res.ok) {
    return (
      <div className="text-red-600 m-auto">
        Error occured: <span className="text-black">{res.error1.message}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black text-2xl font-black">
      <h1>Hello from docker</h1>
      <h1>Pls add your details here</h1>
      <span>
        <DockerFormButton />
      </span>
      <h1 className="text-3xl mt-5">
        These details are the filled data from postgres:
      </h1>
      <UserDetailsTable data={res.data} />
    </div>
  );
}
