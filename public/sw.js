// Service worker mínimo, solo para push notifications — esta app no cachea
// nada offline acá (eso ya lo resuelve lib/offline/ con localStorage), así
// que no hace falta ningún manejo de "fetch" ni de versionado de caché.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "GastosApp";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/" },
    })
  );
});

// Al tocar la notificación: si ya hay una pestaña de la app abierta, la
// enfoca en vez de abrir una nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
