/* eslint-disable no-restricted-globals */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {
        title: "Copilote",
        body: "Você tem uma atualização no Copilote.",
        url: "/manutencao",
        tag: "copilote-push",
        requireInteraction: false,
      };

      if (event.data) {
        try {
          const raw = event.data.json();
          const json = raw instanceof Promise ? await raw : raw;
          if (json && typeof json === "object") {
            if (json.title) data.title = String(json.title);
            if (json.body) data.body = String(json.body);
            if (json.url) data.url = String(json.url);
            if (json.tag) data.tag = String(json.tag);
            if (json.requireInteraction === true) data.requireInteraction = true;
          }
        } catch {
          try {
            const rawText = event.data.text();
            const text = rawText instanceof Promise ? await rawText : rawText;
            if (text) data.body = String(text);
          } catch {
            /* ignore */
          }
        }
      }

      if (!data.body || !String(data.body).trim()) {
        data.body = "Abra o Copilote para ver os detalhes.";
      }

      try {
        await self.registration.showNotification(data.title, {
          body: data.body,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          tag: data.tag,
          renotify: true,
          requireInteraction: data.requireInteraction,
          silent: false,
          data: { url: data.url },
        });
      } catch (err) {
        console.error("[Copilote sw] showNotification falhou:", err);
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/manutencao";
  const fullUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            return client.focus().then(() => {
              if ("navigate" in client && typeof client.navigate === "function") {
                return client.navigate(fullUrl);
              }
            });
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      }),
  );
});
