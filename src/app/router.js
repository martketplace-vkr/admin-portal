export function readRoute() {
  const pathname = window.location.pathname || '/'
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (cleanPath === '/reviews' || cleanPath === '/admin/reviews') {
    return { page: 'reviews' }
  }

  if (cleanPath === '/payments' || cleanPath === '/admin/payments') {
    return { page: 'payments' }
  }

  if (cleanPath === '/orders' || cleanPath === '/admin/orders') {
    return { page: 'orders' }
  }

  if (cleanPath === '/tariffs' || cleanPath === '/admin/tariffs') {
    return { page: 'tariffs' }
  }

  if (cleanPath === '/' || cleanPath === '/admin') {
    return { page: 'dashboard' }
  }

  if (cleanPath === '/moderation' || cleanPath === '/admin/moderation') {
    return { page: 'moderation' }
  }

  const moderationProductMatch = cleanPath.match(/^\/(?:admin\/)?moderation\/([^/]+)$/)
  if (moderationProductMatch) {
    return { page: 'moderationProduct', productId: decodeURIComponent(moderationProductMatch[1]) }
  }

  if (cleanPath === '/categories' || cleanPath === '/admin/categories') {
    return { page: 'categories' }
  }

  if (cleanPath === '/vendors' || cleanPath === '/admin/vendors') {
    return { page: 'vendors' }
  }

  const vendorProfileMatch = cleanPath.match(/^\/(?:admin\/)?vendors\/([^/]+)$/)
  if (vendorProfileMatch) {
    return { page: 'vendorProfile', vendorId: decodeURIComponent(vendorProfileMatch[1]) }
  }

  if (cleanPath === '/profile' || cleanPath === '/admin/profile') {
    return { page: 'profile' }
  }

  return { page: 'notFound' }
}
