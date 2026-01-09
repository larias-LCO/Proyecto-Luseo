/**
 * Sección individual dentro del contenido de ayuda
 */
export interface HelpSection {
  title: string;
  /**
   * Contenido en texto plano (opcional si se usa htmlContent)
   */
  content?: string;
  /**
   * Contenido HTML (opcional, si se necesita más formato)
   */
  htmlContent?: string;
  /**
   * Ícono opcional para la sección
   */
  icon?: string;
}

/**
 * Contenido de ayuda completo para una página o módulo
 */
export interface HelpContent {
  /**
   * Título principal del panel de ayuda
   */
  title: string;
  /**
   * Descripción breve opcional
   */
  description?: string;
  /**
   * Secciones de ayuda con información específica
   */
  sections: HelpSection[];
  /**
   * Identificador único del contexto de ayuda
   */
  contextId?: string;
}
