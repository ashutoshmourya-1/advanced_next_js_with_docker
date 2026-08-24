import { render, screen } from "@testing-library/react";
import { UserDetailsTable } from "@components/tables/index";
import type { User } from "@type/user";

const mock_users: User[] = [
  {
    id: 10,
    name: "Aman Verma",
    email: "aman@test.com",
    phone_number: "9876543210",
    next_basic: true,
    next_advance: false,
  },
  {
    id: 11,
    name: "Priya Singh",
    email: "priya@test.com",
    phone_number: "",
    next_basic: false,
    next_advance: true,
  },
];

describe("UserDetailsTable", () => {
  it("renders all column headers", () => {
    render(<UserDetailsTable data={mock_users} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone Number")).toBeInTheDocument();
    expect(
      screen.getByText("Next Js Basic Concepts Completed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Next Js Advance Concepts Completed"),
    ).toBeInTheDocument();
  });

  it("renders one row per user with the correct values", () => {
    render(<UserDetailsTable data={mock_users} />);

    expect(screen.getByText("Aman Verma")).toBeInTheDocument();
    expect(screen.getByText("aman@test.com")).toBeInTheDocument();
    expect(screen.getByText("Priya Singh")).toBeInTheDocument();
    expect(screen.getByText("priya@test.com")).toBeInTheDocument();
  });

  it("shows a '-' fallback when phone number is missing", () => {
    render(<UserDetailsTable data={mock_users} />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows Done / In-Progress badges based on completion flags", () => {
    render(<UserDetailsTable data={mock_users} />);

    // Aman: next_basic Done, next_advance In-Progress
    // Priya: next_basic In-Progress, next_advance Done
    expect(screen.getAllByText("Done")).toHaveLength(2);
    expect(screen.getAllByText("In-Progress")).toHaveLength(2);
  });

  it("renders no data rows when the list is empty", () => {
    render(<UserDetailsTable data={[]} />);

    expect(screen.queryByText("Aman Verma")).not.toBeInTheDocument();
    // headers should still render
    expect(screen.getByText("Name")).toBeInTheDocument();
  });
});
