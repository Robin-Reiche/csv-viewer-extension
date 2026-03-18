# CSV Grid Viewer

A fast, lightweight CSV/TSV viewer for Visual Studio Code. Opens CSV files in a sortable, filterable grid — similar to Excel — right inside your editor.

![Grid View](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/grid-view.png)

## Features

### Grid View
CSV data displayed in an interactive grid with alternating row colors, horizontal and vertical grid lines.

![Grid Overview](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/grid-overview.png)

### Auto-Fit Columns
One click to fit all columns to their content — headers and values are never truncated.

![Auto-Fit](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/autofit.gif)

### Zoom
Scale the entire grid from 60% to 200%.

![Zoom](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/zoom.gif)

### Sort & Filter
Click column headers to sort. Use the filter icon to search within columns.

![Sort and Filter](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/sort-filter.gif)

### Inline Editing
Double-click any cell to edit. Changes are saved back to the CSV file.

![Editing](https://raw.githubusercontent.com/Robin-Reiche/csv-viewer-extension/master/images/editing.gif)

## Supported File Types

| Extension | Delimiter |
|-----------|-----------|
| `.csv`    | Auto-detected (`,` `;` `\t`) |
| `.tsv`    | Tab |

## Usage

1. Open any `.csv` or `.tsv` file in VS Code
2. The file opens automatically in the grid viewer
3. Use the toolbar buttons for auto-fit, zoom, undo/redo

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |

## License

[MIT](LICENSE)
