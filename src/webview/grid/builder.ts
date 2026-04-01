import { state, getNumCols } from '../state';
import { getColumnType, scheduleRecomputeColTypes } from './column-type';
import { createCombinedFilter } from './filter';
import { pushUndo, notifyChange, updateButtons } from '../features/undo-redo';
import { getFindCellClassRules } from '../features/find-replace';
import { attachHeaderContextMenus } from '../features/freeze-columns';
import { applyZoom } from '../features/zoom';
import { applyGridTheme } from '../features/theme';

const TYPE_LABELS: Record<string, string> = {
    integer: 'Integer', float: 'Float / Decimal', string: 'Text',
    boolean: 'Boolean', date: 'Date', datetime: 'Date & Time', time: 'Time'
};

// ── Row-index highlight via a dynamic <style> tag ─────────────────────────────
// Using a CSS [row-index="N"] selector instead of AG Grid's class/selection APIs
// makes the highlight immune to virtual-scroll re-renders and AG Grid version quirks.
export function applyRowIndexHighlight(): void {
    let el = document.getElementById('_row-hl') as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = '_row-hl';
        document.head.appendChild(el);
    }
    const n = state.rowIndexSelected;
    el.textContent = n === null ? '' : `
#grid-container .ag-row[row-index="${n}"] .ag-cell{background:var(--vscode-list-inactiveSelectionBackground,rgba(55,148,255,.18))!important;border-top-color:var(--vscode-focusBorder,#007fd4)!important;border-bottom-color:var(--vscode-focusBorder,#007fd4)!important}
#grid-container .ag-row[row-index="${n}"] .row-index-cell{background:rgba(55,148,255,.35)!important;color:var(--vscode-focusBorder,#007fd4)!important;font-weight:700!important}
    `;
}

export function buildGrid(): void {
    if (!state.data?.length) return;

    const headerRow = state.data[0];
    const bodyRows  = state.data.slice(1);
    const numCols   = getNumCols(state.data);

    // Row index column (Feature 1)
    const columnDefs: any[] = [{
        headerName: '#',
        colId: 'row-index',
        headerClass: 'row-index-header',
        valueGetter: (p: any) => p.node.rowIndex + 1,
        width: 48, minWidth: 36, maxWidth: 80,
        pinned: 'left',
        suppressHeaderMenuButton: true, sortable: false, filter: false,
        editable: false, resizable: false, suppressMovable: true,
        cellClass: 'row-index-cell',
    }];

    for (let c = 0; c < numCols; c++) {
        const colType   = getColumnType(bodyRows, c);
        state.colTypes[c] = colType;
        const colDef: any = {
            headerName:   headerRow[c] ?? '',
            field:        'col_' + c,
            headerClass:  'col-type-' + colType,
            headerTooltip: TYPE_LABELS[colType] ?? 'Text',
            minWidth: 60,
            editable:     !IS_PREVIEW,
            sortable:     true,
            filter:       createCombinedFilter(colType),
            resizable:    true,
            suppressMovable: false,
        };
        if (colType === 'integer' || colType === 'float') {
            colDef.comparator = (a: string, b: string) => {
                const na = a === '' || a == null ? -Infinity : Number(a);
                const nb = b === '' || b == null ? -Infinity : Number(b);
                return na - nb;
            };
        }
        columnDefs.push(colDef);
    }

    const rowData = bodyRows.map(row => {
        const obj: Record<string, string> = {};
        for (let c = 0; c < numCols; c++) obj['col_' + c] = row[c] ?? '';
        return obj;
    });

    const container = document.getElementById('grid-container')!;
    container.innerHTML = '';
    applyGridTheme(); // ensure correct ag-theme-alpine[-dark] class

    const ZOOM_SCALE = state.ZOOM_STEPS[state.zoomIndex] / 100;
    const BASE_TEXT_BTN_FONT = 11;

    const gridOptions: any = {
        columnDefs,
        rowData,
        defaultColDef: {
            flex: 0, width: 130,
            editable: !IS_PREVIEW,
            sortable: true, resizable: true,
            cellClassRules: getFindCellClassRules(),
        },
        // Replace AG Grid icon-font glyphs with inline SVG so no font
        // download is needed (web-font loading is blocked in VS Code webviews).
        icons: {
            sortAscending:  '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" style="display:inline-block;vertical-align:middle"><polygon points="4.5,0.5 8.5,8.5 0.5,8.5" fill="currentColor"/></svg>',
            sortDescending: '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" style="display:inline-block;vertical-align:middle"><polygon points="4.5,8.5 8.5,0.5 0.5,0.5" fill="currentColor"/></svg>',
            sortUnSort:     '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="13" viewBox="0 0 9 13" style="display:inline-block;vertical-align:middle;opacity:0.35"><polygon points="4.5,0.5 8.5,5.5 0.5,5.5" fill="currentColor"/><polygon points="4.5,12.5 8.5,7.5 0.5,7.5" fill="currentColor"/></svg>',
            filter:         '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" style="display:inline-block;vertical-align:middle"><path d="M0.5,1 L9.5,1 L6,5 L6,9 L4,8 L4,5 Z" fill="currentColor"/></svg>',
            menu:           '<span>⋮</span>',
            columns:        '<span>☰</span>',
            cancel:         '<span>✕</span>',
            check:          '<span>✓</span>',
            first:          '<span>⇤</span>',
            last:           '<span>⇥</span>',
            previous:       '<span>‹</span>',
            next:           '<span>›</span>',
            loading:        '<span>…</span>',
            smallDown:      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="display:inline-block;vertical-align:middle"><polygon points="4,7.5 7.5,0.5 0.5,0.5" fill="currentColor"/></svg>',
            smallLeft:      '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="display:inline-block;vertical-align:middle"><polygon points="0.5,4 7.5,0.5 7.5,7.5" fill="currentColor"/></svg>',
            smallRight:     '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="display:inline-block;vertical-align:middle"><polygon points="7.5,4 0.5,0.5 0.5,7.5" fill="currentColor"/></svg>',
            smallUp:        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" style="display:inline-block;vertical-align:middle"><polygon points="4,0.5 7.5,7.5 0.5,7.5" fill="currentColor"/></svg>',
        },
        animateRows: false,
        tooltipShowDelay: 400,
        tooltipHideDelay: 3000,
        suppressFieldDotNotation: true,
        singleClickEdit: false,
        stopEditingWhenCellsLoseFocus: true,
        undoRedoCellEditing: false,

        onCellClicked: (event: any) => {
            const colId = event.column?.getColId?.() ?? event.column;
            if (colId === 'row-index') {
                const isAlreadySelected = state.rowIndexSelected === event.rowIndex;
                state.rowIndexSelected    = isAlreadySelected ? null : event.rowIndex;
                state.focusedCellColId    = 'row-index';
                state.focusedCellRowIndex = event.rowIndex;
                applyRowIndexHighlight();
            }
        },

        onCellFocused: (event: any) => {
            if (event.column && event.rowIndex != null) {
                const colId = typeof event.column === 'string' ? event.column : event.column.getColId();
                state.focusedCellColId    = colId;
                state.focusedCellRowIndex = event.rowIndex;
                if (colId !== 'row-index' && state.rowIndexSelected !== null) {
                    state.rowIndexSelected = null;
                    applyRowIndexHighlight();
                }
            } else {
                state.focusedCellColId    = null;
                state.focusedCellRowIndex = null;
            }
        },
        onCellEditingStarted: () => { state.isCellEditing = true; },
        onCellEditingStopped:  () => { state.isCellEditing = false; },

        // Row indices shift when sorting or filtering — clear the selection so the
        // highlight doesn't appear on the wrong row.
        onSortChanged:   () => { state.rowIndexSelected = null; applyRowIndexHighlight(); },

        onFilterChanged: () => {
            state.rowIndexSelected = null; applyRowIndexHighlight();
            const isAnyFilter = state.gridApi?.isAnyFilterPresent();
            const cfBtn = document.getElementById('btn-clear-filters') as HTMLButtonElement | null;
            const sepBtn = document.getElementById('sep-filters') as HTMLElement | null;
            if (cfBtn) {
                cfBtn.style.display  = isAnyFilter ? '' : 'none';
                cfBtn.style.fontSize = Math.round(BASE_TEXT_BTN_FONT * ZOOM_SCALE) + 'px';
            }
            if (sepBtn) sepBtn.style.display = isAnyFilter ? '' : 'none';

            const totalRows = state.data.length - 1;
            const cols = numCols;
            if (isAnyFilter) {
                let displayed = 0;
                state.gridApi.forEachNodeAfterFilter(() => displayed++);
                document.getElementById('info')!.textContent   = `${displayed} of ${totalRows} rows \u00D7 ${cols} columns`;
                document.getElementById('status')!.textContent = `${displayed} of ${totalRows} records (filtered)`;
            } else {
                document.getElementById('info')!.textContent   = `${totalRows} rows \u00D7 ${cols} columns`;
                document.getElementById('status')!.textContent = `${totalRows} records`;
            }
        },

        onCellValueChanged: (event: any) => {
            const dataIndex = event.node.rowIndex + 1;
            const colField  = event.colDef.field;
            if (!colField) return;
            const colIndex = parseInt(colField.replace('col_', ''));
            pushUndo();
            while (state.data[dataIndex].length <= colIndex) state.data[dataIndex].push('');
            state.data[dataIndex][colIndex] = event.newValue != null ? String(event.newValue) : '';
            notifyChange();
            scheduleRecomputeColTypes();
        },
    };

    state.gridApi = agGrid.createGrid(container, gridOptions);
    updateButtons();

    // Double-click on resize handle → auto-size that column
    container.addEventListener('dblclick', e => {
        const target = e.target as HTMLElement;
        if (target?.classList.contains('ag-header-cell-resize')) {
            const headerCell = target.closest('.ag-header-cell');
            if (headerCell) {
                const colId = headerCell.getAttribute('col-id');
                if (colId) state.gridApi.autoSizeColumns([colId]);
            }
        }
    });

    const rowCount = bodyRows.length;
    const infoEl   = document.getElementById('info');
    const statusEl = document.getElementById('status');
    if (infoEl)   infoEl.textContent   = `${rowCount} rows \u00D7 ${numCols} columns`;
    if (statusEl) statusEl.textContent = `${rowCount} records`;

    setTimeout(attachHeaderContextMenus, 80);
}
