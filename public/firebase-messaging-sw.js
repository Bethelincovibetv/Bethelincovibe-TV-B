/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker using the official project credentials
const firebaseConfig = {
  apiKey: "AIzaSyBWYvA98usL-Mdz0Lm9HtPqtPtfrt1x2Wc",
  authDomain: "refreshing-rune-454812-q8.firebaseapp.com",
  projectId: "refreshing-rune-454812-q8",
  storageBucket: "refreshing-rune-454812-q8.firebasestorage.app",
  messagingSenderId: "386135102110",
  appId: "1:386135102110:web:334e9b26db398a5698618f"
};

if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Firebase init error:', err);
  }
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Messaging init notice:', e);
}

// Handle standard push events even when the app is completely in background or closed
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Bethelincovibe TV';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || payload.data?.message || 'New update from Bethelincovibe TV',
      icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
      badge: '/logo.png',
      image: payload.notification?.image || payload.data?.image || undefined,
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: payload.data?.url || payload.data?.deep_link || payload.notification?.click_action || '/dashboard',
        timestamp: Date.now()
      },
      tag: payload.data?.tag || 'bethelincovibe-push',
      renotify: true,
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (err) {
    const rawText = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Bethelincovibe TV', {
        body: rawText,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        data: { url: '/dashboard' }
      })
    );
  }
});

// Handle background messages via Firebase Messaging SDK
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Bethelincovibe TV';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New notification received.',
      icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
      badge: '/logo.png',
      image: payload.notification?.image || payload.data?.image || undefined,
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || payload.data?.deep_link || payload.notification?.click_action || '/dashboard',
        timestamp: Date.now()
      },
      tag: payload.data?.tag || 'bethelincovibe-notification',
      renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click to navigate to the deep link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open on this origin, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new tab with the target URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
