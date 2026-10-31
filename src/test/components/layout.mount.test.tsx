import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp } from "@/test/helpers/render-app";
import PublicLayout from "@/components/PublicLayout";
import SEOMeta from "@/components/SEOMeta";
import { COMMUNITY_FULL_NAME } from "@/lib/community";

describe("Layout component mounts (real providers)", () => {
  it("PublicLayout renders children and brand chrome", () => {
    renderApp(
      <PublicLayout title="Coverage">
        <div>Child content for coverage</div>
      </PublicLayout>,
      { route: "/" },
    );
    expect(screen.getByText("Child content for coverage")).toBeInTheDocument();
    expect(document.body.textContent).toContain(COMMUNITY_FULL_NAME.split(" ")[0] || "Khadayata");
  });

  it("SEOMeta injects document title", () => {
    renderApp(<SEOMeta title="Coverage Title — Khadayata" description="desc" />, { route: "/" });
    expect(document.title).toMatch(/Coverage Title/i);
  });
});
