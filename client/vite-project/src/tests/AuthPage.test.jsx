import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "../components/AuthPage";

describe("AuthPage login", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  test("sends email and password as JSON and authenticates on success", async () => {
    const user = userEvent.setup();
    const onAuthenticated = jest.fn();
    const userData = { id: "123", name: "Test Customer", email: "customer@example.com" };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: "session-token", user: userData }),
    });
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getAllByRole("button", { name: "Login" })[1]);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "customer@example.com", password: "correct-password" }),
      }
    );
    expect(localStorage.getItem("feedback-auth-token")).toBe("session-token");
    expect(onAuthenticated).toHaveBeenCalledWith(userData);
  });

  test("displays the API error for invalid credentials", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Email or password is incorrect" }),
    });
    render(<AuthPage onAuthenticated={jest.fn()} />);

    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getAllByRole("button", { name: "Login" })[1]);

    expect(await screen.findByText("Email or password is incorrect")).toBeInTheDocument();
  });

  test("explains how to resolve a backend network failure", async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AuthPage onAuthenticated={jest.fn()} />);

    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getAllByRole("button", { name: "Login" })[1]);

    expect(await screen.findByText(
      "Unable to reach the API at http://localhost:5000. Make sure the backend is running and VITE_API_URL is correct."
    )).toBeInTheDocument();
  });

  test("can show and hide the password without changing its value", async () => {
    const user = userEvent.setup();
    render(<AuthPage onAuthenticated={jest.fn()} />);
    const password = screen.getByLabelText("Password");

    await user.type(password, "correct-password");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("correct-password");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });
});

describe("AuthPage registration", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  test("submits the account details and authenticates on success", async () => {
    const user = userEvent.setup();
    const onAuthenticated = jest.fn();
    const userData = { id: "123", name: "Test Customer", email: "customer@example.com" };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: "session-token", user: userData }),
    });
    render(<AuthPage onAuthenticated={onAuthenticated} />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.type(screen.getByLabelText("Name"), "Test Customer");
    await user.type(screen.getByLabelText("Email"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Customer",
          email: "customer@example.com",
          password: "correct-password",
        }),
      }
    );
    expect(localStorage.getItem("feedback-auth-token")).toBe("session-token");
    expect(onAuthenticated).toHaveBeenCalledWith(userData);
  });
});
