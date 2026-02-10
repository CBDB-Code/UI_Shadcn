# GetVocal Component Registry

A custom [shadcn/ui](https://ui.shadcn.com) component registry providing standard UI primitives and specialized data visualization components.

## Quick Start

```bash
# Add any component to your project
npx shadcn@latest add --registry https://raw.githubusercontent.com/christophe-deschryver/UI_Shadcn/main/registry.json <component-name>
```

## Components

### Core UI

- **button** — Multi-variant button with slot composition
- **card** — Composable card container (Header, Title, Description, Content, Footer)
- **badge** — Status badges with success/warning/destructive/outline variants
- **input** — Styled form input

### Data Visualization

- **health-matrix** — Grid of health KPI cards with sparkline charts, trend indicators, and status badges. Ideal for healthcare dashboards and monitoring UIs.
- **sankey-chart** — Interactive Sankey flow diagram for visualizing flows between categories (budgets, user journeys, resource allocation).
- **analytics-dashboard** — Complete analytics page with KPI summary cards, area chart, bar chart, and time range selector.

## Requirements

- React 18+
- Tailwind CSS
- A `cn()` utility (standard shadcn/ui setup)

## License

MIT
