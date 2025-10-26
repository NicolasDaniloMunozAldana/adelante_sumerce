# adelante_sumerce
adelante_sumerce/
├─ config/
│  └─ firebase-service-account.json   👈 archivo que descargas de Firebase Admin SDK
├─ public/
│  └─ css/, js/, images/
├─ src/
│  ├─ controllers/
│  │  ├─ authController.js
│  │  ├─ homeController.js
│  │  └─ SDKFirebase.js  (para autenticación del cliente)
│  ├─ middlewares/
│  │  └─ authMiddleware.js
│  ├─ routes/
│  │  ├─ authRoutes.js
│  │  └─ homeRoutes.js
│  ├─ views/
│  │  ├─ auth/
│  │  │  ├─ login.ejs
│  │  │  ├─ register.ejs
│  │  │  └─ forgot-password.ejs
│  │  ├─ home/
│  │  └─ partials/
│  │     └─ 404.ejs
│  └─ index.js  👈 este archivo
└─ package.json
└─ .env