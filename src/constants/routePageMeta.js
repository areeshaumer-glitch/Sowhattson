/** Default page heading title per route (settings layout, meta helpers). */
export function getDefaultPageMeta(pathname) {
  if (pathname.startsWith('/settings/profile')) {
    return { title: 'My Profile' };
  }
  if (pathname.startsWith('/settings/notifications')) {
    return { title: 'Notification Setting' };
  }
  if (pathname.startsWith('/settings/password')) {
    return { title: 'Change Password' };
  }

  const routes = {
    '/dashboard': { title: 'Dashboard' },
    '/experiences': { title: 'Experiences' },
    '/tickets': { title: 'Tickets' },
    '/providers': { title: 'Providers' },
    '/explorers': { title: 'Explorers' },
    '/tags': { title: 'Tags' },
    '/reviews': { title: 'Reviews' },
    '/payments': { title: 'Payments' },
    '/vibes': { title: 'Vibes' },
    '/settings': { title: 'Settings' },
  };

  return routes[pathname] ?? { title: "So What's On" };
}
