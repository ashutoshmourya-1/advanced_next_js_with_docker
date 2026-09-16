import { render, screen } from "@testing-library/react";
import Docker from "../page";

jest.mock("@components/buttons/index", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DockerFormButton: () => (
    <button type="button">Click Here To Fill Details</button>
  ),
}));

jest.mock("@components/index", () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  UserDetails: () => (
    <div data-testid="user-details">User Details Mock</div>
  ),
}));

describe("Docker page", () => {
  it("should render page headings, form button, and user details component", async () => {
    const page = await Docker();

    render(page);

    expect(
      screen.getByText("Pls add your details here"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Click Here To Fill Details",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "These details are the fetched directly from postgres:",
      ),
    ).toBeInTheDocument();

    expect(screen.getByTestId("user-details")).toBeInTheDocument();
  });
});