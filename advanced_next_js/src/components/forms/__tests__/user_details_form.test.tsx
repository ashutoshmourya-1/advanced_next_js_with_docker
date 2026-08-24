import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDetailsForm from "@components/forms/user_details_form";
import { insert_user_action } from "@actions/user.actions";
import { useRouter } from "next/navigation";

jest.mock("@actions/user.actions", () => ({
  insert_user_action: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("UserDetailsForm", () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const onOpenChange = jest.fn();
  const refresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      refresh,
    });
  });

  it("should render the form when dialog is open", () => {
    render(
      <UserDetailsForm open={true} onOpenChange={onOpenChange} data={null} />,
    );

    expect(screen.getByText("User Deatils Form")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Enter you name")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Enter you email")).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Enter you phone number"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Submit",
      }),
    ).toBeInTheDocument();
  });

  it("should allow user to enter form values", async () => {
    const user = userEvent.setup();

    render(<UserDetailsForm open={true} onOpenChange={onOpenChange} data={null}/>);

    const name_input = screen.getByPlaceholderText("Enter you name");

    const email_input = screen.getByPlaceholderText("Enter you email");

    const phone_input = screen.getByPlaceholderText("Enter you phone number");

    await user.type(name_input, "Ashutosh");
    await user.type(email_input, "ashutosh@example.com");
    await user.type(phone_input, "9876543210");

    expect(name_input).toHaveValue("Ashutosh");
    expect(email_input).toHaveValue("ashutosh@example.com");
    expect(phone_input).toHaveValue("9876543210");
  });

  it("should submit the form with entered values", async () => {
    const user = userEvent.setup();

    (insert_user_action as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: true,
        next_advance: false,
      },
    });

    render(<UserDetailsForm open={true} onOpenChange={onOpenChange} data={null}/>);

    await user.type(screen.getByPlaceholderText("Enter you name"), "Ashutosh");

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

    await user.click(
      screen.getByRole("button", {
        name: "Submit",
      }),
    );

    await waitFor(() => {
      expect(insert_user_action).toHaveBeenCalledTimes(1);
    });

    expect(insert_user_action).toHaveBeenCalledWith({
      name: "Ashutosh",
      email: "ashutosh@example.com",
      phone_number: "9876543210",
      next_basic: true,
      next_advance: false,
    });
  });

  it("should close dialog and refresh router after successful submission", async () => {
    const user = userEvent.setup();

    (insert_user_action as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: false,
        next_advance: false,
      },
    });

    render(<UserDetailsForm open={true} onOpenChange={onOpenChange} data={null}/>);

    await user.type(screen.getByPlaceholderText("Enter you name"), "Ashutosh");

    await user.type(
      screen.getByPlaceholderText("Enter you email"),
      "ashutosh@example.com",
    );

    await user.type(
      screen.getByPlaceholderText("Enter you phone number"),
      "9876543210",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Submit",
      }),
    );

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("should not close dialog when server action returns an error", async () => {
    const user = userEvent.setup();

    (insert_user_action as jest.Mock).mockResolvedValue({
      ok: false,
      error: {
        message: "User already exists",
      },
    });

    render(<UserDetailsForm open={true} onOpenChange={onOpenChange} data={null}/>);

    await user.type(screen.getByPlaceholderText("Enter you name"), "Ashutosh");

    await user.type(
      screen.getByPlaceholderText("Enter you email"),
      "ashutosh@example.com",
    );

    await user.type(
      screen.getByPlaceholderText("Enter you phone number"),
      "9876543210",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Submit",
      }),
    );

    await waitFor(() => {
      expect(insert_user_action).toHaveBeenCalledTimes(1);
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("should submit next_advance as true when advance checkbox is checked", async () => {
    const user = userEvent.setup();

    (insert_user_action as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: false,
        next_advance: true,
      },
    });

    render(<UserDetailsForm open={true} onOpenChange={onOpenChange} data={null}/>);

    await user.type(screen.getByPlaceholderText("Enter you name"), "Ashutosh");

    await user.type(
      screen.getByPlaceholderText("Enter you email"),
      "ashutosh@example.com",
    );

    await user.type(
      screen.getByPlaceholderText("Enter you phone number"),
      "9876543210",
    );

    const checkboxes = screen.getAllByRole("checkbox");

    await user.click(checkboxes[1]);

    await user.click(
      screen.getByRole("button", {
        name: "Submit",
      }),
    );

    await waitFor(() => {
      expect(insert_user_action).toHaveBeenCalledWith({
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: false,
        next_advance: true,
      });
    });
  });
});
