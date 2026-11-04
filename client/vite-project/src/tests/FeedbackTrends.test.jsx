import { jest } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackTrends from "../components/FeedbackTrends";

describe("FeedbackTrends", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("summarizes the selected period and compares it with the previous period", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-04T12:00:00"));
    render(
      <FeedbackTrends
        feedbacks={[
          { createdAt: "2026-11-04T10:00:00", rating: 5 },
          { createdAt: "2026-11-04T11:00:00", rating: 4 },
          { createdAt: "2026-10-27T10:00:00", rating: 2 },
        ]}
      />
    );

    const panel = screen.getByRole("region", { name: "Listening, over time." });
    expect(within(panel).getByText("2", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByText("4.5")).toBeInTheDocument();
    expect(panel.querySelector(".trend-change strong")).toHaveTextContent("100%");
    expect(within(panel).getByRole("img", { name: "Daily feedback responses for the last 7 days" }))
      .toBeInTheDocument();
  });

  test("changes the chart and summary to the 30-day range", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-04T12:00:00"));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FeedbackTrends feedbacks={[{ createdAt: "2026-10-10T10:00:00", rating: 4 }]} />);

    await user.click(screen.getByRole("button", { name: "30 days" }));

    const panel = screen.getByRole("region", { name: "Listening, over time." });
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByRole("img", { name: "Daily feedback responses for the last 30 days" }))
      .toBeInTheDocument();
  });

  test("shows an empty state without inventing response data", () => {
    render(<FeedbackTrends feedbacks={[]} />);

    const panel = screen.getByRole("region", { name: "Listening, over time." });
    expect(within(panel).getByText("0", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByText("—")).toBeInTheDocument();
    expect(within(panel).getByText("No activity yet")).toBeInTheDocument();
  });
});
