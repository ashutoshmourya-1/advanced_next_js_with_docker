"use client";

import { type User } from "@type/user";
import { type JSX } from "react";
import {
  useTable,
  tableFeatures,
  createColumnHelper,
} from "@tanstack/react-table";

const features = tableFeatures({});

const column_helper = createColumnHelper<typeof features, User>();

const columns = column_helper.columns([
  column_helper.accessor("name", {
    header: "Name",
    cell: (info) => info.getValue(),
  }),
  column_helper.accessor("email", {
    header: "Email",
    cell: (info) => <i>{info.getValue()}</i>,
  }),
  column_helper.accessor("next_basic", {
    header: "Next Js Basic Concepts Completed",
    cell: (info) => {
      if (info.renderValue() === true) {
        return <i className="text-green-600 bg-green-300 rounded-2xl p-2">Done</i>;
      }
      return (
        <i className="text-amber-600 bg-amber-300 rounded-2xl p-2">In-Progress</i>
      );
    },
  }),
  column_helper.accessor("next_advance", {
    header: "Next Js Advance Concepts Completed",
    cell: (info) => {
      if (info.getValue() === true) {
        return <i className="text-green-600 bg-green-300 rounded-2xl p-2">Done</i>;
      }
      return (
        <i className="text-amber-600 bg-amber-300 rounded-2xl p-2">In-Progress</i>
      );
    },
  }),
]);
export default function UserDetailsTable({
  data,
}: {
  data: User[];
}): JSX.Element {
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
    </div>
  );
}
