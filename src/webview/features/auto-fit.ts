import { state, getNumCols } from '../state';
import { showLoader, hideLoader } from '../utils/loader';
import { buildGrid } from '../grid/builder';

export function measureTextWidths(): { colId: string; width: number }[] {
    const { data, colTypes } = state;
    const headerRow = data[0];
    const bodyRows  = data.slice(1);
    const numCols   = getNumCols(data);

    // Derive font size and cell padding from the zoom state — these are the
    // exact values that applyZoom() sets via --ag-font-size and
    // --ag-cell-horizontal-padding, so they are guaranteed to match rendering.
    const scale    = state.ZOOM_STEPS[state.zoomIndex] / 100;
    const fontSize = Math.round(13 * scale);
    const cellPad  = Math.round(6  * scale) * 2;   // left + right padding

    // Read the actual font family from a live cell so we honour the VS Code
    // theme font (--vscode-font-family).  Fall back to Segoe UI.
    let fontFamily = '"Segoe UI", sans-serif';
    const sampleEl = document.querySelector<HTMLElement>('.ag-cell-value')
                  ?? document.querySelector<HTMLElement>('.ag-cell');
    if (sampleEl) {
        const ff = getComputedStyle(sampleEl).fontFamily;
        if (ff && ff.trim()) fontFamily = ff;
    }

    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d')!;

    const cellFontStr   = `400 ${fontSize}px ${fontFamily}`;
    const headerFontStr = `600 ${fontSize}px ${fontFamily}`;

    // Extra space beyond the measured text width:
    //   cell:   padding + border + a safe rendering margin
    //   header: padding + sort icon (~18 px) + resize handle + margin
    const CELL_EXTRA   = cellPad + 16;
    const HEADER_EXTRA = cellPad + 34;

    const TYPE_BADGE_TEXT: Record<string, string> = {
        integer: '123', float: '1.0', string: 'abc',
        boolean: 'T/F', date: 'date', datetime: 'dt', time: 'time'
    };
    ctx.font = `700 9px ${fontFamily}`;
    const badgeWidthCache: Record<string, number> = {};
    for (const key in TYPE_BADGE_TEXT) {
        // badge padding (8 px) + margin-right (5 px)
        badgeWidthCache[key] = Math.ceil(ctx.measureText(TYPE_BADGE_TEXT[key]).width) + 13;
    }

    const colState: { colId: string; width: number }[] = [];
    for (let c = 0; c < numCols; c++) {
        ctx.font = headerFontStr;
        const badgePx = badgeWidthCache[colTypes[c]] ?? badgeWidthCache['string'];
        const headerW = Math.ceil(ctx.measureText(headerRow?.[c] ?? '').width) + HEADER_EXTRA + badgePx;

        ctx.font = cellFontStr;
        let maxBodyW = 0;
        for (let r = 0; r < bodyRows.length; r++) {
            const val = bodyRows[r]?.[c] ? String(bodyRows[r][c]) : '';
            const w   = Math.ceil(ctx.measureText(val).width) + CELL_EXTRA;
            if (w > maxBodyW) maxBodyW = w;
        }

        colState.push({ colId: 'col_' + c, width: Math.max(60, Math.ceil(Math.max(headerW, maxBodyW))) });
    }
    return colState;
}

export function toggleAutoFit(): void {
    if (!state.gridApi) return;
    if (!state.isAutoFitted) {
        if (state.autoFitCache && state.autoFitCacheZoom === state.zoomIndex) {
            state.gridApi.applyColumnState({ state: state.autoFitCache });
            state.isAutoFitted = true;
            return;
        }
        showLoader('Fitting columns\u2026');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            try {
                const colState = measureTextWidths();
                state.autoFitCache     = colState;
                state.autoFitCacheZoom = state.zoomIndex;
                state.gridApi.applyColumnState({ state: colState });
                state.isAutoFitted = true;
            } catch (err) {
                console.error('[AutoFit]', err);
            }
            hideLoader();
        }));
    } else {
        buildGrid();
        state.isAutoFitted = false;
    }
}

export function setupAutoFit(): void {
    document.getElementById('btn-autofit')?.addEventListener('click', toggleAutoFit);
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
        state.gridApi?.setFilterModel(null);
    });
}
