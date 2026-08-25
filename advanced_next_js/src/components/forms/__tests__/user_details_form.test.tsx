import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDetailsForm from "../user_details_form";
import {
  insert_user_action,
  update_user_action,
} from "@actions/user.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { User } from "@type/index";

jest.mock("@actions/user.actions", () => ({
  insert_user_action: jest.fn(),
  update_user_action: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mocked_insert_user_action = insert_user_action as jest.Mock;
const mocked_update_user_action = update_user_action as jest.Mock;
const mocked_use_router = useRouter as jest.Mock;

const existing_user: User = {
  id: 7,
  name: "Rohan",
  email: "rohan@example.com",
  phone_number: "9999999999",
  next_advance: true,
  next_basic: false,
};

describe("UserDetailsForm", () => {
  const on_open_change = jest.fn();
  const router_refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mocked_use_router.mockReturnValue({ refresh: router_refresh });
  });

  describe("create mode (data=null)", () => {
    it("renders the form when open", () => {
      render(
        <UserDetailsForm open={true} onOpenChange={on_open_change} data={null} />,
      );

      expect(screen.getByText("User Deatils Form")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter you name"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Submit" }),
      ).toBeInTheDocument();
    });

    it("submits via insert_user_action with id: 0 as the default", async () => {
      mocked_insert_user_action.mockResolvedValue({
        ok: true,
        data: { ...existing_user, id: 3 },
      });

      const user = userEvent.setup();
      render(
        <UserDetailsForm open={true} onOpenChange={on_open_change} data={null} />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter you name"),
        "Ashutosh",
      );
      await user.type(
        screen.getByPlaceholderText("Enter you email"),
        "ashutosh@example.com",
      );
      await user.type(
        screen.getByPlaceholderText("Enter you phone number"),
        "9876543210",
      );

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mocked_insert_user_action).toHaveBeenCalledWith({
          id: 0,
          name: "Ashutosh",
          email: "ashutosh@example.com",
          phone_number: "9876543210",
          next_basic: true,
          next_advance: false,
        });
      });

      expect(mocked_update_user_action).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(on_open_change).toHaveBeenCalledWith(false);
        expect(router_refresh).toHaveBeenCalledTimes(1);
      });
    });

    it("shows an error toast and keeps the dialog open when insert fails", async () => {
      mocked_insert_user_action.mockResolvedValue({
        ok: false,
        error: { message: "Email already exists" },
      });

      const user = userEvent.setup();
      render(
        <UserDetailsForm open={true} onOpenChange={on_open_change} data={null} />,
      );

      await user.type(
        screen.getByPlaceholderText("Enter you name"),
        "Ashutosh",
      );
      await user.type(
        screen.getByPlaceholderText("Enter you email"),
        "ashutosh@example.com",
      );
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Email already exists");
      });

      expect(on_open_change).not.toHaveBeenCalledWith(false);
      expect(router_refresh).not.toHaveBeenCalled();
    });
  });

  describe("edit mode (data=<existing user>)", () => {
    it("pre-fills the fields with the existing user's data", () => {
      render(
        <UserDetailsForm
          open={true}
          onOpenChange={on_open_change}
          data={existing_user}
        />,
      );

      expect(screen.getByPlaceholderText("Enter you name")).toHaveValue(
        existing_user.name,
      );
      expect(screen.getByPlaceholderText("Enter you email")).toHaveValue(
        existing_user.email,
      );
      expect(
        screen.getByPlaceholderText("Enter you phone number"),
      ).toHaveValue(existing_user.phone_number);
    });

    it("submits via update_user_action (not insert) with the existing id", async () => {
      mocked_update_user_action.mockResolvedValue({
        ok: true,
        data: existing_user,
      });

      const user = userEvent.setup();
      render(
        <UserDetailsForm
          open={true}
          onOpenChange={on_open_change}
          data={existing_user}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(mocked_update_user_action).toHaveBeenCalledWith({
          id: existing_user.id,
          name: existing_user.name,
          email: existing_user.email,
          phone_number: existing_user.phone_number,
          next_advance: existing_user.next_advance,
          next_basic: existing_user.next_basic,
        });
      });

      expect(mocked_insert_user_action).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(on_open_change).toHaveBeenCalledWith(false);
        expect(router_refresh).toHaveBeenCalledTimes(1);
      });
    });

    it("shows an error toast and keeps the dialog open when update fails", async () => {
      mocked_update_user_action.mockResolvedValue({
        ok: false,
        error: { message: "User not found" },
      });

      const user = userEvent.setup();
      render(
        <UserDetailsForm
          open={true}
          onOpenChange={on_open_change}
          data={existing_user}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("User not found");
      });

      expect(on_open_change).not.toHaveBeenCalledWith(false);
      expect(router_refresh).not.toHaveBeenCalled();
    });
  });
});