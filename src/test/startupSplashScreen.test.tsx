import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import StartupSplashScreen from "../components/StartupSplashScreen";

describe("StartupSplashScreen Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders branded logo, title, and ecosystem tagline immediately", () => {
    render(<StartupSplashScreen isReady={false} />);

    expect(screen.getByAltText("Bethelincovibe TV")).toBeInTheDocument();
    expect(screen.getByText("Bethelincovibe TV")).toBeInTheDocument();
    expect(screen.getByText("Lagos Business & Promotion Ecosystem")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("updates progress text and percentage as initialization progresses", () => {
    render(<StartupSplashScreen isReady={false} />);

    expect(screen.getByText("Initializing ecosystem...")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText("Verifying secure connection...")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText("Synchronizing marketplace...")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("smoothly finishes and calls onFinish callback when isReady becomes true", () => {
    const onFinish = vi.fn();
    const { rerender } = render(
      <StartupSplashScreen isReady={false} onFinish={onFinish} minDurationMs={500} />
    );

    // After 100ms, isReady turns true
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(<StartupSplashScreen isReady={true} onFinish={onFinish} minDurationMs={500} />);

    // Fast forward to complete minDuration (500ms total) + exit transition (450ms)
    act(() => {
      vi.advanceTimersByTime(400); // 500ms elapsed
    });

    expect(screen.getByText("Welcome to Bethelincovibe TV")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500); // exit transition complete
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("safely auto-dismisses after maxTimeoutMs even if isReady stays false", () => {
    const onFinish = vi.fn();
    render(
      <StartupSplashScreen isReady={false} onFinish={onFinish} maxTimeoutMs={2000} />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    // Advance to safety timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Welcome to Bethelincovibe TV")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
