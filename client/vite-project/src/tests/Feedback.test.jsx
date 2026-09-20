import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackCard from "../components/FeedbackCard";


describe("FeedbackCard", () => {
  const feedback = {
    _id: "123",
    customerName: "John",
    rating: 5,
    message: "Excellent customer service!",
  };

  test("1. displays customer name", () => {
    render(
      <FeedbackCard
        feedback={feedback}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText("John")).toBeInTheDocument();
  });

  test("2. displays customer rating", () => {
    render(
      <FeedbackCard
        feedback={feedback}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText("5/5")).toBeInTheDocument();
  });

  test("3. displays feedback message", () => {
    render(
      <FeedbackCard
        feedback={feedback}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(
      screen.getByText("Excellent customer service!")
    ).toBeInTheDocument();
  });

  test("4. displays Edit and Delete buttons", () => {
    render(
      <FeedbackCard
        feedback={feedback}
        onUpdate={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Edit" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Delete" })
    ).toBeInTheDocument();
  });

  test("5. calls onDelete when Delete button is clicked", async () => {
    const onDelete = jest.fn();

    render(
      <FeedbackCard
        feedback={feedback}
        onUpdate={jest.fn()}
        onDelete={onDelete}
      />
    );

    window.confirm = jest.fn(() => true);

    await userEvent.click(
      screen.getByRole("button", { name: "Delete" })
    );

    expect(onDelete).toHaveBeenCalledWith("123");
  });
});