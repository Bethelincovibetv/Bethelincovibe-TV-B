/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App in service worker using same project credentials
const firebaseConfig = {
  apiKey: "AIzaSyCLlihrS6ZeFw3wL_eiHT64abcAG174ISs",
  authDomain: "gen-lang-client-0285472300.firebaseapp.com",
  projectId: "gen-lang-client-0285472300",
  storageBucket: "gen-lang-client-0285472300.firebasestorage.app",
  messagingSenderId: "629993507936",
  appId: "1:629993507936:web:43ac0a691ee3dba8454705"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
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
