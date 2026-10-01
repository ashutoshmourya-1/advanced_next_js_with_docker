import { render, screen } from "@testing-library/react";
import UserDetails from "../user_details";
import UserRepository from "@repositories/user_repository";
import type { User } from "@type/user";

jest.mock("@repositories/user_repository", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@components/tables/index", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UserDetailsTable: ({
    data,
  }: {
    data: User[];
  }) => (
    <div data-testid="user-details-table">
      Users: {data.length}
    </div>
  ),
}));

describe("UserDetails component", () => {
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

  it("renders UserDetailsTable with data when repository succeeds", async () => {
    const mock_users: User[] = [
      {
        id: 1,
        name: "Ashutosh",
        email: "ashutosh@example.com",
        phone_number: "9876543210",
        next_basic: true,
        next_advance: false,
      },
      {
        id: 2,
        name: "Rahul",
        email: "rahul@example.com",
        phone_number: "9876543211",
        next_basic: false,
        next_advance: true,
      },
    ];

    get_user_details_mock.mockResolvedValue({
      ok: true,
      data: mock_users,
    });

    const element = await UserDetails();
    render(element);

    expect(
      screen.getByTestId("user-details-table"),
    ).toHaveTextContent("Users: 2");
    expect(get_user_details_mock).toHaveBeenCalledTimes(1);
  });

  it("renders error message when repository returns error", async () => {
    get_user_details_mock.mockResolvedValue({
      ok: false,
      error: {
        message: "Unable to fetch users from database",
      },
    });

    const element = await UserDetails();
    render(element);

    expect(screen.getByText(/Error occurred:/i)).toBeInTheDocument();
    expect(
      screen.getByText("Unable to fetch users from database"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("user-details-table"),
    ).not.toBeInTheDocument();
    expect(get_user_details_mock).toHaveBeenCalledTimes(1);
  });
});

