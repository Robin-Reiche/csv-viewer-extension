import { state } from './state';
import { undo, redo } from './features/undo-redo';
import { zoomIn, zoomOut } from './features/zoom';
import { openFindBar } from './features/find-replace';

function writeToClipboard(text: string): void {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function buildRowCopyText(rowNode: any): string {
    const cols = state.gridApi?.getAllDisplayedColumns?.() as any[] | undefined;
    if (cols?.length) {
        // Follow visible column order and skip the row-index column
        return cols
            .map((col: any) => col.getColId?.() as string)
            .filter(id => id.startsWith('col_'))
            .map(id => {
                const v = rowNode.data?.[id];
                return v != null ? String(v) : '';
            })
            .join('\t');
    }
    // Fallback: sort by original column order
    return Object.keys(rowNode.data ?? {})
        .filter(k => k.startsWith('col_'))
        .sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)))
        .map(k => rowNode.data[k] != null ? String(rowNode.data[k]) : '')
        .join('\t');
}

export function setupKeyboard(): void {
    // ── Capture phase: intercept Ctrl+C for row-index BEFORE AG Grid handles it ─
    // AG Grid's own Ctrl+C handler is bubble-phase on the grid container — if we
    // don't capture first, it wins and copies only the row-number cell value.
    document.addEventListener('keydown', e => {
        if (!state.selectMode && !state.isCellEditing
                && (e.ctrlKey || e.metaKey) && e.key === 'c') {
            if (state.gridApi && state.focusedCellColId === 'row-index'
                    && state.rowIndexSelected !== null) {
                const rowNode = state.gridApi.getDisplayedRowAtIndex(state.rowIndexSelected);
                if (rowNode) {
                    writeToClipboard(buildRowCopyText(rowNode));
                    e.stopPropagation(); // prevent AG Grid from overwriting clipboard
                    e.preventDefault();
                }
            }
        }
    }, true /* capture phase */);

    // ── Bubble phase: all other keyboard shortcuts ────────────────────────────
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !state.isCellEditing && !state.selectMode) {
            // Single-cell copy (row-index case already handled above)
            if (state.gridApi
                    && state.focusedCellColId !== null
                    && state.focusedCellColId !== 'row-index'
                    && state.focusedCellRowIndex !== null) {
                const rowNode = state.gridApi.getDisplayedRowAtIndex(state.focusedCellRowIndex);
                if (rowNode?.data) {
                    const val = rowNode.data[state.focusedCellColId];
                    writeToClipboard(val != null ? String(val) : '');
                    e.preventDefault();
                }
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { undo(); e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { redo(); e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { zoomIn();  e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') { zoomOut(); e.preventDefault(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'h') && !state.isCellEditing) { e.preventDefault(); openFindBar(); }
    });

    // ── Capture phase: right-click → Copy for row-index ──────────────────────
    // The browser `copy` event fires for right-click → Copy and Ctrl+C.
    // Intercept in capture phase so AG Grid's own copy listener can't overwrite.
    document.addEventListener('copy', (e: ClipboardEvent) => {
        if (state.rowIndexSelected !== null && state.focusedCellColId === 'row-index'
                && !state.isCellEditing && !state.selectMode) {
            const rowNode = state.gridApi?.getDisplayedRowAtIndex(state.rowIndexSelected);
            if (rowNode) {
                e.clipboardData?.setData('text/plain', buildRowCopyText(rowNode));
                e.stopPropagation();
                e.preventDefault();
            }
        }
    }, true /* capture phase */);
}
