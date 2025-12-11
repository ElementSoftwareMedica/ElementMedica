/**
 * @file index.js
 * @description Export centrale per import services
 */

const CompanyImportService = require('./company/CompanyImportService');
const EmployeeImportService = require('./employee/EmployeeImportService');
const TrainerImportService = require('./trainer/TrainerImportService');
const TrainerAccountService = require('./trainer/TrainerAccountService');

module.exports = {
  CompanyImportService,
  EmployeeImportService,
  TrainerImportService,
  TrainerAccountService
};
