// create-edit.ts
import { ProjectService, ProjectPayload } from '../core/services/project.service';

export class CreateEditHelper {
  constructor(private projectService: ProjectService) {}

  // 🔹 Crear un nuevo proyecto
  async createProject(data: ProjectPayload): Promise<void> {
    try {
      const response = await this.projectService.createProject(data);
      console.log('✅ Proyecto creado correctamente:', response);
      alert('Proyecto creado con éxito');
    } catch (error) {
      console.error('❌ Error al crear el proyecto:', error);
      alert('Error al crear el proyecto');
    }
  }
}


// ====== SCRIPT: TS relacionado con Create / Edit ======
(() => {
  const API = 'https://api.luseoeng.com';

  // --- Tipos de datos ---
  interface Office { id: number; name: string; }
  interface Client { id: number; name: string; }
  interface Software { id: number; name: string; }
  interface Department { name: string; }
  interface Job { name: string; }
  interface Employee {
    id: number;
    name: string;
    departmentName?: string;
    jobPositionName?: string;
  }

  interface Project {
    id?: number;
    projectCode?: string;
    name?: string;
    area?: number | null;
    areaUnit?: string | null;
    type?: string | null;
    status?: string | null;
    scope?: string | null;
    notes?: string | null;
    officeId?: number | string | null;
    clientId?: number | string | null;
    softwareIds?: number[];
    trackedTime?: number;
    pmIds?: number[];
    teamIds?: number[];
    phaseId?: number | string | null;
    phaseStatus?: string | null;
  }

  // --- Caches ---
  const cache = {
    employees: [] as Employee[],
    offices: [] as Office[],
    clients: [] as Client[],
    software: [] as Software[],
    depts: [] as Department[],
    jobs: [] as Job[],
  };

  const createPMs = new Set<number>();
  const createTeam = new Set<number>();
  const editPMs = new Set<number>();
  const editTeam = new Set<number>();
  let currentEditProjectId: number | null = null;

  // --- Helpers ---
 const sel = (id: string): HTMLElement | null => document.getElementById(id);


  const option = (v: string | number, t?: string): HTMLOptionElement => {
    const o = document.createElement('option');
    o.value = String(v);
    o.textContent = t ?? String(v);
    return o;
  };

  const escapeHtml = (s: string): string =>
    String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  const uniqueIds = (iter: Iterable<any>): number[] => {
    const out: number[] = [];
    const s = new Set<number>();
    for (const v of iter || []) {
      const n = Number(v);
      if (!Number.isNaN(n) && !s.has(n)) {
        s.add(n);
        out.push(n);
      }
    }
    return out;
  };

  // --- API helpers ---
  async function apiGet<T>(path: string): Promise<T> {
    const res = await (window as any).Auth.fetchWithAuth(`${API}${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) {
      try {
        await (window as any).Auth.logout();
      } finally {
        location.href = '/login.html';
      }
      throw new Error('HTTP 401');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function apiPost<T>(path: string, body: any): Promise<T> {
    const res = await (window as any).Auth.fetchWithAuth(`${API}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      try {
        await (window as any).Auth.logout();
      } finally {
        location.href = '/login.html';
      }
      throw new Error('HTTP 401');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function apiPut<T>(path: string, body: any): Promise<T> {
    const res = await (window as any).Auth.fetchWithAuth(`${API}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      try {
        await (window as any).Auth.logout();
      } finally {
        location.href = '/login.html';
      }
      throw new Error('HTTP 401');
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // --- Catalogs ---
  async function loadCatalogs(): Promise<void> {
    try {
      const [offices, clients, software, depts, jobs, employees] = await Promise.all([
        apiGet<Office[]>('/offices'),
        apiGet<Client[]>('/clients'),
        apiGet<Software[]>('/software'),
        apiGet<Department[]>('/departments'),
        apiGet<Job[]>('/job-positions'),
        apiGet<Employee[]>('/employees'),
      ]);

      cache.offices = offices || [];
      cache.clients = clients || [];
      cache.software = software || [];
      cache.depts = depts || [];
      cache.jobs = jobs || [];
      cache.employees = (employees || []).slice().sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
      );

      // fill selects used in create/edit
      ['p_office', 'e_office'].forEach((id) => {
        const s = sel(id) as HTMLSelectElement;
        if (s) {
          s.innerHTML = '';
          s.appendChild(option('', 'All'));
          cache.offices.forEach((o) => s.appendChild(option(o.id, o.name)));
        }
      });

      ['p_client', 'e_client'].forEach((id) => {
        const s = sel(id) as HTMLSelectElement;
        if (s) {
          s.innerHTML = '';
          s.appendChild(option('', 'All'));
          cache.clients.forEach((c) => s.appendChild(option(c.id, c.name)));
        }
      });

      ['p_software', 'e_software'].forEach((id) => {
        const s = sel(id) as HTMLSelectElement;
        if (s) {
          s.innerHTML = '';
          s.appendChild(option('', 'All'));
          cache.software.forEach((x) => s.appendChild(option(x.id, x.name)));
        }
      });

      const tj = sel('team_job') as HTMLSelectElement;
      if (tj) {
        tj.innerHTML = '';
        tj.appendChild(option('', 'All Job Positions'));
        cache.jobs.forEach((j) => tj.appendChild(option(j.name, j.name)));
      }

      const td = sel('team_dept') as HTMLSelectElement;
      if (td) {
        td.innerHTML = '';
        td.appendChild(option('', 'All Departments'));
        cache.depts.forEach((d) => td.appendChild(option(d.name, d.name)));
      }

      const pmdept = sel('pm_dept_filter') as HTMLSelectElement;
      if (pmdept) {
        pmdept.innerHTML = '';
        pmdept.appendChild(option('', 'All Departments'));
        cache.depts.forEach((d) => pmdept.appendChild(option(d.name, d.name)));
      }

      renderEmployeeSelects();
    } catch (e) {
      console.error('loadCatalogs error', e);
    }
  }

  // --- Render employee lists ---
  function renderEmployeesToSelect(
    containerEl: HTMLElement,
    list: Employee[],
    assignedSet: Set<number>
  ): void {
    containerEl.innerHTML = '';
    if (!(list || []).length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No employees found';
      containerEl.appendChild(empty);
      return;
    }

    list
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
      .forEach((e) => {
        const item = document.createElement('div');
        item.className = 'employee-item';
        item.textContent = `${e.name}${e.jobPositionName ? ' · ' + e.jobPositionName : ''}${
          e.departmentName ? ' · ' + e.departmentName : ''
        }`;

        if (assignedSet.has(e.id)) item.classList.add('checked');

        item.addEventListener('click', () => {
          if (assignedSet.has(e.id)) assignedSet.delete(e.id);
          else assignedSet.add(e.id);
          renderCreateModalAssignments();
          renderEditModalAssignments();
          renderEmployeeSelects();
        });

        containerEl.appendChild(item);
      });
  }

  function renderEmployeeSelects(): void {
    const pmQ = (sel('pm_q') as HTMLInputElement)?.value || '';
    const pmDept = (sel('pm_dept_filter') as HTMLSelectElement)?.value || '';

    const pmsCandidates = cache.employees.filter(
      (e) =>
        (!pmDept || e.departmentName === pmDept) &&
        (!pmQ || e.name.toLowerCase().includes(pmQ.toLowerCase()))
    );
    renderEmployeesToSelect(sel('p_pms') as HTMLElement, pmsCandidates, createPMs);

    const teamQ = (sel('team_q') as HTMLInputElement)?.value || '';
    const teamJob = (sel('team_job') as HTMLSelectElement)?.value || '';
    const teamDept = (sel('team_dept') as HTMLSelectElement)?.value || '';

    const teamCandidates = cache.employees.filter(
      (e) =>
        (!teamDept || e.departmentName === teamDept) &&
        (!teamJob || e.jobPositionName === teamJob) &&
        (!teamQ || e.name.toLowerCase().includes(teamQ.toLowerCase()))
    );
    renderEmployeesToSelect(sel('p_team') as HTMLElement, teamCandidates, createTeam);

    renderEmployeesToSelect(sel('e_pms') as HTMLElement, cache.employees.slice(), editPMs);
    renderEmployeesToSelect(sel('e_team') as HTMLElement, cache.employees.slice(), editTeam);
  }

  function renderCreateModalAssignments(): void {
    const pmBox = sel('p_pms_assigned') as HTMLElement;
    const teamBox = sel('p_team_assigned') as HTMLElement;

    if (pmBox) {
      pmBox.innerHTML = '';
      Array.from(createPMs).forEach((id) => {
        const e = cache.employees.find((x) => x.id == id);
        if (!e) return;
        const d = document.createElement('div');
        d.textContent = e.name;
        pmBox.appendChild(d);
      });
    }

    if (teamBox) {
      teamBox.innerHTML = '';
      Array.from(createTeam).forEach((id) => {
        const e = cache.employees.find((x) => x.id == id);
        if (!e) return;
        const d = document.createElement('div');
        d.textContent = e.name;
        teamBox.appendChild(d);
      });
    }
  }

  function renderEditModalAssignments(): void {
    const pmBox = sel('e_pms_assigned') as HTMLElement;
    const teamBox = sel('e_team_assigned') as HTMLElement;

    if (pmBox) {
      pmBox.innerHTML = '';
      Array.from(editPMs).forEach((id) => {
        const e = cache.employees.find((x) => x.id == id);
        if (!e) return;
        const d = document.createElement('div');
        d.textContent = e.name;
        pmBox.appendChild(d);
      });
    }

    if (teamBox) {
      teamBox.innerHTML = '';
      Array.from(editTeam).forEach((id) => {
        const e = cache.employees.find((x) => x.id == id);
        if (!e) return;
        const d = document.createElement('div');
        d.textContent = e.name;
        teamBox.appendChild(d);
      });
    }
  }

  // --- Create / Edit actions ---
 async function createProject(): Promise<void> {
  let pMsgEl: HTMLElement | null = null;
  try {
    const body = {
  projectCode: (sel('p_code') as HTMLInputElement)?.value || null,
  name: (sel('p_name') as HTMLInputElement)?.value || null,
  area: Number((sel('p_area') as HTMLInputElement)?.value) || null,
  areaUnit: (sel('p_areaUnit') as HTMLSelectElement)?.value || null,
  type: (sel('p_type') as HTMLSelectElement)?.value || null,
  status: (sel('p_status') as HTMLSelectElement)?.value || null,
  scope: (sel('p_scope') as HTMLSelectElement)?.value || null,
  notes: (sel('p_notes') as HTMLInputElement)?.value || null,
  officeId: (sel('p_office') as HTMLSelectElement)?.value || null,
  clientId: (sel('p_client') as HTMLSelectElement)?.value || null,
  softwareIds: Array.from(
    (sel('p_software') as HTMLSelectElement)?.selectedOptions || []
  ).map(opt => opt.value),
  trackedTime: Number((sel('p_trackedTime') as HTMLInputElement)?.value) || 0,
  pmIds: uniqueIds(createPMs),
  teamIds: uniqueIds(createTeam),
  phaseId: (sel('p_phase') as HTMLSelectElement)?.value || null,
  phaseStatus: (sel('p_phaseStatus') as HTMLSelectElement)?.value || null,
};
  pMsgEl = sel('p_msg') as HTMLElement | null;
  if (pMsgEl) pMsgEl.textContent = 'Guardando...';
  await apiPost('/projects', body);
  if (pMsgEl) pMsgEl.textContent = 'Proyecto creado correctamente';

    (window as any).closeModal?.('createModal');
  } catch (e: any) {
    console.error('createProject', e);
    if (pMsgEl) pMsgEl.textContent = 'Error: ' + e.message;
  }
}

  async function openEditProject(projectId: number): Promise<void> {
    try {
      const data = await apiGet<Project>(`/projects/${projectId}`);
      currentEditProjectId = projectId;

      (sel('e_code') as HTMLInputElement).value = data.projectCode || '';
      (sel('e_name') as HTMLInputElement).value = data.name || '';
      (sel('e_area') as HTMLInputElement).value = String(data.area ?? '');
      (sel('e_areaUnit') as HTMLSelectElement).value = data.areaUnit || '';
      (sel('e_type') as HTMLSelectElement).value = data.type || '';
      (sel('e_status') as HTMLSelectElement).value = data.status || '';
      (sel('e_scope') as HTMLInputElement).value = data.scope || '';
      (sel('e_notes') as HTMLInputElement).value = data.notes || '';
      (sel('e_trackedTime') as HTMLInputElement).value = String(data.trackedTime || 0);
      (sel('e_office') as HTMLSelectElement).value = String(data.officeId || '');
      (sel('e_client') as HTMLSelectElement).value = String(data.clientId || '');

      editPMs.clear();
      editTeam.clear();
      (data.pmIds || []).forEach((x) => editPMs.add(x));
      (data.teamIds || []).forEach((x) => editTeam.add(x));

      renderEditModalAssignments();
      (window as any).openModal('editModal');
    } catch (e: any) {
      console.error('openEditProject', e);
      alert('Error loading project: ' + e.message);
    }
  }

  async function saveEditProject(): Promise<void> {
    try {
      if (!currentEditProjectId) return alert('No project selected');

      const body: Project = {
        projectCode: (sel('e_code') as HTMLInputElement)?.value || undefined,
        name: (sel('e_name') as HTMLInputElement)?.value || undefined,
        area: Number((sel('e_area') as HTMLInputElement)?.value) || null,
        areaUnit: (sel('e_areaUnit') as HTMLSelectElement)?.value || null,
        type: (sel('e_type') as HTMLSelectElement)?.value || null,
        status: (sel('e_status') as HTMLSelectElement)?.value || null,
        scope: (sel('e_scope') as HTMLInputElement)?.value || null,
        notes: (sel('e_notes') as HTMLInputElement)?.value || null,
        officeId: (sel('e_office') as HTMLSelectElement)?.value || null,
        clientId: (sel('e_client') as HTMLSelectElement)?.value || null,
        softwareIds: Array.from(((sel('e_software') as HTMLSelectElement)?.selectedOptions || []) as any)
          .map((opt: any) => Number(opt.value))
          .filter((n: number) => !Number.isNaN(n)),
        trackedTime: Number((sel('e_trackedTime') as HTMLInputElement)?.value) || 0,
        pmIds: uniqueIds(editPMs),
        teamIds: uniqueIds(editTeam),
      };
      const eMsgEl = sel('e_msg') as HTMLElement | null;
      if (eMsgEl) eMsgEl.textContent = 'Guardando...';
      await apiPut(`/projects/${currentEditProjectId}`, body);
      if (eMsgEl) eMsgEl.textContent = 'Guardado';
      (window as any).closeModal('editModal');
    } catch (e: any) {
      console.error('saveEditProject', e);
      const eMsgElCatch = sel('e_msg') as HTMLElement | null;
      if (eMsgElCatch) eMsgElCatch.textContent = 'Error: ' + e.message;
    }
  }

  // Export global functions
  (window as any).loadCatalogs = loadCatalogs;
  (window as any).createProject = createProject;
  (window as any).openEditProject = openEditProject;
  (window as any).saveEditProject = saveEditProject;
})();
