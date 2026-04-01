import { state, getNumCols } from '../state';

// ── selection state ───────────────────────────────────────────────────────────

type SelType = 'none' | 'cols' | 'rows' | 'cells' | 'all';
interface Sel { type: SelType; r0: number; r1: number; c0: number; c1: number; }

let sel: Sel = { type: 'none', r0: 0, r1: 0, c0: 0, c1: 0 };
let numCols         = 0;
let visibleRowIdxs: number[] = [];   // state.data indices of visible rows (after filter/sort)
let visibleColIdxs: number[] = [];   // state.data column indices in display order

// ── clipboard ─────────────────────────────────────────────────────────────────

function toTsv(rows: string[][]): string {
    return rows.map(r => r.map(v => {
        const s = v ?? '';
        return (s.includes('\t') || s.includes('\n') || s.includes('\r'))
            ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join('\t')).join('\n');
}

function copyText(tsv: string, triggerBtn?: HTMLButtonElement): void {
    const ok = () => {
        if (triggerBtn) {
            const orig = triggerBtn.innerHTML;
            triggerBtn.innerHTML = '<i class="codicon codicon-check"></i> Copied!';
            triggerBtn.classList.add('sc-btn-copied');
            setTimeout(() => { triggerBtn.innerHTML = orig; triggerBtn.classList.remove('sc-btn-copied'); }, 2000);
        }
    };
    const err = () => {
        const fb = document.getElementById('sc-feedback')!;
        fb.textContent = 'Copy failed'; fb.className = 'sc-feedback err';
        setTimeout(() => { fb.textContent = ''; fb.className = 'sc-feedback'; }, 2500);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(tsv).then(ok).catch(() => execCopy(tsv, ok, err));
    else execCopy(tsv, ok, err);
}

function execCopy(text: string, ok: () => void, err: () => void): void {
    try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy') ? ok() : err();
        document.body.removeChild(ta);
    } catch { err(); }
}

// ── selection helpers ─────────────────────────────────────────────────────────

function selContains(r: number, c: number): boolean {
    if (sel.type === 'none') return false;
    if (sel.type === 'all')  return true;
    const r0 = Math.min(sel.r0, sel.r1), r1 = Math.max(sel.r0, sel.r1);
    const c0 = Math.min(sel.c0, sel.c1), c1 = Math.max(sel.c0, sel.c1);
    if (r === 0 && c < 0) return false;
    if (c < 0) return sel.type === 'rows' && r >= r0 && r <= r1;
    if (r === 0) return sel.type === 'cols' && c >= c0 && c <= c1;
    return r >= r0 && r <= r1 && c >= c0 && c <= c1;
}

function updateHighlight(): void {
    document.querySelectorAll<HTMLElement>('#sc-table-wrap .sc-cell').forEach(cell => {
        cell.classList.toggle('sc-sel', selContains(+cell.dataset.r!, +cell.dataset.c!));
    });
    document.querySelector<HTMLElement>('#sc-table-wrap .sc-corner')
        ?.classList.toggle('sc-sel', sel.type === 'all');
    updateInfo();
}

function updateInfo(): void {
    const infoEl = document.getElementById('sc-sel-info')!;
    const btn    = document.getElementById('btn-sc-copy') as HTMLButtonElement;

    if (sel.type === 'none') {
        infoEl.textContent = 'Click column header → select column · Row number → select row · Shift+click → extend · Ctrl+A · Ctrl+C';
        btn.disabled = true; return;
    }
    btn.disabled = false;
    const r0 = Math.min(sel.r0, sel.r1), r1 = Math.max(sel.r0, sel.r1);
    const c0 = Math.min(sel.c0, sel.c1), c1 = Math.max(sel.c0, sel.c1);
    const nRows = sel.type === 'cols' || sel.type === 'all'
        ? visibleRowIdxs.length : (r1 - r0 + 1);
    const nCols = sel.type === 'rows' || sel.type === 'all'
        ? numCols : (c1 - c0 + 1);
    const withH = (document.getElementById('sc-with-header') as HTMLInputElement | null)?.checked
        ? ' + header' : '';
    infoEl.textContent = `${nRows.toLocaleString()} row${nRows !== 1 ? 's' : ''} × ${nCols} col${nCols !== 1 ? 's' : ''}${withH} — ready to copy`;
}

// ── table rendering ───────────────────────────────────────────────────────────

function buildTable(): void {
    if (!state.data?.length) return;

    visibleColIdxs = state.selectViewColIndices?.length
        ? state.selectViewColIndices
        : Array.from({ length: getNumCols(state.data) }, (_, i) => i);
    numCols = visibleColIdxs.length;

    visibleRowIdxs = state.selectViewRowIndices?.length
        ? state.selectViewRowIndices
        : state.data.slice(1).map((_, i) => i + 1);

    const headers = state.data[0];
    const wrap    = document.getElementById('sc-table-wrap')!;
    wrap.innerHTML = '';

    const tbl   = document.createElement('table'); tbl.className = 'sc-table';
    const thead = document.createElement('thead');
    const htr   = document.createElement('tr');

    // Corner "select-all" cell
    const corner = document.createElement('th');
    corner.className = 'sc-cell sc-corner'; corner.dataset.r = '0'; corner.dataset.c = '-1';
    corner.title = 'Select all  (Ctrl+A)';
    corner.innerHTML = '<span class="codicon codicon-selection sc-corner-icon"></span>';
    htr.appendChild(corner);

    // Column headers — display index ci maps to data column visibleColIdxs[ci]
    for (let ci = 0; ci < numCols; ci++) {
        const dataCol = visibleColIdxs[ci];
        const th = document.createElement('th');
        th.className = 'sc-cell sc-col-hd'; th.dataset.r = '0'; th.dataset.c = String(ci);
        th.textContent = headers[dataCol] ?? `Col ${dataCol + 1}`;
        th.title = `Click to select entire column "${headers[dataCol] ?? ''}"`;
        htr.appendChild(th);
    }
    thead.appendChild(htr); tbl.appendChild(thead);

    // Data rows — ALL visible rows, no cap
    const tbody = document.createElement('tbody');
    for (let di = 0; di < visibleRowIdxs.length; di++) {
        const ri  = visibleRowIdxs[di];
        const row = state.data[ri] || [];
        const tr  = document.createElement('tr');

        const rn = document.createElement('td');
        rn.className = 'sc-cell sc-row-num'; rn.dataset.r = String(di + 1); rn.dataset.c = '-1';
        rn.textContent = String(di + 1); rn.title = 'Click to select row';
        tr.appendChild(rn);

        for (let ci = 0; ci < numCols; ci++) {
            const dataCol = visibleColIdxs[ci];
            const td = document.createElement('td');
            td.className = 'sc-cell sc-data'; td.dataset.r = String(di + 1); td.dataset.c = String(ci);
            td.textContent = row[dataCol] ?? '';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    tbl.addEventListener('click', onTableClick);

    document.getElementById('sc-row-note')!.style.display = 'none';

    sel = { type: 'none', r0: 0, r1: 0, c0: 0, c1: 0 };
    updateInfo();
}

// ── click handling ────────────────────────────────────────────────────────────

function onTableClick(e: MouseEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.sc-cell');
    if (!cell) return;
    const r     = +cell.dataset.r!;
    const c     = +cell.dataset.c!;
    const shift = e.shiftKey;

    if (r === 0 && c < 0) {
        sel = { type: 'all', r0: 0, r1: visibleRowIdxs.length, c0: 0, c1: numCols - 1 };
    } else if (r === 0 && c >= 0) {
        sel = shift && sel.type === 'cols'
            ? { ...sel, c1: c }
            : { type: 'cols', r0: 0, r1: visibleRowIdxs.length, c0: c, c1: c };
    } else if (c < 0 && r > 0) {
        sel = shift && sel.type === 'rows'
            ? { ...sel, r1: r }
            : { type: 'rows', r0: r, r1: r, c0: 0, c1: numCols - 1 };
    } else if (r > 0 && c >= 0) {
        sel = shift && sel.type === 'cells'
            ? { ...sel, r1: r, c1: c }
            : { type: 'cells', r0: r, r1: r, c0: c, c1: c };
    }
    updateHighlight();
}

// ── copy ──────────────────────────────────────────────────────────────────────

function doCopy(): void {
    if (sel.type === 'none' || !state.data?.length) return;
    const withHeader = (document.getElementById('sc-with-header') as HTMLInputElement).checked;
    const headers    = state.data[0];
    const r0 = Math.min(sel.r0, sel.r1), r1 = Math.max(sel.r0, sel.r1);
    const c0 = Math.min(sel.c0, sel.c1), c1 = Math.max(sel.c0, sel.c1);

    let colDataIdxs: number[];
    let srcRows: number[];

    if (sel.type === 'all') {
        colDataIdxs = visibleColIdxs;
        srcRows     = visibleRowIdxs;
    } else if (sel.type === 'cols') {
        colDataIdxs = visibleColIdxs.slice(c0, c1 + 1);
        srcRows     = visibleRowIdxs;
    } else if (sel.type === 'rows') {
        colDataIdxs = visibleColIdxs;
        srcRows     = visibleRowIdxs.slice(r0 - 1, r1);
    } else {
        colDataIdxs = visibleColIdxs.slice(c0, c1 + 1);
        srcRows     = visibleRowIdxs.slice(r0 - 1, r1);
    }

    const out: string[][] = [];
    if (withHeader) out.push(colDataIdxs.map(c => headers[c] ?? ''));
    srcRows.forEach(ri => out.push(colDataIdxs.map(c => (state.data[ri] || [])[c] ?? '')));
    const btn = document.getElementById('btn-sc-copy') as HTMLButtonElement | null;
    copyText(toTsv(out), btn ?? undefined);
}

function doCopyHeaders(): void {
    if (!state.data?.length) return;
    const headers = state.data[0];
    const tsv = visibleColIdxs.map(c => headers[c] ?? '').join('\t');
    const btn = document.getElementById('btn-sc-copy-headers') as HTMLButtonElement | null;
    copyText(tsv, btn ?? undefined);
}

// ── open / close ──────────────────────────────────────────────────────────────

function open(): void {
    if (!state.data?.length) return;
    state.selectMode = true;

    // Capture rows in current filter/sort order
    state.selectViewRowIndices = [];
    if (state.gridApi) {
        state.gridApi.forEachNodeAfterFilterAndSort((node: any) =>
            state.selectViewRowIndices!.push(node.rowIndex + 1)
        );
    }
    if (!state.selectViewRowIndices.length) state.selectViewRowIndices = null;

    // Capture visible columns in display order
    state.selectViewColIndices = [];
    if (state.gridApi) {
        const cols = state.gridApi.getAllDisplayedColumns() as any[];
        for (const col of cols) {
            const colId = col.getColId?.() ?? '';
            const match = colId.match(/^col_(\d+)$/);
            if (match) state.selectViewColIndices.push(parseInt(match[1], 10));
        }
    }
    if (!state.selectViewColIndices.length) state.selectViewColIndices = null;

    document.getElementById('grid-container')!.style.display   = 'none';
    document.getElementById('select-container')!.style.display = 'flex';
    document.getElementById('btn-select-mode')!.classList.add('btn-active');
    buildTable();
}

function close(): void {
    state.selectMode = false;
    document.getElementById('grid-container')!.style.display   = '';
    document.getElementById('select-container')!.style.display = 'none';
    document.getElementById('btn-select-mode')!.classList.remove('btn-active');
}

// ── setup ─────────────────────────────────────────────────────────────────────

export function setupSelectCopy(): void {
    document.getElementById('btn-select-mode')
        ?.addEventListener('click', () => state.selectMode ? close() : open());
    document.getElementById('btn-sc-back')
        ?.addEventListener('click', close);
    document.getElementById('btn-sc-copy')
        ?.addEventListener('click', doCopy);
    document.getElementById('btn-sc-copy-headers')
        ?.addEventListener('click', doCopyHeaders);
    document.getElementById('sc-with-header')
        ?.addEventListener('change', updateInfo);

    document.addEventListener('keydown', e => {
        if (!state.selectMode) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            sel = { type: 'all', r0: 0, r1: visibleRowIdxs.length, c0: 0, c1: numCols - 1 };
            updateHighlight();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            doCopy();
        }
    });
}
