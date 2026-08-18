"use client";

import { type JSX } from "react";
import { useForm } from "@tanstack/react-form";
import { Dialog, DialogContent, DialogHeader } from "@components/ui/dialog";
import { Input } from "@base-ui/react";
import { Label } from "@components/ui/label";
import { Checkbox } from "@components/ui/checkbox";
import { Button } from "@components/ui/button";
import { insert_user_action } from "@actions/user.actions";
import { useRouter } from "next/navigation";

export default function UserDetailsForm({
  onOpenChange,
  open,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      next_advance: false,
      next_basic: false,
    },
    onSubmit: async ({ value }): Promise<void> => {
      const response = await insert_user_action(value);
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      onOpenChange(false);
      form.reset();
      router.refresh();
    },
  });
  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader className="font-extrabold text-4xl text-center">
            User Deatils Form
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="p-10"
          >
            <div className="flex flex-col gap-10 mb-8 md:flex-row">
              <form.Field name="name">
                {(field) => (
                  <div className="flex gap-2">
                    <Label htmlFor={field.name} className="font-bold">
                      Name:{" "}
                    </Label>
                    <Input
                      placeholder="Enter you name"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="p-3 font-semibold"
                    />
                    {field.state.meta.errors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <div className="flex gap-2">
                    <Label htmlFor={field.name} className="font-bold">
                      Email:{" "}
                    </Label>
                    <Input
                      type="email"
                      placeholder="Enter you email"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="p-3 font-semibold"
                    />
                    {field.state.meta.errors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>
            <div className="mb-8">
              <form.Field name="phone_number">
                {(field) => (
                  <div className="flex gap-2">
                    <Label htmlFor={field.name} className="font-bold">
                      Phone Number:{" "}
                    </Label>
                    <Input
                      type="tel"
                      placeholder="Enter you phone number"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="p-3 font-semibold"
                    />
                    {field.state.meta.errors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>
            <div className="flex flex-col gap-10 mb-4 md:flex-row">
              <form.Field name="next_basic">
                {(field) => (
                  <div className="flex gap-2">
                    <Label htmlFor={field.name} className="font-bold">
                      Next Basic Completed:{" "}
                    </Label>
                    <Checkbox
                      name={field.name}
                      className="p-3"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    {field.state.meta.errors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
              </form.Field>
              <form.Field name="next_advance">
                {(field) => (
                  <div className="flex gap-2">
                    <Label htmlFor={field.name} className="font-bold">
                      Next Advance Completed:{" "}
                    </Label>
                    <Checkbox
                      name={field.name}
                      className="p-3"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                    {field.state.meta.errors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>
            <div className={"flex justify-end items-end"}>
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
