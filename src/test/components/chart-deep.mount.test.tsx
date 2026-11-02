/**
 * Exhaust ChartContainer / ChartStyle / tooltip / legend branches.
 * Renders ChartTooltipContent + ChartLegendContent with fabricated Recharts payloads
 * (jsdom never fires hover tooltips).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bar, BarChart, XAxis } from "recharts";
import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Activity } from "lucide-react";

const baseConfig: ChartConfig = {
  sales: { label: "Sales", color: "#111827" },
  visits: { label: "Visits", theme: { light: "#2563eb", dark: "#93c5fd" }, icon: Activity },
  empty: { label: "NoColor" },
};

function payloadItem(partial: Record<string, unknown>) {
  return {
    name: "sales",
    dataKey: "sales",
    value: 12,
    color: "#111827",
    payload: { fill: "#111827", sales: 12, name: "a" },
    ...partial,
  };
}

describe("chart.tsx deep branches", () => {
  it("throws when ChartTooltipContent is used outside ChartContainer", () => {
    expect(() =>
      render(<ChartTooltipContent active payload={[payloadItem({})] as never[]} />),
    ).toThrow(/useChart must be used within a <ChartContainer/);
  });

  it("throws when ChartLegendContent is used outside ChartContainer", () => {
    expect(() =>
      render(
        <ChartLegendContent
          payload={[{ value: "sales", dataKey: "sales", color: "#111" }] as never[]}
        />,
      ),
    ).toThrow(/useChart must be used within a <ChartContainer/);
  });

  it("ChartStyle null for empty colorConfig and theme CSS for themed keys", () => {
    const empty = render(<ChartStyle id="none" config={{ empty: { label: "x" } }} />);
    expect(empty.container.querySelector("style")).toBeNull();
    empty.unmount();

    const themed = render(<ChartStyle id="theme" config={baseConfig} />);
    const css = themed.container.querySelector("style")?.innerHTML ?? "";
    expect(css).toMatch(/--color-sales:\s*#111827/);
    expect(css).toMatch(/--color-visits:\s*#2563eb/);
    expect(css).toMatch(/\.dark \[data-chart=theme\]/);
    themed.unmount();
  });

  it("ChartContainer mounts with id + color config and ResponsiveContainer child", () => {
    render(
      <ChartContainer id="sales-chart" config={baseConfig} className="h-48 w-full">
        <BarChart data={[{ name: "a", sales: 2, visits: 4 }]}>
          <XAxis dataKey="name" />
          <Bar dataKey="sales" />
        </BarChart>
      </ChartContainer>,
    );
    expect(document.querySelector('[data-chart="chart-sales-chart"]')).toBeTruthy();
  });

  it("ChartTooltipContent covers inactive/empty, indicators, formatters, icons, labels", () => {
    const { rerender, unmount } = render(
      <ChartContainer config={baseConfig}>
        <div>
          <ChartTooltipContent active={false} payload={[payloadItem({})] as never[]} />
          <ChartTooltipContent active payload={[]} />
        </div>
      </ChartContainer>,
    );
    expect(document.querySelector("[data-chart]")).toBeTruthy();

    rerender(
      <ChartContainer config={baseConfig}>
        <div className="space-y-2">
          <ChartTooltipContent
            active
            indicator="dot"
            label="sales"
            payload={[payloadItem({ name: "sales", value: 9 })] as never[]}
          />
          <ChartTooltipContent
            active
            indicator="line"
            hideLabel={false}
            label="Week"
            labelFormatter={(v) => `FMT:${String(v)}`}
            payload={[payloadItem({ name: "sales", value: 3 })] as never[]}
          />
          <ChartTooltipContent
            active
            indicator="dashed"
            hideIndicator
            nameKey="sales"
            payload={[payloadItem({ name: "sales", value: 7 })] as never[]}
          />
          <ChartTooltipContent
            active
            indicator="dot"
            hideLabel
            formatter={(value, name) => (
              <span data-testid="fmt">
                {String(name)}={String(value)}
              </span>
            )}
            payload={[payloadItem({ name: "sales", value: 5 })] as never[]}
          />
          <ChartTooltipContent
            active
            labelKey="labelFromPayload"
            nameKey="metric"
            payload={
              [
                payloadItem({
                  name: "visits",
                  dataKey: "visits",
                  value: 42,
                  metric: "visits",
                  payload: { labelFromPayload: "visits", fill: "#2563eb" },
                }),
              ] as never[]
            }
          />
          <ChartTooltipContent
            active
            indicator="line"
            payload={
              [
                payloadItem({
                  name: "unknown_key",
                  dataKey: "unknown_key",
                  value: 1,
                  payload: { fill: "#ccc" },
                }),
              ] as never[]
            }
          />
        </div>
      </ChartContainer>,
    );

    expect(screen.getByTestId("fmt").textContent).toMatch(/sales=5/);
    expect(document.body.textContent).toMatch(/Sales|Visits|FMT:/);
    unmount();
  });

  it("ChartLegendContent covers icons, hideIcon, verticalAlign, and empty payload", () => {
    const { rerender, unmount } = render(
      <ChartContainer config={baseConfig}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>,
    );
    expect(document.querySelector("[data-chart]")).toBeTruthy();

    rerender(
      <ChartContainer config={baseConfig}>
        <div>
          <ChartLegendContent
            verticalAlign="top"
            payload={
              [
                { value: "sales", dataKey: "sales", color: "#111827" },
                { value: "visits", dataKey: "visits", color: "#2563eb" },
              ] as never[]
            }
          />
          <ChartLegendContent
            hideIcon
            nameKey="dataKey"
            verticalAlign="bottom"
            payload={[{ value: "sales", dataKey: "sales", color: "#111" }] as never[]}
          />
        </div>
      </ChartContainer>,
    );
    expect(document.body.textContent).toMatch(/Sales|Visits/);
    unmount();
  });
});
