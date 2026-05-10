/**
 * Shared constants for CivicCare backend
 */

/**
 * Maps admin roles to the complaint categories they can manage.
 * Used by both complaintController (RBAC filtering) and adminController (access control).
 */
const ROLE_CATEGORY_MAP = {
    admin_colleges: 'Colleges',
    admin_schools: 'Schools',
    admin_societies: 'Societies',
    admin_vendors: ['Local Vendors', 'Shopkeepers'],
    admin_government: 'Government Services',
    admin_municipality: 'Municipal Corporation',
};

module.exports = { ROLE_CATEGORY_MAP };
