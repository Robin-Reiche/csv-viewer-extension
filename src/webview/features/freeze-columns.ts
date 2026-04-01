import { state } from '../state';

export function attachHeaderContextMenus(): void {
    const menu = document.getElementById('col-context-menu');
    if (!menu || !state.gridApi) return;

    document.querySelectorAll<HTMLElement>('.ag-header-cell[col-id]').forEach(cell => {
        cell.addEventListener('contextmenu', e => {
            e.preventDefault();
            const colId = cell.getAttribute('col-id');
            if (!colId || colId === 'row-index') return;

            const colStateArr = state.gridApi.getColumnState() as any[];
            const col      = colStateArr.find(s => s.colId === colId);
            const isPinned = col?.pinned === 'left';

            const freezeEl   = document.getElementById('col-ctx-freeze');
            const unfreezeEl = document.getElementById('col-ctx-unfreeze');
            if (freezeEl)   freezeEl.style.display   = isPinned ? 'none'  : 'block';
            if (unfreezeEl) unfreezeEl.style.display  = isPinned ? 'block' : 'none';

            (menu as HTMLElement).dataset.colId = colId;
            (menu as HTMLElement).style.left    = e.clientX + 'px';
            (menu as HTMLElement).style.top     = e.clientY + 'px';
            menu.classList.remove('hidden');
        });
    });
}

export function setupFreezeColumns(): void {
    const menu = document.getElementById('col-context-menu');
    if (!menu) return;

    document.getElementById('col-ctx-freeze')?.addEventListener('click', () => {
        const colId = (menu as HTMLElement).dataset.colId;
        if (colId && state.gridApi) {
            state.gridApi.applyColumnState({ state: [{ colId, pinned: 'left' }] });
            setTimeout(attachHeaderContextMenus, 80);
        }
        menu.classList.add('hidden');
    });

    document.getElementById('col-ctx-unfreeze')?.addEventListener('click', () => {
        const colId = (menu as HTMLElement).dataset.colId;
        if (colId && state.gridApi) {
            state.gridApi.applyColumnState({ state: [{ colId, pinned: null }] });
            setTimeout(attachHeaderContextMenus, 80);
        }
        menu.classList.add('hidden');
    });

    document.addEventListener('click', () => menu.classList.add('hidden'));
}
