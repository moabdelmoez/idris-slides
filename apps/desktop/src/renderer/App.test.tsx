// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the desktop workspace shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Idris Slides" })).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Live Preview")).toBeInTheDocument();
    expect(screen.getByText("AI Chat")).toBeInTheDocument();
  });
});
