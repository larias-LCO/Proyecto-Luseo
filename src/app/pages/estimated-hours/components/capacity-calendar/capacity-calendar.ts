import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';


@Component({
  selector: 'app-capacity-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule],
  templateUrl: './capacity-calendar.html',
  // Archivo SCSS principal para este componente: aquí puedes añadir reglas
  // globales para el calendario (encabezados, filas, contenedores, etc.).
  // Para estilos específicos de la tabla (header / celdas / filas) también
  // puedes apuntar a las clases que se comentan más abajo.
  styleUrls: ['./capacity-calendar.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CapacityCalendar implements OnInit, OnDestroy {

  constructor(private cd: ChangeDetectorRef) {}


  
// El estado del calendario se ha movido aquí para que el componente sea autónomo.
  currentMonth = new Date();

  weeks: { start: Date; end: Date; field: string }[] = [];

  columnDefs: ColDef[] = [];

  rowData: any[] = [];

  maxHours = 160; // o el valor que venga de la Tabla 1

// Control de altura de fila (forma correcta de establecer la altura de fila)
  rowHeight = 70;

  // Mensaje rojo y prohibir guardar si se supera el límite
hasOverLimit = false;
canSave = true;

  // === Estilos de filas ===
  // La altura y estilos de las filas se controlan aquí mediante `rowHeight`,
  // `getRowHeight()` y `setRowHeight()`. Si quieres aplicar clases CSS por
  // fila, añade `rowClass` o `getRowClass` en `gridOptions`/`ag-grid` cuando
  // inicialices la grilla (por ejemplo en `onGridReady`). También puedes
  // sobrescribir estilos en `capacity-calendar.scss` usando selectores como
  // `.ag-row` o `.ag-row .ag-cell`.

  private gridApi: any = null;
  private gridColumnApi: any = null;
  private resizeHandler: any = null;
  // Control de encabezado (propiedades de AG Grid)
  // Valores aumentados temporalmente para pruebas visuales del header height
  headerHeight = 70; // antes 56
  groupHeaderHeight = 67; // antes 48
  floatingFiltersHeight = 69; // antes 40

 // --- Añadir el estado de la interfaz de usuario del rol ---
  showAddRoleForm = false;
  selectedRoleId: string | null = null;



  // Funcion central que valida TODA la tabla 
  validateTotals(): void {
  if (!this.gridApi) return;

  let overLimit = false;

  this.gridApi.forEachNode((node: any) => {
    let total = 0;

    this.weeks.forEach(week => {
      total += Number(node.data?.[week.field]?.hours || 0);
    });

    // Determinar el límite aplicable para ESTA fila basándose EXCLUSIVAMENTE
    // en los valores provistos por la Tabla 1 (`roleLimit` o `maxHours`).
    // Si no existe un límite explícito para la fila, NO se considera sobrepasada
    // aunque supere el `this.maxHours` global.
    let rowLimit: number | null = null;
    if (node.data && node.data.roleLimit != null) {
      rowLimit = Number(node.data.roleLimit);
    } else if (node.data && node.data.maxHours != null) {
      rowLimit = Number(node.data.maxHours);
    }

    if (rowLimit != null && total > rowLimit) {
      overLimit = true;
    }
  });

  this.hasOverLimit = overLimit;
  this.canSave = !overLimit;

  // Forzar actualización de la vista en caso de que el evento de input
  // provenga de listeners DOM creados manualmente (fuera del ciclo de
  // detección de Angular). Esto asegura que `*ngIf="hasOverLimit"`
  // actualice inmediatamente el DOM.
  try { this.cd.detectChanges(); } catch (e) { /* ignore */ }

  console.log('overLimit', overLimit);
}


  // Roles predefinidos que el usuario puede agregar (personalice según sea necesario)
  roles: { id: string; name: string }[] = [
    { id: 'r1', name: '🛠️ Engineer 2, Mechanical' },
    { id: 'r2', name: '🛠️ Modeler 2, Mechanical' },
    { id: 'r3', name: '⚡ Engineer 2, Electrical' },
    { id: 'r4', name: '⚡ Modeler 2, Electrical' },
    { id: 'r5', name: '⚙️ Engineer 2, Plumbing / FP' },
    { id: 'r6', name: '⚙️ Modeler 2, Plumbing' },
    { id: 'r7', name: '⚙️ Modeler 2, FP' },
    { id: 'r8', name: '🧑‍💼 BIM, Manager 2' },
    { id: 'r9', name: '🧑‍💼 Modeler 2, BIM Team' }
  ];

  toggleAddRole() {
    this.showAddRoleForm = !this.showAddRoleForm;
    if (!this.showAddRoleForm) this.selectedRoleId = null;
  }

  confirmAddRole() {
    if (!this.selectedRoleId) return;
    const role = this.roles.find(r => r.id === this.selectedRoleId);
    if (!role) return;

    const row: any = { userName: role.name, id: role.id };
    // initialize week fields for the new row
    this.weeks.forEach(week => {
      row[week.field] = { hours: 0, capacity: 40, tooltip: `Timesheet: 0h\nCapacity: 40h\nPlanned: 0h\nAvailable: 40h\n` };
    });

    this.rowData = [...this.rowData, row];

    // if grid API is ready, set the new data
    if (this.gridApi && typeof this.gridApi.setRowData === 'function') {
      this.gridApi.setRowData(this.rowData);
    }

    // reset form
    this.selectedRoleId = null;
    this.showAddRoleForm = false;
  }

  // Marca y resalta una fila por un tiempo determinado (ms)
  highlightRow(index: number, duration = 3000) {
    if (typeof index !== 'number' || index < 0 || index >= this.rowData.length) return;
    const row = this.rowData[index];
    if (!row) return;
    row.__justCreated = true;
    if (this.gridApi && typeof this.gridApi.setRowData === 'function') {
      this.gridApi.setRowData(this.rowData);
    }

    setTimeout(() => {
      row.__justCreated = false;
      if (this.gridApi && typeof this.gridApi.setRowData === 'function') {
        this.gridApi.setRowData(this.rowData);
      }
    }, duration);
  }

  addRowAfter(index: number, roleName: string) {
    const newRow: any = { userName: roleName };
    this.weeks.forEach(week => {
      newRow[week.field] = { hours: 0, capacity: 40, tooltip: `Timesheet: 0h\nCapacity: 40h\nPlanned: 0h\nAvailable: 40h\n` };
    });

    if (typeof index !== 'number' || index < 0 || index >= this.rowData.length) {
      this.rowData = [...this.rowData, newRow];
    } else {
      const copy = [...this.rowData];
      copy.splice(index + 1, 0, newRow);
      this.rowData = copy;
    }

    if (this.gridApi && typeof this.gridApi.setRowData === 'function') {
      this.gridApi.setRowData(this.rowData);
    }
    // resaltar la fila que se acaba de insertar
    const insertIndex = (typeof index !== 'number' || index < 0 || index >= this.rowData.length) ? (this.rowData.length - 1) : (index + 1);
    this.highlightRow(insertIndex, 2800);
  }

  onGridReady(event: any) {
    this.gridApi = event.api;
    this.gridColumnApi = event.columnApi;

    
   // dimensiona las columnas para que se ajusten al ancho disponible para evitar la barra de desplazamiento horizontal
    setTimeout(() => {
      try {
        if (this.gridApi && typeof this.gridApi.sizeColumnsToFit === 'function') {
          this.gridApi.sizeColumnsToFit();
        }
      } catch (e) { /* ignore */ }
    }, 0);

    // keep columns fitted on window resize
    this.resizeHandler = () => {
      try {
        if (this.gridApi && typeof this.gridApi.sizeColumnsToFit === 'function') {
          this.gridApi.sizeColumnsToFit();
        }
      } catch (e) { /* ignore */ }
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  setRowHeight(height: number) {
    this.rowHeight = height;
    if (this.gridApi && typeof this.gridApi.resetRowHeights === 'function') {
      this.gridApi.resetRowHeights();
    }
  }

  getRowHeight = (params: any) => {
    return this.rowHeight;
  };

  // Para que AG Grid aplique una clase por fila basada en datos
  getRowClass = (params: any) => {
    return params && params.data && params.data.__justCreated ? 'new-row-highlight' : '';
  };
  
  setHeaderHeight(h: number) {
    this.headerHeight = h;
    if (this.gridApi && typeof this.gridApi.refreshHeader === 'function') {
      this.gridApi.refreshHeader();
    }
  }

  setGroupHeaderHeight(h: number) {
    this.groupHeaderHeight = h;
    if (this.gridApi && typeof this.gridApi.refreshHeader === 'function') {
      this.gridApi.refreshHeader();
    }
  }

  setFloatingFiltersHeight(h: number) {
    this.floatingFiltersHeight = h;
    if (this.gridApi && typeof this.gridApi.refreshHeader === 'function') {
      this.gridApi.refreshHeader();
    }
  }
//====================================================================================

  ngOnInit(): void {
this.generateWeeks(this.currentMonth, 1); // genera 1 mes (actual)
this.buildColumns();
this.buildRows();
  }

// En capacity-calendar.ts
generateWeeks(date: Date, monthsCount = 1): void {
  
  this.weeks = [];
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + monthsCount, 0);
  let current = new Date(firstDay);
  current.setDate(current.getDate() - current.getDay()); // domingo inicial

  while (current <= lastDay) {
    const start = new Date(current);
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    this.weeks.push({ start, end, field: `week_${start.toISOString()}` });
    current.setDate(current.getDate() + 7);
  }
}

// Navegar mes a mes (prev/next)
// Añade métodos para cambiar currentMonth y regenerar:
prevMonth() {
  this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  this.generateWeeks(this.currentMonth);
  this.buildColumns();
  this.buildRows();
}
nextMonth() {
  this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  this.generateWeeks(this.currentMonth);
  this.buildColumns();
  this.buildRows();
}

  buildColumns(): void {
    this.columnDefs = [
    // La primera columna muestra el nombre del rol y un botón "Añadir" por fila.
      {
        headerName: 'Roles',
        headerClass: 'role-column', 
        field: 'userName',
        pinned: 'left',
        width: 310,
        // === Encabezado de la primera columna (Roles) ===
        // `headerClass: 'role-column'` apunta a la clase del header. Añade
        // reglas en `capacity-calendar.scss` para estilizar este header
        // (por ejemplo `.ag-header-cell.role-column` o `.role-column`).
        
        cellRenderer: (params: any) => {
          const container = document.createElement('div');
          // Contenedor de la celda de rol: estilos en SCSS (`.role-cell-container`)
          container.className = 'role-cell-container';

          const name = document.createElement('div');
          name.textContent = params && params.value ? params.value : '';
          name.className = 'role-name';

          const btn = document.createElement('button');
          btn.textContent = '+';
          btn.className = 'add-role-inline-btn';

          // small popup form
          let popup: HTMLDivElement | null = null;

          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popup) {
              popup.remove();
              popup = null;
              return;
            }

            popup = document.createElement('div');
            popup.className = 'add-role-popup';

            const select = document.createElement('select');
            select.className = 'add-role-select';
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = 'Select role...';
            popup.appendChild(select);

            (this.roles || []).forEach(r => {
              const opt = document.createElement('option');
              opt.value = r.id;
              opt.textContent = r.name;
              select.appendChild(opt);
            });

            const createBtn = document.createElement('button');
            createBtn.textContent = 'Create';
            createBtn.className = 'add-role-create';
            popup.appendChild(createBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'add-role-cancel';
            popup.appendChild(cancelBtn);

            createBtn.addEventListener('click', () => {
              const roleId = select.value;
              if (!roleId) return;
              const role = this.roles.find(rr => rr.id === roleId);
              const insertIndex = (params && params.node && typeof params.node.rowIndex === 'number') ? params.node.rowIndex : -1;
              this.addRowAfter(insertIndex, role ? role.name : 'New Role');
              if (popup) { popup.remove(); popup = null; }
            });

            cancelBtn.addEventListener('click', () => { if (popup) { popup.remove(); popup = null; } });

            // Colocar la ventana emergente relativa al botón
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            popup.style.left = rect.left + 'px';
            popup.style.top = (rect.bottom + window.scrollY) + 'px';

            document.body.appendChild(popup);
          });

          container.appendChild(name);
          container.appendChild(btn);
          return container;
        }
      },

      // === Columnas semanales dinámicas, las columnas que tienen los input, es decir, los que dicen las fechas de las semanas ===//
      ...this.weeks.map((week, i) => ({
        headerClass: 'week-column',
        cellClass: 'week-column',
        headerName: `${week.start.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })} - ${week.end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })}`,
        field: week.field,
        width: 326,
        // === Encabezado de columna semanal ===
        // Los headers de semana se crean dinámicamente (ver `headerName`).
        // Si quieres aplicar estilo al header de estas columnas usa
        // selectores como `.ag-header-cell` junto con el texto o un
        // `headerClass` adicional aquí.
        // Renderizador que devuelve un elemento de entrada para que cada celda muestre una entrada numérica
        cellRenderer: (params: any) => {
          const container = document.createElement('div');
          container.className = 'week-cell-container';

          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'ag-cell-input capacity-input';
          const fieldName = params && params.colDef && params.colDef.field;
          const initialHours = (params && params.data && fieldName && params.data[fieldName] && params.data[fieldName].hours != null)
            ? String(params.data[fieldName].hours)
            : '0';
          input.value = initialHours;
          input.min = '0';

          // actualizar datos cuando cambie el valor
          input.addEventListener('input', (e: Event) => {
            const v = Number((e.target as HTMLInputElement).value || 0);
            if (!params.data) return;
            // if (!params.data[params.colDef.field]) params.data[params.colDef.field] = { hours: 0, capacity: 40 };

           // guardar el valor SIN perderlo
            const field = params.colDef && params.colDef.field;
            if (!field) return;

            // guardar valor sin perderlo
            if (!params.data[field]) {
              params.data[field] = { hours: v, capacity: 40, tooltip: '' };
            } else {
              params.data[field].hours = v;
            }

            // sincronizar AG Grid (sin re-render del input)
           try {
                params.node?.setDataValue(field, params.data[field]);
           } catch { }

           // 🔥 refrescar SOLO el TOTAL
             try {
               params.api.refreshCells({ rowNodes: [params.node], columns: ['total'], force: true });
             } catch { }

              //  validar toda la tabla
                this.validateTotals();

            // Asegúrese de que el valor interno de AG Grid se actualice para que las nuevas representaciones conserven el nuevo valor
            // try {
            //   if (params.node && typeof params.node.setDataValue === 'function') {
            //     params.node.setDataValue(field, params.data[field]);
            //   }
            // } catch (err) { /* ignore */ }


              // si es la primera columna
              if (
                 i === 0 &&
                 params.data?.id &&
                  typeof (this as any).onRealChange === 'function' ) {
              try {
                (this as any).onRealChange(params.data.id, v);
                } catch { }
                  }
            // si es la primera columna de inputs, llamar onRealChange
            // if (
            //   i === 0 &&
            //   params.data &&
            //   params.data.id &&
            //   typeof (this as any).onRealChange === 'function'
            // ) {
            //   try {
            //     (this as any).onRealChange(params.data.id, v);
            //   } catch (err) { /* ignore */ }
            // }

           //  recalcula el TOTAL en tiempo real
          // Evitar forzar una actualización de celda en cada pulsación de tecla, ya que eso hace que la celda se vuelva a renderizar y la entrada pierda el foco/caret, haciendo que la escritura sea invisible. Actualizar una vez en blur o Enter en su lugar.
          });

      // Actualizar SOLO la columna Total en tiempo real para que la entrada
      // El DOM de la celda no se vuelva a renderizar y la escritura permanezca visible.
          try {
            params.api.refreshCells({ rowNodes: [params.node], columns: ['total'] });
          } catch (err) { /* ignore */ }

          // También actualice el total al desenfocar (retroceder) y confirme al ingresar
          input.addEventListener('blur', () => {
            try { params.api.refreshCells({ rowNodes: [params.node], columns: ['total'] }); } catch (err) { /* ignore */ }
          });

          input.addEventListener('keydown', (ev: KeyboardEvent) => {
          if (ev.key === 'Enter') {
           ev.preventDefault();
          (ev.target as HTMLElement).blur();
            }
            });


          container.appendChild(input);
          return container;
        }

        
      })),

      

        // COLUMNA QUE CALCULA EL TOTAL DE HORAS
      {
        headerName: 'Total',
        colId: 'total',
        width: 140,
        pinned: 'right',
        valueGetter: (params: any) => {
          // if (!params.data) return 0;
          let total = 0;

          this.weeks.forEach(week => {
            // const cell = params.data[week.field];
            total += Number(params.data?.[week.field]?.hours || 0);
        });

          return total;
        },
        cellClass: 'total-column',
        headerClass: 'total-column',

        cellClassRules: {
    'total-ok': (params: any) => {
      const data = params.data || {};
      const explicit = data.roleLimit != null ? Number(data.roleLimit) : (data.maxHours != null ? Number(data.maxHours) : null);
      // Si no hay límite explícito para la fila, consideramos OK (no mostrar rojo)
      if (explicit == null) return true;
      return Number(params.value) <= explicit;
    },
    'total-exceeded': (params: any) => {
      const data = params.data || {};
      const explicit = data.roleLimit != null ? Number(data.roleLimit) : (data.maxHours != null ? Number(data.maxHours) : null);
      return explicit != null && Number(params.value) > explicit;
    }
  }
      }
    ];
  }

  
  // Forzar estilo de fila (borde inferior) usando getRowStyle de AG Grid
  getRowStyle = (params: any) => {
    return { borderBottom: '1px solid rgba(0,0,0,0.08)', boxSizing: 'border-box' };
  };


  
  // ESTOS SON LOS ROLES FIJOS QUE APARECEN EN LA TABLA
  buildRows(): void {
    const users = [
      { id: '1', name: '🛠️ Engineer, Mechanical' },
      { id: '2', name: '🛠️ Modeler 1, Mechanical' },
      { id: '3', name: '⚡ Engineer, Electrical' },
      { id: '4', name: '⚡ Modeler 1, Electrical' },
      { id: '5', name: '⚙️ Engineer, Plumbing / FP' },
      { id: '6', name: '⚙️ Modeler, Plumbing' },
      { id: '7', name: '⚙️ Modeler, FP' },
      { id: '8', name: '🧑‍💼 BIM, Manager' },
      { id: '9', name: '🧑‍💼 Modeler, BIM Team' },
    ];

    this.rowData = users.map(user => {
      const row: any = {
        userName: user.name,
        id: user.id
      };

      this.weeks.forEach(week => {
        row[week.field] = {
          hours: 0,
          capacity: 40,
          tooltip: `\nTimesheet: 4h\nCapacity: 40h\nPlanned: 28h\nAvailable: 12h\n`
        };
      });

      return row;
    });
  }

  // Sincroniza límites y capacidades desde la "Tabla 1" (u otra fuente externa).
  // tableRows: Array de objetos con { id, roleLimit?, maxHours?, capacities? }
  // - `id` debe coincidir con `row.id` en `rowData`.
  // - `roleLimit` y `maxHours` sobrescriben el límite por fila.
  // - `capacities` (opcional) es un array numérico con la capacidad por semana.
  syncWithTable1(tableRows: Array<any>): void {
    if (!Array.isArray(tableRows) || !this.rowData) return;

 

    // Build quick lookup maps by id and by normalized name
    const byId = new Map<string, any>();
    const incomingList: any[] = [];
    tableRows.forEach((r: any) => {
      if (r == null) return;
      incomingList.push(r);
      if (r.id != null) byId.set(String(r.id), r);
    });
    

    const normalize = (s: string | undefined | null) => (
      (s || '')
        .replace(/[\p{Emoji}\p{Punctuation}···,\*]/gu, ' ')
        .replace(/[^\p{L}\p{N} ]+/gu, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 1)
    );

    const tokenOverlap = (a: string, b: string) => {
      const ta = normalize(a);
      const tb = normalize(b);
      if (!ta.length || !tb.length) return 0;
      const setB = new Set(tb);
      return ta.reduce((acc, t) => acc + (setB.has(t) ? 1 : 0), 0);
    };

    let changed = false;

    const unmatchedIncoming = new Set(incomingList);
    const mappingLog: any[] = [];

    this.rowData.forEach(row => {
      if (!row) return;

      // 1) try by id
      let incoming = null;
      if (row.id != null) incoming = byId.get(String(row.id));

      // 2) try exact normalized name match
      if (!incoming && row.userName) {
        const rowKey = (row.userName || '').trim().toLowerCase();
        incoming = incomingList.find(r => {
          const name = (r.roleName || r.name || r.userName || '').trim().toLowerCase();
          return name && name === rowKey;
        });
      }

      // 3) fuzzy token overlap if still not found
      if (!incoming && row.userName) {
        let best: any = null;
        let bestScore = 0;
        incomingList.forEach(r => {
          const name = r.roleName || r.name || r.userName || '';
          const score = tokenOverlap(row.userName || '', name || '');
          if (score > bestScore) {
            bestScore = score;
            best = r;
          }
        });
        // choose best only if reasonable match
        if (bestScore >= 1) incoming = best;
      }

      if (!incoming) {
        mappingLog.push({ row: row.userName, matched: null });
        return;
      }

      // mark incoming as matched
      try { unmatchedIncoming.delete(incoming); } catch (e) {}

      mappingLog.push({ row: row.userName, matched: incoming.roleName || incoming.name || incoming.userName || null });

      if (incoming.roleLimit != null) {
        const newLimit = Number(incoming.roleLimit);
        if (row.roleLimit !== newLimit) {
          row.roleLimit = newLimit;
          changed = true;
        }
      }
      if (incoming.maxHours != null) {
        const newMax = Number(incoming.maxHours);
        if (row.maxHours !== newMax) {
          row.maxHours = newMax;
          changed = true;
        }
      }

      if (Array.isArray(incoming.capacities) && this.weeks && this.weeks.length) {
        this.weeks.forEach((w, i) => {
          if (!row[w.field]) row[w.field] = { hours: 0, capacity: 0, tooltip: '' };
          const newCap = Number(incoming.capacities[i] ?? row[w.field].capacity ?? 0);
          if (row[w.field].capacity !== newCap) {
            row[w.field].capacity = newCap;
            changed = true;
          }
        });
      }
    });

    if (changed) {
      try {
        if (this.gridApi && typeof this.gridApi.setRowData === 'function') {
          this.gridApi.setRowData(this.rowData);
        } else if (this.gridApi && typeof this.gridApi.refreshCells === 'function') {
          this.gridApi.refreshCells();
        }
      } catch (e) { /* ignore */ }

     
      this.validateTotals();
    }
  }

  

}
