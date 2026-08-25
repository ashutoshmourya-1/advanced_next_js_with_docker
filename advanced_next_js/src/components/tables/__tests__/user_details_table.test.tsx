import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDetailsTable from "../user_details_table";
import type { User } from "@type/user";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { delete_user_action } from "@actions/user.actions";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@actions/user.actions", () => ({
  delete_user_action: jest.fn(),
}));

jest.mock("@components/forms", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UserDetailsForm: ({
    open,
    data,
  }: {
    open: boolean;
    data: User | null;
  }) => (
    <div data-testid="user-details-form">
      {open ? "open" : "closed"}:{data?.name ?? "none"}
    </div>
  ),
}));

const mocked_use_router = useRouter as jest.Mock;
const mocked_delete_user_action = delete_user_action as jest.Mock;

const mock_users: User[] = [
  {
    id: 1,
    name: "Aman Verma",
    email: "aman@test.com",
    phone_number: "9876543210",
    next_basic: true,
    next_advance: false,
  },
  {
    id: 2,
    name: "Priya Singh",
    email: "priya@test.com",
    phone_number: "",
    next_basic: false,
    next_advance: true,
  },
];

// Body rows only (row 0 in getAllByRole("row") is the header row).
function get_body_rows(): HTMLElement[] {
  return screen.getAllByRole("row").slice(1);
}

describe("UserDetailsTable", () => {
  const router_refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mocked_use_router.mockReturnValue({ refresh: router_refresh });
  });

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
    expect(screen.getByText("Actions")).toBeInTheDocument();
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

    expect(screen.getAllByText("Done")).toHaveLength(2);
    expect(screen.getAllByText("In-Progress")).toHaveLength(2);
  });

  it("renders no data rows when the list is empty", () => {
    render(<UserDetailsTable data={[]} />);

    expect(screen.queryByText("Aman Verma")).not.toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("opens the form with the clicked row's data when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(<UserDetailsTable data={mock_users} />);

    const [first_row, second_row] = get_body_rows();
    const edit_button = within(first_row).getAllByRole("button")[0];
    await user.click(edit_button);

    expect(screen.getByTestId("user-details-form")).toHaveTextContent(
      "open:Aman Verma",
    );

    // clicking the second row's edit button swaps in that row's data
    const edit_button_2 = within(second_row).getAllByRole("button")[0];
    await user.click(edit_button_2);

    expect(screen.getByTestId("user-details-form")).toHaveTextContent(
      "open:Priya Singh",
    );
  });

  describe("delete action", () => {
    it("calls delete_user_action with the row's data and shows a success toast", async () => {
      mocked_delete_user_action.mockResolvedValue({
        ok: true,
        data: undefined,
      });
      const user = userEvent.setup();
      render(<UserDetailsTable data={mock_users} />);

      const [first_row] = get_body_rows();
      const delete_button = within(first_row).getAllByRole("button")[1];
      await user.click(delete_button);

      expect(mocked_delete_user_action).toHaveBeenCalledWith(mock_users[0]);
      expect(toast.success).toHaveBeenCalledWith("User deleted sucessfully");
    });

    it("shows an error toast and refreshes the router when delete fails", async () => {
      mocked_delete_user_action.mockResolvedValue({
        ok: false,
        error: { message: "Failed to delete user" },
      });
      const user = userEvent.setup();
      render(<UserDetailsTable data={mock_users} />);

      const [first_row] = get_body_rows();
      const delete_button = within(first_row).getAllByRole("button")[1];
      await user.click(delete_button);

      expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
      expect(router_refresh).toHaveBeenCalledTimes(1);
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});