// src/app/core/components/section-toggle/section-toggle.ts
export function createTypeSection(title: string, collapsible: boolean = false, sectionId?: string | null, externalContent?: HTMLElement | null) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';

    // Title container with toggle button
    const titleContainer = document.createElement('div');
    titleContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px 0; border-bottom: 2px solid #e2e8f0;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size: 16px; font-weight: 700; color: #0f172a;';
    titleEl.textContent = title;

    titleContainer.appendChild(titleEl);

    // Create a consistent id for content
    const contentId = sectionId ?? `section-${Math.random().toString(36).slice(2)}`;

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'section-toggle-btn';
    toggleBtn.innerHTML = collapsible ? '👁️ Show' : '👁️‍🗨️ Hide';
    toggleBtn.style.cssText = 'padding: 6px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';

    toggleBtn.addEventListener('mouseenter', () => { toggleBtn.style.background = '#e2e8f0'; });
    toggleBtn.addEventListener('mouseleave', () => { toggleBtn.style.background = '#f1f5f9'; });

    toggleBtn.addEventListener('click', () => {
        let content: HTMLElement | null = null;
        if (externalContent) {
            content = externalContent;
        } else {
            content = document.getElementById(contentId);
        }
        if (!content) return;
        const isHidden = content.style.display === 'none' || content.style.display === '';
        content.style.display = isHidden ? 'block' : 'none';
        toggleBtn.innerHTML = isHidden ? '👁️‍🗨️ Hide' : '👁️ Show';
    });

    titleContainer.appendChild(toggleBtn);
    section.appendChild(titleContainer);

    // Si se pasa un elemento externo, lo usamos como contenido
    if (externalContent) {
        externalContent.id = contentId;
        section.appendChild(externalContent);
    } else {
        // Content container (empty, to be filled by calendar-task o lógica externa)
        const content = document.createElement('div');
        content.id = contentId;
        section.appendChild(content);
    }

    return section;

    
}

