import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/kasir',
      },
       {
         path: 'kasir',
         name: 'Kasir',
         component: () => import('@/views/Kasir/KasirView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['kasir'],
           title: 'Kasir',
         },
       },
       {
         path: 'product',
         name: 'ProductList',
         component: () => import('@/views/Product/ProductListView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['produk'],
           title: 'Product',
         },
       },
       {
         path: 'product/create',
         name: 'ProductCreate',
         component: () => import('@/views/Product/ProductFormView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['produk'],
           title: 'Create Product',
         },
       },
       {
         path: 'product/:id/edit',
         name: 'ProductEdit',
         component: () => import('@/views/Product/ProductFormView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['produk'],
           title: 'Edit Product',
         },
       },
       {
         path: 'customer',
         name: 'CustomerList',
         component: () => import('@/views/Customer/CustomerListView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['customer'],
           title: 'Customer',
         },
       },
       {
         path: 'customer/:id',
         name: 'CustomerDetail',
         component: () => import('@/views/Customer/CustomerDetailView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['customer'],
           title: 'Customer Detail',
         },
       },
       {
         path: 'dashboard',
         name: 'Dashboard',
         component: () => import('@/views/Dashboard/DashboardView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['dashboard'],
           title: 'Dashboard',
         },
       },
       {
         path: 'laporan',
         name: 'Laporan',
         component: () => import('@/views/Laporan/LaporanView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['laporan'],
           title: 'Laporan',
         },
       },
       {
         path: 'laporan/:shiftId',
         name: 'DetailShift',
         component: () => import('@/views/Laporan/DetailShiftView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['laporan'],
           title: 'Detail Shift',
         },
       },
       {
         path: 'laporan/:shiftId/transaksi/:transactionId',
         name: 'TransactionDetail',
         component: () => import('@/views/Laporan/TransactionDetailView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['laporan'],
           title: 'Detail Transaksi',
         },
       },
       {
         path: 'laporan/transaksi/:transactionId',
         name: 'TransactionDetailDirect',
         component: () => import('@/views/Laporan/TransactionDetailView.vue'),
         meta: {
           requiresAuth: true,
           permissions: ['laporan'],
           title: 'Detail Transaksi',
         },
       },
         {
           path: 'user-management',
           name: 'UserManagement',
           component: () => import('@/views/Setting/UserManagementView.vue'),
           meta: {
             requiresAuth: true,
             permissions: ['setting'],
             title: 'User Management',
           },
         },
         {
           path: 'print-layout',
           name: 'PrintLayout',
           component: () => import('@/views/Setting/Printer/PrintLayoutSettingsView.vue'),
           meta: {
             requiresAuth: true,
             permissions: ['printer:read'],
             title: 'Print Layout Settings',
           },
         },
         {
           path: 'print-layout/edit-receipt/:printerId',
           name: 'print-layout-receipt',
           component: () => import('@/views/Setting/Printer/EditLayoutView.vue'),
           meta: {
             requiresAuth: true,
             permissions: ['printer:manage_templates'],
             title: 'Edit Customer Receipt Layout',
           },
         },
         {
           path: 'print-layout/edit-barista/:printerId',
           name: 'print-layout-barista',
           component: () => import('@/views/Setting/Printer/EditLayoutView.vue'),
           meta: {
             requiresAuth: true,
             permissions: ['printer:manage_templates'],
             title: 'Edit Barista Ticket Layout',
           },
         },
         {
           path: 'payment-methods',
           name: 'PaymentMethods',
           component: () => import('@/views/PaymentMethods/PaymentMethodsView.vue'),
           meta: {
             requiresAuth: true,
            permissions: ['setting'],
            title: 'Payment Methods',
          },
        },
        {
          path: 'promo-management',
          name: 'PromoManagement',
          component: () => import('@/views/PromoManagement/PromoManagementView.vue'),
          meta: {
            requiresAuth: true,
            permissions: ['setting'],
            title: 'Promo Management',
          },
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/Profile/ProfileView.vue'),
          meta: {
            requiresAuth: true,
            title: 'My Profile',
          },
        },
     ],
   },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const requiredPermissions = to.meta.permissions as string[] | undefined

  // Redirect login page to kasir if already authenticated
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Kasir' })
    return
  }

  // Check authentication
  if (requiresAuth && !authStore.isAuthenticated) {
    next({
      name: 'Login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // Check permission authorization (permission-based)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every((permission) => authStore.hasPermission(permission))

    if (!hasAllPermissions) {

      next({ name: 'Kasir' })
      return
    }
  }

  next()
})

export default router
