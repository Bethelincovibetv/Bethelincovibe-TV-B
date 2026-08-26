/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker using the connected project credentials
const firebaseConfig = {
  apiKey: "AIzaSyBmFKlk6QdZcj-R2Wx9Of-cxBmPS6_kCNc",
  authDomain: "gen-lang-client-0608170961.firebaseapp.com",
  projectId: "gen-lang-client-0608170961",
  storageBucket: "gen-lang-client-0608170961.firebasestorage.app",
  messagingSenderId: "1059984699317",
  appId: "1:1059984699317:web:387e5c9b2db596f45db3fc"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

let messaging;
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
        data: { url: '/dashboard' }
      })
    );
  }
});

// Handle background messages via Firebase Messaging SDK
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Bethelincovibe TV';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New notification received.',
      icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
      badge: '/logo.png',
      image: payload.notification?.image || payload.data?.image || undefined,
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
      // If a tab is already open, focus it and navigate
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
