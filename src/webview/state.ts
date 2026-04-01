import type { CsvRow, ColType, FindMatch } from './types';

export const state = {
    currentDelimiter: ',',
    rawCsvText: '',
    data: [] as CsvRow[],
    undoStack: [] as CsvRow[][],
    redoStack: [] as CsvRow[][],
    gridApi: null as any,
    focusedCellColId: null as string | null,
    focusedCellRowIndex: null as number | null,
    isCellEditing: false,

    ZOOM_STEPS: [60, 70, 80, 90, 100, 110, 125, 150, 175, 200],
    zoomIndex: 4,
    isAutoFitted: false,
    autoFitCache: null as any,
    autoFitCacheZoom: -1,

    colTypes: [] as ColType[],
    profileOpen: false,
    profileDock: 'right' as 'right' | 'bottom' | 'left',

    rowIndexSelected: null as number | null,

    selectMode: false,
    selectViewRowIndices: null as number[] | null,
    selectViewColIndices: null as number[] | null,

    findMatches: [] as FindMatch[],
    findMatchIndex: -1,

    currentPage: 0,
};

export function getNumCols(rows: CsvRow[]): number {
    let max = 0;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].length > max) max = rows[i].length;
    }
    return max;
}
