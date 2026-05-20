import './App.css'
import { Sidebar } from './components/layout/Sidebar'
import { ToastHost } from './components/layout/ToastHost'
import { useAdminPortalController } from './hooks/useAdminPortalController'
import { AdminCategoriesPage } from './pages/AdminCategoriesPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminModerationPage, AdminModerationProductPage } from './pages/AdminModerationPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { AdminPaymentsPage } from './pages/AdminPaymentsPage'
import { AdminProfilePage } from './pages/AdminProfilePage'
import { AdminVendorProfilePage, AdminVendorsPage } from './pages/AdminVendorsPage'
import { AuthPage } from './pages/AuthPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReviewsModerationPage } from './pages/ReviewsModerationPage'

function App() {
  const controller = useAdminPortalController()

  if (controller.sessionStatus === 'checking') {
    return (
      <div className="loading-stage">
        <div className="loading-card">
          <h1>{controller.loadingCopy.title}</h1>
        </div>
      </div>
    )
  }

  if (!controller.isAuthorized) {
    return (
      <div className="vendor-root">
        <AuthPage {...controller.authProps} />
        <ToastHost toasts={controller.toasts} />
      </div>
    )
  }

  return (
    <div className="vendor-root">
      <div className="vendor-shell">
        <Sidebar {...controller.shellProps.sidebar} />

        <div className="vendor-main">
          <main className="vendor-stage">{renderCurrentPage(controller)}</main>
        </div>
      </div>

      <ToastHost toasts={controller.toasts} />
    </div>
  )
}

function renderCurrentPage(controller) {
  if (controller.route.page === 'reviews') {
    return <ReviewsModerationPage {...controller.pageProps.reviews} />
  }

  if (controller.route.page === 'payments') {
    return <AdminPaymentsPage {...controller.pageProps.payments} />
  }

  if (controller.route.page === 'orders') {
    return <AdminOrdersPage {...controller.pageProps.orders} />
  }

  if (controller.route.page === 'dashboard') {
    return <AdminDashboardPage {...controller.pageProps.dashboard} />
  }

  if (controller.route.page === 'moderation') {
    return <AdminModerationPage {...controller.pageProps.moderation} />
  }

  if (controller.route.page === 'moderationProduct') {
    return <AdminModerationProductPage {...controller.pageProps.moderationProduct} />
  }

  if (controller.route.page === 'categories') {
    return <AdminCategoriesPage {...controller.pageProps.categories} />
  }

  if (controller.route.page === 'vendors') {
    return <AdminVendorsPage {...controller.pageProps.vendors} />
  }

  if (controller.route.page === 'vendorProfile') {
    return <AdminVendorProfilePage {...controller.pageProps.vendorProfile} />
  }

  if (controller.route.page === 'profile') {
    return <AdminProfilePage {...controller.pageProps.profile} />
  }

  return <NotFoundPage {...controller.pageProps.notFound} />
}

export default App
