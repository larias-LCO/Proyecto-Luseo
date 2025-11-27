import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TaskFiltersService {
	allProjects: any[] = [];
	currentFilters: {
		searchText: string;
		category: string;
		creator: string;
		mineOnly: boolean;
		myProjects: boolean;
		week: string | null;
	} = {
		searchText: '',
		category: '',
		creator: '',
		mineOnly: false,
		myProjects: false,
		week: null
	};
	myEmployeeId: number | null = null;

	getFilteredProjects(): any[] {
		const myEmpId = this.myEmployeeId;
		return this.allProjects.filter((p: any) => {
			// Search filter
			if (this.currentFilters.searchText) {
				const search = this.currentFilters.searchText.toLowerCase();
				const name = (p.name || '').toLowerCase();
				const code = (p.projectCode || '').toLowerCase();
				const client = (p.clientName || '').toLowerCase();
				if (!name.includes(search) && !code.includes(search) && !client.includes(search)) {
					return false;
				}
			}
			// My projects filter
			if (this.currentFilters.myProjects && myEmpId) {
				const isPM = p.projectManagerId === myEmpId;
				const isTeam = Array.isArray(p.employeeIds) && p.employeeIds.includes(myEmpId);
				if (!isPM && !isTeam) return false;
			}
			return true;
		});
	}
}