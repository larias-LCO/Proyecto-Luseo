// Helper global para crear tareas generales con modal
export async function createGeneralTask({
  apiGet,
  apiPost,
  allProjects,
  generalTaskEnums,
  loadGeneralTaskEnums,
  renderTasksView,
  escapeHtml,
  getStatusLabel
}: {
  apiGet: (url: string) => Promise<any>,
  apiPost: (url: string, payload: any) => Promise<any>,
  allProjects: any[],
  generalTaskEnums: any,
  loadGeneralTaskEnums: () => Promise<any>,
  renderTasksView: () => Promise<void>,
  escapeHtml: (s: string) => string,
  getStatusLabel: (s: string) => string
}) {
  let categories = [];
  let projects = allProjects;
  try {
    categories = await apiGet('/task-categories');
  } catch (err) {
    console.error('Error loading categories:', err);
  }
  await loadGeneralTaskEnums();
  const modal = document.createElement('div');
  modal.className = 'subtasks-modal-overlay';
  modal.id = 'create-task-modal';
  const statusOptionsHtml = (generalTaskEnums.statuses || []).map((s: string) => `<option value="${s}" ${s === 'IN_PROGRESS' ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('');
  modal.innerHTML = `
    <div class="subtasks-modal" style="max-width: 600px;">
      <div class="subtasks-modal-header">
        <h2>➕ Create New Task</h2>
        <button class="subtasks-modal-close" onclick="document.getElementById('create-task-modal').remove()">✖</button>
      </div>
      <div class="subtasks-modal-body" style="display: block; padding: 24px;">
        <form id="create-task-form" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Task Name *</label>
            <input type="text" id="task-name" required style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Description</label>
            <textarea id="task-description" rows="3" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;"></textarea>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Project</label>
            <select id="task-project" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value=" ">None</option>
              ${projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Phase</label>
            <select id="task-phase" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value="">None / Select project first</option>
            </select>
          </div>
          <div id="general-task-category-wrapper">
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Category *</label>
            <select id="task-category" required style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              <option value="">Select Category</option>
                                ${categories.map((c: any) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Start Date (Issue Date)</label>
            <input type="date" id="task-date" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
          </div>
          <div id="vacation-end-date-wrapper" style="display: none;">
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">End Date (Vacations Only)</label>
            <input type="date" id="task-end-date" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
            <small style="color: #64748b; font-size: 12px;">Tasks will be created for each day in the range</small>
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-weight: 600;">Status *</label>
            <select id="task-status" required style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
              ${statusOptionsHtml}
            </select>
          </div>
          <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('create-task-modal').remove()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Task</button>
          </div>
          <div id="create-task-message" class="muted" style="text-align: center;"></div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  const projectSelect = document.getElementById('task-project') as HTMLSelectElement;
  const phaseSelect = document.getElementById('task-phase') as HTMLSelectElement;
  projectSelect.addEventListener('change', async () => {
    const projectId = projectSelect.value;
    phaseSelect.innerHTML = '<option value="">None</option>';
    if (projectId && projectId.trim() && !isNaN(parseInt(projectId))) {
      try {
        const phases = await apiGet(`/projects/${projectId}/phases`);
        if (phases && phases.length > 0) {
          phases.forEach((phase: any) => {
            const option = document.createElement('option');
            option.value = phase.id;
            option.textContent = phase.phase || `Phase ${phase.id}`;
            if (phase.active) option.selected = true;
            phaseSelect.appendChild(option);
          });
        }
      } catch (err) {
        console.error('Error loading phases:', err);
      }
    }
  });
  const categorySelect = document.getElementById('task-category') as HTMLSelectElement;
  const endDateWrapper = document.getElementById('vacation-end-date-wrapper') as HTMLElement;
  categorySelect.addEventListener('change', () => {
    const selectedCategory = categories.find((c: any) => c.id === parseInt(categorySelect.value));
    const isOutOfOffice = selectedCategory && selectedCategory.name && selectedCategory.name.toLowerCase().includes('out of office');
    endDateWrapper.style.display = isOutOfOffice ? 'block' : 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.getElementById('create-task-form')!.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById('create-task-message')!;
    messageEl.textContent = 'Creating...';
    const selectedCategory = categories.find((c: any) => c.id === parseInt((document.getElementById('task-category') as HTMLSelectElement).value));
    const isOutOfOffice = selectedCategory && selectedCategory.name && selectedCategory.name.toLowerCase().includes('out of office');
    const projectValue = (document.getElementById('task-project') as HTMLSelectElement).value;
    const phaseValue = (document.getElementById('task-phase') as HTMLSelectElement).value;
    const projectId = projectValue && projectValue.trim() && !isNaN(parseInt(projectValue)) ? parseInt(projectValue) : null;
    const basePayload = {
      name: (document.getElementById('task-name') as HTMLInputElement).value.trim(),
      description: (document.getElementById('task-description') as HTMLTextAreaElement).value.trim() || null,
      projectId: projectId,
      projectPhaseId: (phaseValue && projectId) ? parseInt(phaseValue) : null,
      taskCategoryId: parseInt((document.getElementById('task-category') as HTMLSelectElement).value),
      status: (document.getElementById('task-status') as HTMLSelectElement).value,
      // New optional discipline fields; keep null by default unless form fields are added later
      bim_date: null,
      description_bim: null,
      description_electrical: null,
      description_mechanical: null,
      description_plumbing: null,
      description_structural: null
    };
    try {
      if (isOutOfOffice) {
        const startDate = (document.getElementById('task-date') as HTMLInputElement).value;
        const endDate = (document.getElementById('task-end-date') as HTMLInputElement).value;
        if (!startDate) {
          messageEl.textContent = 'Please select a start date for vacations';
          messageEl.style.color = '#ef4444';
          return;
        }
        if (!endDate) {
          messageEl.textContent = 'Please select an end date for vacations';
          messageEl.style.color = '#ef4444';
          return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
          messageEl.textContent = 'End date must be after start date';
          messageEl.style.color = '#ef4444';
          return;
        }
        const payload = { ...basePayload, issuedDate: startDate, endDate: endDate };
        await apiPost('/general-tasks', payload);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        messageEl.textContent = `Created vacation task (${daysDiff} days)!`;
        messageEl.style.color = '#10b981';
      } else {
        const payload = { ...basePayload, issuedDate: (document.getElementById('task-date') as HTMLInputElement).value || null };
        await apiPost('/general-tasks', payload);
        messageEl.textContent = 'Task created successfully!';
        messageEl.style.color = '#10b981';
      }
      modal.remove();
      await renderTasksView();
    } catch (err: any) {
      console.error('Error creating task:', err);
      messageEl.textContent = 'Error: ' + (err?.message || err);
      messageEl.style.color = '#ef4444';
    }
  });
}