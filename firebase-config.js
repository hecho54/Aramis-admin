/* ══════════════════════════════════════════════════════════════
   ARAMIS Pizza & Pub — Firebase konfiguráció
   ══════════════════════════════════════════════════════════════

   Beállítás lépései:
   ─────────────────
   1.  Látogasd meg:  https://console.firebase.google.com
   2.  Kattints:      „Projekt hozzáadása" → adj nevet (pl. aramis-rendeles)
   3.  Bal menü:      Build → Realtime Database → Adatbázis létrehozása
                      Helyszín: europe-west1 (Belgium) → tesztelési módban indítsd
   4.  Szabályok fül: cseréld le az egészet erre, majd Közzétesz:
                      { "rules": { ".read": true, ".write": true } }
   5.  Bal menü:      Projekt áttekintés ⚙ → Projektek beállításai
   6.  Görgess le:    „Webalkalmazás hozzáadása" (</>), adj nevet, regisztrálj
   7.  Másold a       firebaseConfig objektum értékeit az alábbi mezőkbe
   8.  Mentsd el ezt a fájlt — kész!

   ══════════════════════════════════════════════════════════════ */

window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCP4oktyz3Zh4imu8JVLZOdRJNEj8PaW2U",
  authDomain:        "aramis-b1e4a.firebaseapp.com",
  databaseURL:       "https://aramis-b1e4a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "aramis-b1e4a",
  storageBucket:     "aramis-b1e4a.firebasestorage.app",
  messagingSenderId: "465953894129",
  appId:             "1:465953894129:web:b6aa5840120465834f8350"
};
