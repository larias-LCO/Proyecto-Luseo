import { HelpContent } from '../models/help-content.model';

/**
 * Contenido de ayuda para la página de Report Hours
 */

export const REPORT_HOURS_HELP: HelpContent = {
  title: ' Hours Logging Help',
  description: 'Learn about the different task types and best practices for logging your hours accurately.',
  contextId: 'report-hours',
  sections: [
    {
        title: ' PROJECT TASKS (BILLABLE)',
        icon: '💼',
        htmlContent: `
        <ul style="margin: 0; padding-left: 1.25rem;">
          <li><strong class= "help-subtittle">Drafting:</strong> Here drafters and engineers should put the time spent drawing in AutoCAD or modeling on Revit. Mainly used by the drafters in Colombia.</li>
          <li><strong class= "help-subtittle">Design:</strong> Here engineers, Coordinators, PMs and Directors should put the time they spend doing calculations. This applies to both Colombia and US teams.</li>
          <li><strong class= "help-subtittle">Management:</strong> Here is where the US team and the coordinators in Colombia put the time spent in meetings (internal or with client), or discussing issues about a project.</li>
          <li><strong class= "help-subtittle">Construction Administration:</strong> Here is where everyone should log the time spent responding to RFIs, construction site visits, submittals, or even design done during construction.</li>
          <li><strong class= "help-subtittle">Work Authorization #:</strong> When a project gets a WA (before known as Change Order), we will create a Work Authorization task for everyone to put in the time, regardless of what they do.</li>
        </ul>
      `
    },
    {
        title: ' INTERNAL TASKS (NON-BILLABLE)',
        icon: '🏢',
        htmlContent: `
        <ul style="margin: 0; padding-left: 1.25rem;">
          <li><strong class= "help-subtittle">Technical overhead Colombia and Technical Overhead Florida:</strong> Here everyone shall include the time spent on things that are not billable to projects: meetings to discuss standards, learning sessions, etc. It is important to select the right description, no one from the Colombia office shall put anything in the “Technical Overhead Florida”.</li>
          <li><strong class= "help-subtittle">Holidays:</strong> Holidays as for Colombia and provided for the south Florida offices.</li>
          <li><strong class= "help-subtittle">Vacations:</strong> All workdays off due to vacations.</li>
          <li><strong class= "help-subtittle">Medical Excuse:</strong> Days off due to medical issues (documented). The documents shall be provided to HR department.</li>
          <li><strong class= "help-subtittle">LUSEO Benefits:</strong> This is for Colombia, the recent time benefits presented shall be put in here including the description.</li>
          <li><strong class= "help-subtittle">Personal Affairs:</strong> Days off due to personal issues other than medical reasons, anything included in here shall be approved by the immediate leader and documented with the HR department.</li>
          <li><strong class= "help-subtittle">Non paid Licences:</strong> This is for Colombia. @Liliana will be sharing the applicable policy for this.</li>
          <li><strong class= "help-subtittle">Corporate onboarding:</strong> This is for Colombia. This refers to the HR initial onboarding process.</li>
          <li><strong class= "help-subtittle">Jury Duty (FL):</strong> Time spent serving on a jury.</li>
        </ul>
      `
    },
    {
        title: ' IMPORTANT NOTES',
        icon: '⚠️',
    },
    {
        title: ' Descriptions are important on the tasks, please include them in English.',
        icon: '📢',
        content: 'The descriptions help us understand what was done on each task, and are very useful when preparing invoices for our clients.'
    }
  ]
};
