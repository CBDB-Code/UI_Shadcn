# shadcn-scaffolder

Create React + Vite + TypeScript projects pre-configured with shadcn/ui components from the GetVocal registry.

## Quick Start

```bash
# Minimal project (button, card, badge, input)
node shadcn-scaffolder/index.js my-app

# Dashboard with charts and navigation
node shadcn-scaffolder/index.js my-dashboard --template dashboard

# Form-focused project
node shadcn-scaffolder/index.js my-form --template form

# Custom component selection
node shadcn-scaffolder/index.js my-app --template custom --components button,card,tabs,sidebar,dialog
```

## Templates

| Template | Components | Description |
|---|---|---|
| `minimal` | button, card, badge, input | Basic UI primitives |
| `form` | button, card, input, label, form, select, checkbox, radio-group, textarea, switch | Form-focused layout |
| `dashboard` | button, card, badge, input, tabs, table, chart, sidebar, dropdown-menu, avatar, separator, skeleton | Full dashboard |
| `custom` | (user-specified, max 20) | Pick your own |

## Available Components (57)

All components from the [shadcn/ui v4 registry](https://ui.shadcn.com/docs/components):

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip

## Options

```
-t, --template <name>     minimal | form | dashboard | custom (default: minimal)
-c, --components <list>   Comma-separated names (only with --template custom)
--target <dir>            Parent directory (default: current directory)
-h, --help                Show help
```

## What It Does

1. Creates a Vite + React + TypeScript project
2. Installs npm dependencies
3. Initializes shadcn/ui with default config
4. Batch-installs selected components from the registry
5. Verifies project structure

## Registry URL

```
https://raw.githubusercontent.com/CBDB-Code/UI_Shadcn/main/registry.json
```

## Error Recovery

If the process crashes or is interrupted (Ctrl+C), it saves progress to `.scaffolder-state.json` inside the project directory. Re-run the same command to resume from where it left off.

## Adding Components Later

```bash
npx shadcn@latest add --registry https://raw.githubusercontent.com/CBDB-Code/UI_Shadcn/main/registry.json [component-name]
```
