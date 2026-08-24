import { render, screen } from "@testing-library/react";
import Docker from "../page";
import UserRepository from "@repositories/user_repository";

jest.mock("@repositories/user_repository", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@components/buttons/index", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DockerFormButton: () => (
    <button type="button">Add User</button>
  ),
}));

jest.mock("@components/tables/index", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UserDetailsTable: ({
    data,
  }: {
    data: unknown[];
  }) => (
    <div data-testid="user-details-table">
      Users: {data.length}
    </div>
  ),
}));

describe("Docker page", () => {
  const get_user_details_mock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (
      UserRepository as jest.MockedClass<typeof UserRepository>
    ).mockImplementation(
      () =>
        ({
          get_user_details: get_user_details_mock,
        }) as unknown as UserRepository,
    );
  });

  it("should render user details when repository succeeds", async () => {
    const users = [
      {
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: true,
        next_advance: false,
      },
      {
        name: "Rahul",
        email: "rahul@example.com",
        phone_number: "9876543211",
        next_basic: false,
        next_advance: true,
      },
    ];

    get_user_details_mock.mockResolvedValue({
      ok: true,
      data: users,
    });

    const page = await Docker();

    render(page);

    expect(
      screen.getByText("Pls add your details here"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "These details are the fetched directly from postgres:",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Add User",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("user-details-table"),
    ).toHaveTextContent("Users: 2");

    expect(get_user_details_mock).toHaveBeenCalledTimes(1);
    expect(get_user_details_mock).toHaveBeenCalledWith();
  });

  it("should render error when repository fails", async () => {
    get_user_details_mock.mockResolvedValue({
      ok: false,
      error: {
        message: "Unable to fetch users",
      },
    });

    const page = await Docker();

    render(page);

    expect(
      screen.getByText("Error occured:"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Unable to fetch users"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Pls add your details here"),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByTestId("user-details-table"),
    ).not.toBeInTheDocument();

    expect(get_user_details_mock).toHaveBeenCalledTimes(1);
  });

  it("should not render user table when repository fails", async () => {
    get_user_details_mock.mockResolvedValue({
      ok: false,
      error: {
        message: "Database connection failed",
      },
    });

    const page = await Docker();

    render(page);

    expect(
      screen.getByText("Database connection failed"),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("user-details-table"),
    ).not.toBeInTheDocument();
  });
});