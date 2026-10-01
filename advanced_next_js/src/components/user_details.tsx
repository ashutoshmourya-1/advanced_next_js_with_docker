import { UserDetailsTable } from "@components/tables/index";
import UserRepository from "@repositories/user_repository";
import { type JSX } from "react";

export default async function UserDetails(): Promise<JSX.Element> {
  const user_repository = new UserRepository();

  const res = await user_repository.get_user_details();

  if (!res.ok) {
    return (
      <div className="m-auto text-red-600">
        Error occurred:{" "}
        <span className="text-black">{res.error.message}</span>
      </div>
    );
  }

  return <UserDetailsTable data={res.data} />;
}