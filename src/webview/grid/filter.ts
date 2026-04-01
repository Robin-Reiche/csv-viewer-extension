import type { ColType } from '../types';

export function createCombinedFilter(colType: ColType): any {
    return class {
        params: any;
        allValues: string[] = [];
        hasBlank = false;
        checkedValues = new Set<string>();
        condType = 'none';
        condValue = '';
        eGui!: HTMLElement;
        _searchQuery = '';
        truncated = false;

        init(params: any) {
            this.params = params;
            this._buildValueList();
            this.checkedValues = new Set(this.allValues);
            if (this.hasBlank) this.checkedValues.add('__blank__');
            this.eGui = document.createElement('div');
            this.eGui.className = 'csv-filter-panel';
            this._render();
        }

        _buildValueList() {
            const field = this.params.column.getColId();
            const vals = new Set<string>();
            this.hasBlank = false;
            this.params.api.forEachNode((n: any) => {
                const v = n.data[field];
                if (v == null || String(v).trim() === '') { this.hasBlank = true; return; }
                vals.add(String(v));
            });
            let arr = Array.from(vals);
            if (colType === 'integer' || colType === 'float') {
                arr.sort((a, b) => Number(a) - Number(b));
            } else {
                arr.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
            }
            this.allValues = arr.slice(0, 2000);
            this.truncated = arr.length > 2000;
        }

        _conditions() {
            if (colType === 'integer' || colType === 'float') {
                return [
                    { id: 'none', label: '\u2014 No condition \u2014' },
                    { id: 'eq',  label: '= Equals' },
                    { id: 'neq', label: '\u2260 Does not equal' },
                    { id: 'gt',  label: '> Greater than' },
                    { id: 'gte', label: '\u2265 Greater than or equal' },
                    { id: 'lt',  label: '< Less than' },
                    { id: 'lte', label: '\u2264 Less than or equal' },
                    { id: 'blank',    label: 'Is blank' },
                    { id: 'notblank', label: 'Is not blank' },
                ];
            } else if (colType === 'date' || colType === 'datetime' || colType === 'time') {
                return [
                    { id: 'none', label: '\u2014 No condition \u2014' },
                    { id: 'eq',  label: '= Equals' },
                    { id: 'neq', label: '\u2260 Does not equal' },
                    { id: 'gt',  label: '> After' },
                    { id: 'gte', label: '\u2265 After or on' },
                    { id: 'lt',  label: '< Before' },
                    { id: 'lte', label: '\u2264 Before or on' },
                    { id: 'blank',    label: 'Is blank' },
                    { id: 'notblank', label: 'Is not blank' },
                ];
            } else {
                return [
                    { id: 'none',        label: '\u2014 No condition \u2014' },
                    { id: 'contains',    label: 'Contains' },
                    { id: 'notcontains', label: 'Does not contain' },
                    { id: 'eq',          label: 'Equals' },
                    { id: 'neq',         label: 'Does not equal' },
                    { id: 'startswith',  label: 'Begins with' },
                    { id: 'endswith',    label: 'Ends with' },
                    { id: 'blank',       label: 'Is blank' },
                    { id: 'notblank',    label: 'Is not blank' },
                ];
            }
        }

        _render() {
            this.eGui.innerHTML = '';
            const isNumeric = colType === 'integer' || colType === 'float';
            const isDate    = colType === 'date'    || colType === 'datetime';
            const needsInput = this.condType !== 'none' && this.condType !== 'blank' && this.condType !== 'notblank';

            // Condition section
            const condSec = document.createElement('div');
            condSec.className = 'csv-filter-section';
            const condLabel = document.createElement('div');
            condLabel.className = 'csv-filter-section-label';
            condLabel.textContent = 'Condition';
            condSec.appendChild(condLabel);

            const sel = document.createElement('select');
            sel.className = 'csv-filter-select';
            this._conditions().forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.label;
                if (c.id === this.condType) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.addEventListener('change', () => {
                this.condType = sel.value;
                this.condValue = '';
                this._render();
                this.params.filterChangedCallback();
            });
            condSec.appendChild(sel);

            if (needsInput) {
                const inp = document.createElement('input');
                inp.className = 'csv-filter-input';
                inp.type = isNumeric ? 'number' : isDate ? 'date' : 'text';
                inp.value = this.condValue;
                inp.placeholder = isNumeric ? 'Enter value\u2026' : 'Filter\u2026';
                inp.addEventListener('input', () => {
                    this.condValue = inp.value;
                    this.params.filterChangedCallback();
                });
                condSec.appendChild(inp);
            }
            this.eGui.appendChild(condSec);

            // Values section
            const valSec = document.createElement('div');
            valSec.className = 'csv-filter-section';
            const valLabel = document.createElement('div');
            valLabel.className = 'csv-filter-section-label';
            valLabel.textContent = 'Values';
            valSec.appendChild(valLabel);

            const searchInp = document.createElement('input');
            searchInp.className = 'csv-filter-input';
            searchInp.style.marginTop = '0';
            searchInp.placeholder = 'Search values\u2026';
            searchInp.value = this._searchQuery;
            valSec.appendChild(searchInp);

            const actions = document.createElement('div');
            actions.className = 'csv-filter-actions';

            const selAll = document.createElement('button');
            selAll.className = 'csv-filter-link';
            selAll.textContent = 'Select All';
            selAll.addEventListener('click', () => {
                this.allValues.forEach(v => this.checkedValues.add(v));
                if (this.hasBlank) this.checkedValues.add('__blank__');
                renderList();
                this.params.filterChangedCallback();
            });
            const deselAll = document.createElement('button');
            deselAll.className = 'csv-filter-link';
            deselAll.textContent = 'Deselect All';
            deselAll.addEventListener('click', () => {
                this.checkedValues.clear();
                renderList();
                this.params.filterChangedCallback();
            });
            actions.appendChild(selAll);
            actions.appendChild(deselAll);
            valSec.appendChild(actions);

            const listDiv = document.createElement('div');
            listDiv.className = 'csv-filter-values-list';
            valSec.appendChild(listDiv);

            const renderList = () => {
                listDiv.innerHTML = '';
                const q = this._searchQuery.toLowerCase();
                let items: { label: string; value: string; isBlank: boolean }[] = [];
                if (this.hasBlank) items.push({ label: '(Blank)', value: '__blank__', isBlank: true });
                this.allValues.forEach(v => items.push({ label: v, value: v, isBlank: false }));
                if (q) items = items.filter(it => it.label.toLowerCase().includes(q));

                if (items.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'csv-filter-empty';
                    empty.textContent = 'No matching values';
                    listDiv.appendChild(empty);
                    return;
                }
                items.forEach(item => {
                    const row = document.createElement('label');
                    row.className = 'csv-filter-value-row';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = this.checkedValues.has(item.value);
                    cb.addEventListener('change', () => {
                        if (cb.checked) this.checkedValues.add(item.value);
                        else this.checkedValues.delete(item.value);
                        this.params.filterChangedCallback();
                    });
                    const span = document.createElement('span');
                    span.className = 'csv-filter-value-label' + (item.isBlank ? ' blank' : '');
                    span.textContent = item.label;
                    row.appendChild(cb);
                    row.appendChild(span);
                    listDiv.appendChild(row);
                });
                if (this.truncated && !q) {
                    const note = document.createElement('div');
                    note.className = 'csv-filter-empty';
                    note.textContent = 'Showing first 2000 unique values';
                    listDiv.appendChild(note);
                }
            };

            searchInp.addEventListener('input', () => {
                this._searchQuery = searchInp.value;
                renderList();
            });
            renderList();
            this.eGui.appendChild(valSec);
        }

        getGui() { return this.eGui; }

        isFilterActive() {
            if (this.condType !== 'none') return true;
            const allChecked = this.allValues.every(v => this.checkedValues.has(v));
            return this.hasBlank ? !(allChecked && this.checkedValues.has('__blank__')) : !allChecked;
        }

        doesFilterPass(params: any) {
            const field  = this.params.column.getColId();
            const raw    = params.data[field];
            const valStr = raw != null ? String(raw).trim() : '';
            const isBlank = valStr === '';

            const allChecked = this.allValues.every(v => this.checkedValues.has(v)) &&
                (!this.hasBlank || this.checkedValues.has('__blank__'));
            if (!allChecked) {
                const key = isBlank ? '__blank__' : valStr;
                if (!this.checkedValues.has(key)) return false;
            }

            const ct = this.condType;
            if (ct === 'none') return true;
            if (ct === 'blank') return isBlank;
            if (ct === 'notblank') return !isBlank;
            if (!this.condValue) return true;

            const cv = this.condValue;
            const isNumeric = colType === 'integer' || colType === 'float';
            const isDateType = colType === 'date' || colType === 'datetime' || colType === 'time';

            if (isNumeric) {
                const nCell = Number(valStr), nCond = Number(cv);
                if (isNaN(nCell)) return false;
                if (ct === 'eq')  return nCell === nCond;
                if (ct === 'neq') return nCell !== nCond;
                if (ct === 'gt')  return nCell > nCond;
                if (ct === 'gte') return nCell >= nCond;
                if (ct === 'lt')  return nCell < nCond;
                if (ct === 'lte') return nCell <= nCond;
            } else if (isDateType) {
                const dCell = new Date(valStr), dCond = new Date(cv);
                if (isNaN(dCell.getTime())) return false;
                const ds = dCell.toISOString().slice(0, 10);
                const dc = dCond.toISOString().slice(0, 10);
                if (ct === 'eq')  return ds === dc;
                if (ct === 'neq') return ds !== dc;
                if (ct === 'gt')  return dCell > dCond;
                if (ct === 'gte') return dCell >= dCond;
                if (ct === 'lt')  return dCell < dCond;
                if (ct === 'lte') return dCell <= dCond;
            } else {
                const lo = valStr.toLowerCase(), lc = cv.toLowerCase();
                if (ct === 'contains')    return lo.includes(lc);
                if (ct === 'notcontains') return !lo.includes(lc);
                if (ct === 'eq')          return lo === lc;
                if (ct === 'neq')         return lo !== lc;
                if (ct === 'startswith')  return lo.startsWith(lc);
                if (ct === 'endswith')    return lo.endsWith(lc);
            }
            return true;
        }

        getModel() {
            if (!this.isFilterActive()) return null;
            return { condType: this.condType, condValue: this.condValue, checkedValues: Array.from(this.checkedValues) };
        }

        setModel(model: any) {
            if (model == null) {
                this.condType = 'none'; this.condValue = ''; this._searchQuery = '';
                this.checkedValues = new Set(this.allValues);
                if (this.hasBlank) this.checkedValues.add('__blank__');
            } else {
                this.condType  = model.condType  || 'none';
                this.condValue = model.condValue || '';
                this.checkedValues = new Set(model.checkedValues || this.allValues);
            }
            this._render();
        }

        destroy() {}
    };
}
