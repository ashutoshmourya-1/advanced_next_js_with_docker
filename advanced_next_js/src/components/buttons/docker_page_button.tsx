"use client";
import { Button } from "@components/ui/button";
import { useRouter } from "next/navigation";
import { type JSX } from "react";

export default function DockerPageButton(): JSX.Element {
  const router = useRouter();
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans bg-cyan-100/50 text-4xl">
      <div className="mb-8">Hello from Docker with Advanced Next Js</div>
      <Button onClick={() => router.push("/docker")} className={"p-10 text-3xl bg-cyan-700 hover:bg-cyan-900"}>
        Pls go to this page to add how much you have learnet
      </Button>
    </div>
  );
}
