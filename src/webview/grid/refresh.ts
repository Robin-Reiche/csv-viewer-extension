import { state, getNumCols } from '../state';

export function refreshGrid(): void {
    if (!state.gridApi) return;
    state.autoFitCache = null;
    state.colTypes = [];

    const numCols  = getNumCols(state.data);
    const bodyRows = state.data.slice(1);
    const rowData  = bodyRows.map(row => {
        const obj: Record<string, string> = {};
        for (let c = 0; c < numCols; c++) obj['col_' + c] = row[c] ?? '';
        return obj;
    });
    state.gridApi.setGridOption('rowData', rowData);
}
