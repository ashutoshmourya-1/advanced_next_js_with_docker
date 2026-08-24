"use client";

import { type User } from "@type/user";
import { useState, type JSX } from "react";
import {
  useTable,
  tableFeatures,
  createColumnHelper,
} from "@tanstack/react-table";
import { Button } from "@components/ui/button";
import { Edit2, Trash } from "lucide-react";
import { UserDetailsForm } from "@components/forms";
import { toast } from "sonner";
import { delete_user_action } from "@actions/user.actions";
import { useRouter } from "next/navigation";

const features = tableFeatures({});

const column_helper = createColumnHelper<typeof features, User>();

export default function UserDetailsTable({
  data,
}: {
  data: User[];
}): JSX.Element {
  const [open, set_open] = useState<boolean>(false);
  const [user_data, set_user_data] = useState<User | null>(null);
  const router = useRouter();

  const columns = column_helper.columns([
    column_helper.accessor("name", {
      header: "Name",
      cell: (info) => info.getValue(),
    }),
    column_helper.accessor("email", {
      header: "Email",
      cell: (info) => <i>{info.getValue()}</i>,
    }),
    column_helper.accessor("phone_number", {
      header: "Phone Number",
      cell: (info) => <strong>{info.row.original.phone_number || "-"}</strong>,
    }),
    column_helper.accessor("next_basic", {
      header: "Next Js Basic Concepts Completed",
      cell: (info) => {
        if (info.renderValue() === true) {
          return (
            <i className="text-green-600 bg-green-300 rounded-2xl p-2">Done</i>
          );
        }
        return (
          <i className="text-amber-600 bg-amber-300 rounded-2xl p-2">
            In-Progress
          </i>
        );
      },
    }),
    column_helper.accessor("next_advance", {
      header: "Next Js Advance Concepts Completed",
      cell: (info) => {
        if (info.getValue() === true) {
          return (
            <i className="text-green-600 bg-green-300 rounded-2xl p-2">Done</i>
          );
        }
        return (
          <i className="text-amber-600 bg-amber-300 rounded-2xl p-2">
            In-Progress
          </i>
        );
      },
    }),
    column_helper.accessor("id", {
      header: "Actions",
      cell: (info) => (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={"ghost"}
            onClick={() => {
              set_open(true);
              set_user_data(info.row.original);
            }}
          >
            <Edit2 className="size-4 text-amber-400"/>
          </Button>

          <Button
            type="button"
            variant={"ghost"}
            onClick={async () => {
              const res = await delete_user_action(info.row.original);
              if (!res.ok) {
                toast.error(res.error.message);
                router.refresh();
                return;
              }
              toast.success("User deleted sucessfully");
            }}
          >
            <Trash className="size-4 text-red-400"/>
          </Button>
        </div>
      ),
    }),
  ]);
  const table = useTable(
    {
      key: "user-details",
      features,
      columns,
      data,
    },
    (state) => state,
  );
  return (
    <div className="w-1/2 mx-auto overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-zinc-200 px-4 py-3 text-start font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-900/50"
            >
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-zinc-600 dark:text-zinc-400"
                >
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-zinc-100 dark:bg-zinc-900">
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-t border-zinc-200 px-4 py-3 text-start font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender footer={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
      <UserDetailsForm onOpenChange={set_open} open={open} data={user_data} />
    </div>
  );
}
