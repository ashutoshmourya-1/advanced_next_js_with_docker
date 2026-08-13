"use client";
import { UserDetailsForm } from "@components/forms/index";
import { Button } from "@components/ui/button";
import { useState, type JSX } from "react";

export default function DockerFormButton(): JSX.Element {
  const [open, set_open] = useState<boolean>(false);
  return (
    <div>
      <Button onClick={() => set_open(!open)}>
        Click Here To Fill Details
      </Button>
      <UserDetailsForm open={open} onOpenChange={set_open} />
    </div>
  );
}
