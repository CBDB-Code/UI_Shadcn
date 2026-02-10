# GetVocal Registry — Skill Guide

## What is this?

A custom **shadcn/ui** component registry hosted on GitHub. It provides reusable UI components that can be installed into any Next.js / React project using the `shadcn` CLI.

## Registry URL

```
https://raw.githubusercontent.com/christophe-deschryver/UI_Shadcn/main/registry.json
```

## Available Components

| Component              | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `button`               | Versatile button with variants and sizes                 |
| `card`                 | Container with header, content, and footer               |
| `badge`                | Status labels and tags with color variants               |
| `input`                | Styled text input                                        |
| `health-matrix`        | Health metrics grid with sparklines and trend indicators  |
| `sankey-chart`         | Interactive Sankey flow diagram (recharts-based)          |
| `analytics-dashboard`  | Full analytics dashboard with KPIs, area & bar charts     |

## Installation

### Install a single component

```bash
npx shadcn@latest add --registry https://raw.githubusercontent.com/christophe-deschryver/UI_Shadcn/main/registry.json button
```

### Install multiple components

```bash
npx shadcn@latest add --registry https://raw.githubusercontent.com/christophe-deschryver/UI_Shadcn/main/registry.json health-matrix sankey-chart analytics-dashboard
```

## Dependencies

The custom components use:

- **recharts** — charting library for sparklines, Sankey diagrams, area/bar charts
- **lucide-react** — icon set
- **@radix-ui/react-slot** — slot composition for the button component
- **class-variance-authority** — variant management

These are installed automatically when you add a component.

## Usage Example

```tsx
import { HealthMatrix, type HealthMetric } from "@/components/ui/health-matrix"

const metrics: HealthMetric[] = [
  {
    id: "heart-rate",
    label: "Heart Rate",
    value: 72,
    unit: "bpm",
    status: "healthy",
    trend: -2.1,
    sparkline: [{ value: 74 }, { value: 73 }, { value: 71 }, { value: 72 }],
    target: { min: 60, max: 100 },
  },
]

export default function Page() {
  return <HealthMatrix metrics={metrics} columns={3} />
}
```
