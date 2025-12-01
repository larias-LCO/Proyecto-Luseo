// task-card.helper.ts
// Helper global para crear tarjetas visuales de tareas (HTMLElement)

export function createTaskCard(task: any, options: any = {}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'gt-card gt-card-mini';
  card.style.position = 'relative';
  card.style.borderRadius = '10px';
  card.style.overflow = 'hidden';
  card.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.3s ease';

  // Use category color as background, with fallback to white
  const categoryColor = task.taskCategoryColorHex || '#ffffff';
  card.style.background = categoryColor;
  card.style.border = `2px solid ${darkenColor(categoryColor, 20)}`;

  // Add visual separator for project type (top border with specific color - light tones)
  if (task.projectType === 'COMMERCIAL') {
    card.style.borderTop = '4px solid #7DD3FC';
    card.setAttribute('data-project-type', 'COMMERCIAL');
  } else if (task.projectType === 'RESIDENTIAL') {
    card.style.borderTop = '4px solid #6EE7B7';
    card.setAttribute('data-project-type', 'RESIDENTIAL');
  }

  // Calculate text color based on background brightness
  const textColor = getContrastColor(categoryColor);
  card.style.color = textColor;

  // Reduce opacity if task is COMPLETED
  if (task.status === 'COMPLETED') {
    card.style.opacity = '0.45';
  }

  const statusConfig: Record<string, { text: string; color: string; bg: string; icon: string }> = {
    'IN_PROGRESS': { text: 'In Progress', color: '#1e40af', bg: '#dbeafe', icon: '⏱️' },
    'COMPLETED': { text: 'Completed', color: '#065f46', bg: '#d1fae5', icon: '✅' },
    'PAUSED': { text: 'Paused', color: '#92400e', bg: '#fef3c7', icon: '⛔' }
  };
  const status = (task.status || 'IN_PROGRESS') as keyof typeof statusConfig;
  const statusInfo = statusConfig[status] ?? statusConfig['IN_PROGRESS'];

  const pmName = task.projectManagerName || '';
  const creatorName = task.createdByEmployeeName || '';

  const actionsHtml = `
    <div class="task-card-actions" style="position:absolute; top:6px; right:6px; display:flex; gap:6px; pointer-events:none; opacity:0; z-index:10;"></div>
  `;

  if (options.compact) {
    card.style.padding = '0';
    card.style.fontSize = '12px';
    card.style.cursor = 'pointer';
    const projectTypeIcon = task.projectType === 'COMMERCIAL' ? '🏢' : task.projectType === 'RESIDENTIAL' ? '🏠' : '';
    const projectTypeColor = task.projectType === 'COMMERCIAL' ? 'background:#7DD3FC; color:#fff;' : task.projectType === 'RESIDENTIAL' ? 'background:#6EE7B7; color:#fff;' : '';
    const projectTypeBadge = projectTypeIcon ? `<span style="position:absolute; top:2px; right:2px; font-size:14px; padding:3px 5px; ${projectTypeColor} border-radius:6px; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:1;">${projectTypeIcon}</span>` : '';
    const contentPaddingRight = projectTypeIcon ? 'padding-right: 30px;' : '';
    const projectInfo = (task.projectCode || task.projectName) ? `
      <div style="padding:0; margin:0;">
        <div style="display:flex; gap:2px; align-items:center; margin:0; padding:0;">
          <span style="font-size:12px; flex-shrink:0; line-height:1;">📦</span>
          <div style="flex:1; margin:0; padding:0; ${contentPaddingRight}">
            <div style="font-weight:700; font-size:11px; line-height:1; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; margin:0; padding:0;">${escapeHtml(task.projectCode || 'No Project')} ${task.projectName ? '- ' + escapeHtml(task.projectName) : ''}</div>
          </div>
        </div>
      </div>
    ` : '';
    card.innerHTML = `
      ${actionsHtml}
      ${projectTypeBadge}
      <div class="gt-body" style="display:flex; flex-direction:column; gap:2px; margin:0;">
        ${projectInfo}
        <div style="padding:0; margin:0; display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; gap:2px; align-items:center; font-size:10px; margin:0; padding:0;">
            <span style="line-height:1;">📝</span>
            <div style="font-weight:700; flex:1; line-height:1; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; margin:0; padding:0; ${contentPaddingRight}">${escapeHtml(task.name || '')}</div>
          </div>
          <div style="display:flex; gap:4px; align-items:flex-start; font-size:10px; opacity:0.9;">
            <span>📂</span>
            <div style="flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${escapeHtml(task.taskCategoryName || '-')}</div>
          </div>
          ${pmName ? `<div style="font-size:9px; padding:0; margin:0; font-weight:600; color: ${textColor}; line-height:1; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 PM: ${escapeHtml(pmName)}</div>` : ''}
          <div style="display:flex; justify-content:flex-start; align-items:center; gap:2px; flex-wrap:wrap; margin:0; padding:0;">
            <span style="display:inline-flex; align-items:center; gap:1px; padding:0 3px; background:${statusInfo.bg}; color:${statusInfo.color}; border-radius:999px; font-size:8px; font-weight:700; border: 1px solid ${statusInfo.color}; line-height:1.2;">${statusInfo.icon} ${statusInfo.text}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    card.style.padding = '3px';
    card.style.cursor = 'pointer';
    const projectTypeIcon = task.projectType === 'COMMERCIAL' ? '🏢' : task.projectType === 'RESIDENTIAL' ? '🏠' : '';
    const projectTypeColor = task.projectType === 'COMMERCIAL' ? 'background:#7DD3FC; color:#fff;' : task.projectType === 'RESIDENTIAL' ? 'background:#6EE7B7; color:#fff;' : '';
    const projectTypeBadge = projectTypeIcon ? `<span style="position:absolute; top:3px; right:3px; font-size:16px; padding:4px 7px; ${projectTypeColor} border-radius:8px; font-weight:800; box-shadow:0 2px 4px rgba(0,0,0,0.3); z-index:1;">${projectTypeIcon}</span>` : '';
    const projectInfo = (task.projectCode || task.projectName) ? `
      <div style="padding: 2px 4px; border-radius: 6px;">
        <div style="display:flex; gap:5px; align-items:flex-start;">
          <span style="font-size:14px; flex-shrink:0;">📦</span>
          <div style="display:flex; flex-direction:column; gap:2px; flex:1; padding-right:40px;">
            <div style="font-weight:800; font-size:12px; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${escapeHtml(task.projectCode || 'No Project')} ${task.projectName ? '- ' + escapeHtml(task.projectName) : ''}</div>
            ${task.projectPhaseName ? `<div style="font-size:9px; opacity:0.85; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${escapeHtml(task.projectPhaseName)}</div>` : ''}
          </div>
        </div>
      </div>
    ` : '';
    card.innerHTML = `
      ${actionsHtml}
      ${projectTypeBadge}
      <div style="display:flex; flex-direction:column; gap:3px;">
        ${projectInfo}
        <div style="padding: 2px 4px; border-radius: 6px; display:flex; flex-direction:column; gap:3px;">
          <div style="display:flex; gap:4px; align-items:flex-start; font-weight:700;">
            <span>📝</span>
            <div style="font-size:12px; flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}; padding-right:40px;">${escapeHtml(task.name)}</div>
          </div>
          <div style="display:flex; gap:4px; align-items:flex-start; font-size:10px; opacity:0.9;">
            <span>📂</span>
            <div style="flex:1; line-height:1.2; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">${escapeHtml(task.taskCategoryName || '-')}</div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:4px; font-size:9px;">
            ${pmName ? `<span style="padding:2px 5px; border-radius:4px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 PM: ${escapeHtml(pmName)}</span>` : ''}
            ${creatorName ? `<span style="padding:2px 5px; border-radius:4px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">✍️ Created by: ${escapeHtml(creatorName)}</span>` : ''}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:3px; align-items:center; margin-top:1px;">
            ${task.personalTask ? `<span style="font-size:10px; padding:2px 5px; border-radius:6px; font-weight:600; color: ${textColor}; text-shadow: 1px 1px 2px ${textColor === '#ffffff' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'};">👤 Personal</span>` : ''}
            <span style="display:inline-flex; align-items:center; gap:3px; padding:2px 6px; background:${statusInfo.bg}; color:${statusInfo.color}; border-radius:999px; font-size:10px; font-weight:700; border: 1px solid ${statusInfo.color};">${statusInfo.icon} ${statusInfo.text}</span>
          </div>
        </div>
      </div>
    `;
  }
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-1px)';
    card.style.boxShadow = '0 4px 10px rgba(0,0,0,0.12)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'none';
  });
  if (!options.skipHandlers) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      // Emitir evento global para abrir el modal de edición
      const event = new CustomEvent('open-edit-task-modal', { detail: { task } });
      window.dispatchEvent(event);
    });
  }
  return card;
}

function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  let r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  r = Math.max(0, r - Math.round(2.55 * percent));
  g = Math.max(0, g - Math.round(2.55 * percent));
  b = Math.max(0, b - Math.round(2.55 * percent));
  return `#${(r<<16|g<<8|b).toString(16).padStart(6,'0')}`;
}

function getContrastColor(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  return ((r*0.299 + g*0.587 + b*0.114) > 186) ? '#222222' : '#ffffff';
}

function escapeHtml(str: string): string {
  return String(str).replace(/[&<>\"]/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m] || m;
  });
}
