// Permission name to display label mapping
export const permissionLabels: Record<string, string> = {
  // Core Features
  'dashboard': '📊 Dashboard',
  'kasir': '💰 Kasir / POS',
  'laporan': '📈 Laporan',
  'produk': '📦 Produk',
  'customer': '👥 Customer',
  'setting': '⚙️ Pengaturan',

  // Printer Management
  'printer:read': '👁️ Lihat Printer',
  'printer:create': '➕ Tambah Printer',
  'printer:update': '✏️ Edit Printer',
  'printer:delete': '🗑️ Hapus Printer',
  'printer:manage_templates': '📝 Kelola Template',
  'printer:test_print': '🖨️ Test Print',
  'printer:view_history': '📜 History Print',
}

// Get role default permission names (match migration files exactly)
export function getRoleDefaultPermissionNames(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    'kasir': [
      'kasir',
      'laporan',
      'produk',
      'customer',
      'printer:read',
      'printer:test_print',
    ],
    'manager': [
      'dashboard',
      'kasir',
      'laporan',
      'produk',
      'customer',
      'printer:read',
      'printer:test_print',
      'printer:view_history',
    ],
    'admin': [
      'dashboard',
      'kasir',
      'laporan',
      'produk',
      'customer',
      'setting',
      'printer:read',
      'printer:create',
      'printer:update',
      'printer:delete',
      'printer:manage_templates',
      'printer:test_print',
      'printer:view_history',
    ],
  }
  return rolePermissions[role] || []
}

// Get role permission description for UI
export function getRolePermissionsDescription(role: string): string {
  const descriptions: Record<string, string> = {
    'kasir': 'Kasir, Laporan, Produk, Customer',
    'manager': 'Dashboard, Kasir, Laporan, Produk, Customer',
    'admin': 'Semua menu (full access)',
  }
  return descriptions[role] || ''
}

// Get detailed permission list for role info box
export function getRolePermissionsList(role: string): string[] {
  const permissionLists: Record<string, string[]> = {
    'kasir': [
      'Kasir / POS',
      'Laporan',
      'Produk',
      'Customer',
      'Printer (Lihat & Test Print)',
    ],
    'manager': [
      'Dashboard',
      'Kasir / POS',
      'Laporan',
      'Produk',
      'Customer',
      'Printer (Lihat, Test Print, History)',
    ],
    'admin': [
      'Dashboard',
      'Kasir / POS',
      'Laporan',
      'Produk',
      'Customer',
      'Pengaturan',
      'Printer (Full Management)',
    ],
  }
  return permissionLists[role] || []
}
