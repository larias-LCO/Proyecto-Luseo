export class EmployeeApi {
  constructor(private apiBase: string, private auth: any) {}

  async fetchEmployees(): Promise<any[]> {
    const res = await this.auth.fetchWithAuth(`${this.apiBase}/employees`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async createAccount(data: any): Promise<any> {
    const res = await this.auth.fetchWithAuth(`${this.apiBase}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username, passwordHash: data.password, role: data.role })
    });
    if (!res.ok) throw new Error(`Error creating account: ${res.status}`);
    return res.json();
  }

  async createEmployee(dto: any): Promise<any> {
    const res = await this.auth.fetchWithAuth(`${this.apiBase}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    if (!res.ok) throw new Error(`Error creating employee: ${res.status}`);
    return res.json();
  }

  async updateEmployee(id: number, dto: any): Promise<any> {
    const res = await this.auth.fetchWithAuth(`${this.apiBase}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    if (!res.ok) throw new Error(`Error updating employee: ${res.status}`);
    return res.json();
  }

  async deleteEmployee(id: number): Promise<void> {
    const res = await this.auth.fetchWithAuth(`${this.apiBase}/employees/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Error deleting employee: ${res.status}`);
  }

  async getCatalog(url: string): Promise<any[]> {
    try {
      const res = await this.auth.fetchWithAuth(url);
      if (!res.ok) return [];
      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}
