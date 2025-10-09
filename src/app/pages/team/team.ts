import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FagregarMiembroComponent } from '../../core/components/fagregar-miembro/fagregar-miembro';

@Component({
  selector: 'app-team',
  standalone: true, 
  imports: [CommonModule, FagregarMiembroComponent],
  templateUrl: './team.html',
  styleUrls: ['./team.scss']
})

export class TeamComponent {
}

  export interface employees {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  billableRate?: number | string | null;
  state?: string | null;
  departmentName?: string | null;
  officeName?: string | null;
  jobPositionName?: string | null;
  accountUsername?: string | null;
  // permitir propiedades adicionales si el backend devuelve más campos
  [key: string]: any;
}

interface AppState {
  all: employees[];
  filtered: employees[];
  lastLoadedAt: number;
  page: number;
  pageSize: number;
}

declare global {
  interface Window {
    __applyFilters?: () => void;
  }
}

// ===== Configuración =====
/**
 * API_BASE: prefijo de la API.
 * - En blanco ("") usa el mismo origen del servidor que sirvió esta página.
 * - Si el backend vive en otro host/puerto, coloca aquí su base (y habilita CORS en el backend).
 *   Ej.: const API_BASE = "http://localhost:8080"
 */
const API_BASE: string = "https://boracic-preboding-shelley.ngrok-free.dev"; // mismo origen

// ===== Utilidades de texto =====
/**
 * normalizeText
 * Normaliza texto para comparaciones robustas de búsqueda.
 * - Pasa a minúsculas.
 * - Elimina tildes/diacríticos (NFD + regex de rango de combining marks).
 * - Colapsa espacios múltiples a uno y hace trim.
 * Retorna una cadena segura para comparisons case/accents-insensitive.
 */
function normalizeText(str: unknown): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * tokenize
 * Divide un texto normalizado en una lista de palabras (tokens) separadas por espacio.
 * Útil para habilitar búsqueda por múltiples términos en cualquier orden.
 */
function tokenize(str: unknown): string[] {
  const norm = normalizeText(str);
  if (!norm) return [];
  return norm.split(" ");
}

/**
 * matchesByTokens
 * Comprueba si el nombre del empleado contiene TODOS los tokens de la consulta.
 * - Insensible a mayúsculas/acentos.
 * - Usa comparación "contains" por cada token.
 * Si no hay tokens (consulta vacía), devuelve true (no filtra).
 */
function matchesByTokens(employeeName: unknown, query: unknown): boolean {
  const nameNorm = normalizeText(employeeName);
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  return tokens.every((t) => nameNorm.includes(t));
}

// ===== Filtro principal =====
/**
 * filterEmployees
 * Aplica de forma combinada los filtros:
 * - query por nombre (tokens contains, case/accents-insensitive)
 * - departmentName exacto (si se selecciona)
 * - jobPositionName exacto (si se selecciona)
 * - officeName exacto (si se selecciona)
 * - state exacto (si se selecciona)
 */
function filterEmployees(
  employees: employees[],
  options: {
    query?: string;
    department?: string;
    jobPosition?: string;
    office?: string;
    state?: string;
  }
): employees[] {
  const { query, department, jobPosition, office, state } = options;
  const q = normalizeText(query);
  return employees.filter((e) => {
    if (q && !matchesByTokens(e.name, q)) return false; // nombre
    if (department && (e.departmentName ?? "") !== department) return false; // depto
    if (jobPosition && (e.jobPositionName ?? "") !== jobPosition) return false; // puesto
    if (office && (e.officeName ?? "") !== office) return false; // NUEVO: oficina
    if (state && (e.state ?? "") !== state) return false; // estado
    return true;
  });
}

// ===== Debounce =====
/**
 * debounce
 * Envuelve una función para diferir su ejecución hasta que transcurre
 * un periodo sin nuevas invocaciones. Mejora rendimiento/UX al evitar
 * filtrar en cada pulsación de teclado.
 * @param fn  función original a ejecutar
 * @param wait milisegundos de espera (por defecto 250 ms)
 */
function debounce<T extends (...args: any[]) => any>(fn: T, wait = 250) {
  let t: number | null = null;
  return (...args: Parameters<T>) => {
    if (t !== null) {
      clearTimeout(t);
    }
    t = window.setTimeout(() => fn(...args), wait);
  };
}

// ===== Render =====
/**
 * renderEmployees
 * Pinta en el DOM la lista de empleados.
 * - Si la lista está vacía, muestra un mensaje "No hay resultados".
 * - Ordena por nombre (localeCompare con sensibilidad base) para una lista estable.
 * - Imprime campos de contexto para ayudar a desambiguar.
 */
function renderEmployees(list: employees[], container: HTMLElement): void {
  container.innerHTML = "";
  if (!list || list.length === 0) {
    container.innerHTML = "<li class='muted'>No hay resultados</li>";
    return;
  }
  const sorted = list
    .slice()
    .sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
    );
  const frag = document.createDocumentFragment();
  for (const emp of sorted) {
    const li = document.createElement("li");
    li.innerHTML = `
            <div class="name">${emp.name || "(Sin nombre)"}</div>
            <div class="meta">
              <span>Email: ${emp.email ?? "-"}</span>
              <span>Ganancia por hora: ${emp.billableRate ?? "-"}</span>
              <span>Estado: ${emp.state ?? "-"}</span>
              <span>Departamento: ${emp.departmentName ?? "-"}</span>
              <span>Oficina: ${emp.officeName ?? "-"}</span>
              <span>Puesto: ${emp.jobPositionName ?? "-"}</span>
              <span>Usuario: ${emp.accountUsername ?? "-"}</span>
            </div>
          `;
    frag.appendChild(li);
  }
  container.appendChild(frag);
}

// ===== Helpers de UI (poblar selects) =====
/**
 * uniqueSorted
 * Recibe una lista de valores (posiblemente repetidos/vacíos), limpia vacíos,
 * elimina duplicados y retorna un array ordenado alfabéticamente (insensible a acentos/mayúsculas).
 * Útil para poblar selectores de filtros con opciones únicas.
 */
function uniqueSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>(
    values
      .map((v) => (v ?? "").toString().trim())
      .filter((v) => v.length > 0)
  );
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

/**
 * populateSelect
 * Rellena un <select> con una opción inicial "Todos" y las opciones proporcionadas.
 * No selecciona ninguna opción en particular: deja el select en "Todos".
 */
function populateSelect(selectEl: HTMLSelectElement, options: string[]) {
  selectEl.innerHTML =
    '<option value="">Todos</option>' +
    options.map((o) => `<option value="${o}">${o}</option>`).join("");
}

// ===== Paginación =====
const VALID_PAGE_SIZES = [10, 20, 30] as const;

function getInitialPageSize(): number {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = parseInt(params.get("size") ?? "", 10);
  if (VALID_PAGE_SIZES.includes(fromUrl as any)) return fromUrl;
  const stored = parseInt(localStorage.getItem("employees.pageSize") ?? "", 10);
  if (VALID_PAGE_SIZES.includes(stored as any)) return stored;
  return 10;
}

function renderPaginationControls(
  container: HTMLElement,
  { page, totalPages }: { page: number; totalPages: number }
) {
  container.innerHTML = "";
  const frag = document.createDocumentFragment();

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = page <= 1;
  prevBtn.addEventListener("click", () => setPage(page - 1));

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.textContent = "Siguiente";
  nextBtn.disabled = page >= totalPages;
  nextBtn.addEventListener("click", () => setPage(page + 1));

  const info = document.createElement("span");
  info.className = "page-info";
  info.textContent = `Página ${page} de ${totalPages}`;

  frag.appendChild(prevBtn);
  frag.appendChild(info);
  frag.appendChild(nextBtn);
  container.appendChild(frag);
}

// ===== App =====
const state: AppState = {
  all: [],
  filtered: [],
  lastLoadedAt: 0,
  page: 1,
  pageSize: getInitialPageSize(),
};

/**
 * fetchEmployees
 * Llama al endpoint GET /employees y devuelve la lista completa de empleados
 * en formato JSON (EmployeeResponseDto). Lanza error si la respuesta no es 2xx.
 */
async function fetchEmployees(): Promise<employees[]> {
  try {
    const url = `${API_BASE}/employees`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true"
      }
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Error ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];

  } catch (error: any) {
    console.error("Error al cargar empleados:", error.message || error);
    return [];
  }
}



/**
 * refreshData
 * Vuelve a solicitar /employees, repuebla los selectores y vuelve a aplicar los filtros actuales.
 * @param keepFilters si true, intenta mantener selección actual de filtros
 * @param silent si true, no altera el mensaje de estado salvo conteo
 */
async function refreshData({
  keepFilters = true,
  silent = false,
}: { keepFilters?: boolean; silent?: boolean } = {}) {
  const $status = document.getElementById("status");
  const $error = document.getElementById("error");
  const $department = document.getElementById("departmentFilter") as HTMLSelectElement | null;
  const $job = document.getElementById("jobFilter") as HTMLSelectElement | null;
  const $office = document.getElementById("officeFilter") as HTMLSelectElement | null;
  const $state = document.getElementById("stateFilter") as HTMLSelectElement | null;
  const $input = document.getElementById("searchInput") as HTMLInputElement | null;
  const $pageSize = document.getElementById("pageSize") as HTMLSelectElement | null;

  // Guardar selección actual si se desea conservar
  const prev = keepFilters
    ? {
        q: $input?.value ?? "",
        department: $department?.value ?? "",
        job: $job?.value ?? "",
        office: $office?.value ?? "",
        state: $state?.value ?? "",
        pageSize: parseInt($pageSize?.value ?? String(state.pageSize), 10) || state.pageSize,
        page: state.page,
      }
    : { q: "", department: "", job: "", office: "", state: "", pageSize: state.pageSize, page: 1 };

  if (!silent && $status) $status.textContent = "Actualizando datos...";
  try {
    const data = await fetchEmployees();
    state.all = Array.isArray(data) ? data : [];
    state.lastLoadedAt = Date.now();
    // Repoblar opciones únicas
    const deptOptions = uniqueSorted(state.all.map((e) => e.departmentName ?? ""));
    const jobOptions = uniqueSorted(state.all.map((e) => e.jobPositionName ?? ""));
    const officeOptions = uniqueSorted(state.all.map((e) => e.officeName ?? ""));
    const stateOptions = uniqueSorted(state.all.map((e) => e.state ?? ""));
    if ($department) populateSelect($department, deptOptions);
    if ($job) populateSelect($job, jobOptions);
    if ($office) populateSelect($office, officeOptions);
    if ($state) populateSelect($state, stateOptions);
    // Restaurar selección si procede
    if ($input) $input.value = prev.q;
    if (prev.department && $department) $department.value = prev.department;
    if (prev.job && $job) $job.value = prev.job;
    if (prev.office && $office) $office.value = prev.office;
    if (prev.state && $state) $state.value = prev.state;
    // Tamaño de página preferido
    state.pageSize = prev.pageSize;
    const pageSizeEl = document.getElementById("pageSize") as HTMLSelectElement | null;
    if (pageSizeEl) pageSizeEl.value = String(state.pageSize);
    // Página actual (se ajustará dentro de applyFilters si excede)
    state.page = prev.page || 1;
    // Reaplicar filtros y renderizar
    if (typeof window.__applyFilters === "function") {
      window.__applyFilters();
    }
    if (!silent && $status) $status.textContent = `Cargados ${state.all.length} empleados.`;
  } catch (err: any) {
    if ($error) {
      $error.style.display = "inline";
      $error.textContent = `Fallo al actualizar: ${err?.message ?? String(err)}`;
    }
  }
}

/**
 * maybeAutoRefresh
 * Revalida datos cuando la pestaña recupera el foco, si han pasado >60 s desde la última carga.
 * Minimiza impacto en rendimiento y mantiene datos razonablemente frescos.
 */
async function maybeAutoRefresh() {
  const ONE_MIN = 60 * 1000;
  if (Date.now() - state.lastLoadedAt > ONE_MIN) {
    await refreshData({ keepFilters: true, silent: true });
  }
}

/**
 * syncFiltersToUrl
 * Escribe los filtros actuales en la URL (query string) sin recargar la página.
 * Permite compartir el enlace y que, al abrirlo, la vista se reconstruya con los filtros aplicados.
 */
function syncFiltersToUrl(options: {
  q?: string;
  department?: string;
  jobPosition?: string;
  office?: string;
  state?: string;
  page?: number;
  size?: number;
}) {
  const { q, department, jobPosition, office, state: stateParam, page, size } = options;
  const params = new URLSearchParams(window.location.search);
  // Escribir solo parámetros con valor; limpiar los vacíos
  if (q && q.trim()) params.set("q", q.trim());
  else params.delete("q");
  if (department) params.set("department", department);
  else params.delete("department");
  if (jobPosition) params.set("job", jobPosition);
  else params.delete("job");
  if (office) params.set("office", office);
  else params.delete("office");
  if (stateParam) params.set("state", stateParam);
  else params.delete("state");
  // Paginación
  if (page && page > 1) params.set("page", String(page));
  else params.delete("page");
  if (size && (VALID_PAGE_SIZES as readonly number[]).includes(size) && size !== 10) params.set("size", String(size));
  else params.delete("size");
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * readFiltersFromUrl
 * Lee la query string inicial para preconfigurar la vista al compartir enlaces con filtros.
 */
function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const size = parseInt(params.get("size") ?? "", 10);
  return {
    q: params.get("q") ?? "",
    department: params.get("department") ?? "",
    jobPosition: params.get("job") ?? "",
    office: params.get("office") ?? "",
    state: params.get("state") ?? "",
    page,
    size: (VALID_PAGE_SIZES as readonly number[]).includes(size) ? size : undefined,
  };
}

function setPage(newPage: number) {
  state.page = Math.max(1, newPage);
  if (typeof window.__applyFilters === "function") {
    window.__applyFilters();
  }
}

function setPageSize(newSize: number) {
  if (!(VALID_PAGE_SIZES as readonly number[]).includes(newSize)) return;
  state.pageSize = newSize;
  localStorage.setItem("employees.pageSize", String(newSize));
  state.page = 1; // reiniciar a primera página al cambiar tamaño
  if (typeof window.__applyFilters === "function") {
    window.__applyFilters();
  }
}

/**
 * init
 * Punto de entrada de la página.
 * - Recupera todos los empleados y guarda el resultado en memoria.
 * - Población de los selectores de filtro con valores únicas.
 * - Render inicial sin filtros.
 * - Configura listeners para búsqueda por nombre (con debounce) y filtros combinables.
 * - Implementa botón de "Limpiar filtros".
 */
function init() {
  const $input = document.getElementById("searchInput") as HTMLInputElement | null;
  const $department = document.getElementById("departmentFilter") as HTMLSelectElement | null;
  const $job = document.getElementById("jobFilter") as HTMLSelectElement | null;
  const $office = document.getElementById("officeFilter") as HTMLSelectElement | null;
  const $state = document.getElementById("stateFilter") as HTMLSelectElement | null;
  const $clear = document.getElementById("clearFilters") as HTMLButtonElement | null;
  const $refresh = document.getElementById("refreshBtn") as HTMLButtonElement | null;
  const $results = document.getElementById("results") as HTMLElement | null;
  const $status = document.getElementById("status") as HTMLElement | null;
  const $error = document.getElementById("error") as HTMLElement | null;
  const $pagination = document.getElementById("pagination") as HTMLElement | null;
  const $pageSize = document.getElementById("pageSize") as HTMLSelectElement | null;

  // Establecer tamaño de página preferido (URL > localStorage > 10)
  const fromUrl = readFiltersFromUrl();
  if (fromUrl.size) state.pageSize = fromUrl.size;
  if ($pageSize) $pageSize.value = String(state.pageSize);

  // Carga inicial de datos + poblar selectores
  fetchEmployees()
    .then((data) => {
      state.all = Array.isArray(data) ? data : [];
      state.lastLoadedAt = Date.now();
      if ($status) $status.textContent = `Cargados ${state.all.length} empleados.`;
      // Poblar selects con valores únicas, incluyendo oficina
      const deptOptions = uniqueSorted(state.all.map((e) => e.departmentName ?? ""));
      const jobOptions = uniqueSorted(state.all.map((e) => e.jobPositionName ?? ""));
      const officeOptions = uniqueSorted(state.all.map((e) => e.officeName ?? ""));
      const stateOptions = uniqueSorted(state.all.map((e) => e.state ?? ""));
      if ($department) populateSelect($department, deptOptions);
      if ($job) populateSelect($job, jobOptions);
      if ($office) populateSelect($office, officeOptions);
      if ($state) populateSelect($state, stateOptions);

      // Leer filtros desde la URL (si el link fue compartido con filtros)
      const initial = readFiltersFromUrl();
      if ($input) $input.value = initial.q;
      if (initial.department && $department) $department.value = initial.department;
      if (initial.jobPosition && $job) $job.value = initial.jobPosition;
      if (initial.office && $office) $office.value = initial.office;
      if (initial.state && $state) $state.value = initial.state;
      state.page = initial.page || 1;
      if (initial.size) {
        state.pageSize = initial.size;
        if ($pageSize) $pageSize.value = String(state.pageSize);
      }

      // Render inicial aplicando filtros (si los hay)
      applyFilters();
    })
    .catch((err) => {
      if ($status) $status.style.display = "none";
      if ($error) {
        $error.style.display = "inline";
        $error.textContent = `Fallo al cargar empleados: ${err?.message ?? String(err)}`;
      }
    });

  // Búsqueda por nombre (debounce)
  const onInput = debounce(() => applyFilters(), 250);
  if ($input) $input.addEventListener("input", onInput);

  // Filtros select (recalcular al cambiar)
  [$department, $job, $office, $state].forEach((el) => {
    if (el) el.addEventListener("change", () => {
      state.page = 1;
      applyFilters();
    });
  });

  // Limpiar filtros
  if ($clear) {
    $clear.addEventListener("click", () => {
      if ($input) $input.value = "";
      if ($department) $department.value = "";
      if ($job) $job.value = "";
      if ($office) $office.value = "";
      if ($state) $state.value = "";
      state.page = 1;
      applyFilters();
    });
  }

  // Botón de actualización manual
  if ($refresh) {
    $refresh.addEventListener("click", () => {
      refreshData({ keepFilters: true, silent: false });
    });
  }

  // Cambio de tamaño de página
  if ($pageSize) {
    $pageSize.addEventListener("change", () => {
      const newSize = parseInt($pageSize.value, 10) || 10;
      setPageSize(newSize);
    });
  }

  // Auto-actualizar al recuperar foco si pasaron >60s
  window.addEventListener("focus", maybeAutoRefresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) maybeAutoRefresh();
  });

  /**
   * applyFilters
   * Recolecta valores actuales, aplica el filtro combinado, actualiza el contador
   * y sincroniza la URL con los filtros para poder compartir el enlace.
   */
  function applyFilters() {
    const q = $input?.value ?? "";
    const department = $department?.value ?? "";
    const jobPosition = $job?.value ?? "";
    const office = $office?.value ?? "";
    const stateVal = $state?.value ?? "";

    // Aplicar filtros
    state.filtered = filterEmployees(state.all, {
      query: q,
      department,
      jobPosition,
      office,
      state: stateVal,
    });

    // ORDENAR GLOBALMENTE ANTES DE PAGINAR
    const sortedFiltered = state.filtered
      .slice()
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })
      );

    const total = sortedFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    // Ajustar página actual si excede
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageItems = sortedFiltered.slice(start, end);

    const count = pageItems.length;
    const filtersSummary: string[] = [];
    if (q.trim()) filtersSummary.push(`nombre="${q.trim()}"`);
    if (department) filtersSummary.push(`depto=${department}`);
    if (jobPosition) filtersSummary.push(`puesto=${jobPosition}`);
    if (office) filtersSummary.push(`oficina=${office}`);
    if (stateVal) filtersSummary.push(`estado=${stateVal}`);
    if ($status) {
      $status.textContent = filtersSummary.length
        ? `Mostrando ${count} de ${total} resultado(s) para: ${filtersSummary.join(", ")} — Página ${state.page} de ${totalPages}`
        : `Mostrando ${count} de ${total} empleados — Página ${state.page} de ${totalPages}`;
    }

    if ($results) renderEmployees(pageItems, $results);
    if ($pagination) renderPaginationControls($pagination, { page: state.page, totalPages });

    // Sincronizar URL con filtros + paginación
    syncFiltersToUrl({ q, department, jobPosition, office, state: stateVal, page: state.page, size: state.pageSize });
  }

  // Hacer accesible globalmente para que refreshData pueda forzar un re-render tras actualizar datos
  window.__applyFilters = applyFilters;
}

// Arranque de la aplicación cuando el DOM esté listo
window.addEventListener("DOMContentLoaded", init);
export {};
