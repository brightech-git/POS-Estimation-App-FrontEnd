import { callApi } from '../apiClient';
import { EMPLOYEE } from '../endpoints';

export interface Employee {
  EMPUID:       string;
  EMPNAME:      string;
  EMPSURNAME:   string;
  EMPFATHERNAME?: string;
  SALUTATION?:  string;
  DESIGNATION?: string;
  MOBILENO?:    string;
  ACTIVE?:      string;
}

interface PagedEmployees {
  content:       Employee[];
  totalElements: number;
  totalPages:    number;
}

export const searchEmployees = (search: string, page = 0, size = 10) =>
  callApi<never, PagedEmployees>({
    method: 'get',
    url:    EMPLOYEE.SEARCH(search, page, size),
  });

// Lookup a single employee by their EMPUID (code)
export const findEmployeeByCode = async (code: string): Promise<Employee | null> => {
  if (!code.trim()) return null;
  const result = await searchEmployees(code.trim(), 0, 20);
  const employees = result?.content ?? [];
  // Exact EMPUID match first
  const exact = employees.find(e => e.EMPUID?.toLowerCase() === code.trim().toLowerCase());
  return exact ?? employees[0] ?? null;
};
