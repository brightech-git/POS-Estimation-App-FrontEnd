import { findEmployeeByCode, searchEmployees } from '../services/employeeService';
export type { Employee } from '../services/employeeService';

export const useEmployeeService = () => ({
  searchEmployees,
  findEmployeeByCode,
});
