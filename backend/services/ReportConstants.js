/**
 * Reporting Constants
 * Centralized definitions to ensure consistency across queries and services.
 */

const COMPLETED_STATUSES = ['COMPLETED', 'SUBMITTED', 'FINALIZED'];
const FINALIZED_STATUSES = ['COMPLETED', 'SUBMITTED', 'FINALIZED'];
const INCOMPLETE_STATUSES = ['DRAFT', 'IN_PROGRESS'];

const EXPORT_LIMIT = 5000;

const DEFAULT_DATE_RANGE_DAYS = 90;

module.exports = {
    COMPLETED_STATUSES,
    FINALIZED_STATUSES,
    INCOMPLETE_STATUSES,
    EXPORT_LIMIT,
    DEFAULT_DATE_RANGE_DAYS
};
