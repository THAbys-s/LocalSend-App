# LocalSend Mobile — Expo SDK 56

App móvil de transferencia P2P de archivos vía red local. Descubre computadoras cercanas con UDP y transfiere archivos vía WebSocket + TCP.

---

## Stack técnico

- **Expo SDK 56** con React 19 y React Native 0.85
- **Typescript** para type safety
- **react-native-reanimated** para animaciones fluidas
- **react-native-udp** + **react-native-tcp-socket** para networking
- **expo-file-system** para lectura chunked de archivos
- **expo-haptics** para feedback táctil

---

## Requisitos previos

- Node.js 18+
- npm o yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (para builds): `npm install -g eas-cli`

### Para Android
- Android Studio + JDK 17
- Un dispositivo físico o emulador

### Para iOS
- Xcode 14+
- CocoaPods

---

## Instalación rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Crear development build (necesario para UDP/TCP nativas)
expo prebuild --clean

# 3. Ejecutar en Android
expo run:android

# O en iOS
expo run:ios
```

---

## Desarrollo local

### Para ver cambios en vivo:
```bash
npm start
```

Luego:
- Presiona `a` para Android (necesita desarrollo build preexistente)
- Presiona `i` para iOS
- Escanea el QR con Expo Go (pero UDP/TCP no funcionarán — solo desarrollo build)

---

## Estructura del proyecto

```
LocalSendMobile_Complete/
├── App.tsx                 # Raíz + navegación
├── index.js                # Entry point Expo
├── app.json                # Config de Expo
├── package.json            # Dependencias
├── babel.config.js         # Babel setup
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
├── eas.json                # EAS Build profiles
└── src/
    ├── screens/
    │   └── HomeScreen.tsx
    ├── components/
    │   ├── RadarAnimation.tsx
    │   ├── DeviceCard.tsx
    │   └── TransferProgressSheet.tsx
    ├── services/
    │   ├── DiscoveryService.ts (UDP broadcast)
    │   └── TransferService.ts (WebSocket + TCP)
    ├── hooks/
    │   ├── useTheme.ts
    │   ├── useDiscovery.ts
    │   └── useTransfer.ts
    ├── theme/
    │   └── index.ts
    └── utils/
        └── deviceInfo.ts
```

---

## Flujo de la app

### 1. **Discovery (UDP)**
- La app escucha en puerto 53317
- Envía beacon cada 2 segundos: `{type: 'beacon', deviceId, alias, deviceType: 'mobile'}`
- Detecta beacons del desktop y muestra en lista

### 2. **File Selection**
- Usuario selecciona archivo o foto
- Elige dispositivo de escritorio destino

### 3. **Transfer (WebSocket + TCP)**
- **Fase 1 (WebSocket :53317):** Negocia metadatos (nombre, tamaño, MIME)
  ```json
  {
    "type": "transfer-request",
    "deviceId": "mobile-xxx",
    "alias": "Cheerful Teal Android",
    "file": { "name": "foto.jpg", "size": 2048576, "mimeType": "image/jpeg" }
  }
  ```
  Desktop responde: `{"type": "accept"}` o `{"type": "reject"}`

- **Fase 2 (TCP raw :53318):** Stream de 32KB chunks
  ```
  [header JSON]\n[bytes del archivo]
  ```

---

## Permisos requeridos

### Android
- `INTERNET` — TCP/WebSocket
- `ACCESS_NETWORK_STATE` — Wi-Fi check
- `CHANGE_WIFI_MULTICAST_STATE` — UDP multicast
- `READ_MEDIA_IMAGES` — Galería (Android 13+)
- `READ_EXTERNAL_STORAGE` — Archivos (Android ≤12)
- `VIBRATE` — Haptic feedback
- `FOREGROUND_SERVICE` — Background transfers (opcional)

### iOS
- `NSLocalNetworkUsageDescription` — **CRÍTICO**: sin esto UDP no funciona en iOS 14+
- `NSPhotoLibraryUsageDescription` — Galería
- `NSBonjourServices` — Para que iOS permita UDP

---

## Integración con Desktop (Electron)

Tu app de escritorio necesita:

### 1. Enviar beacon UDP a 255.255.255.255:53317 cada 2s
```javascript
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

const beacon = Buffer.from(JSON.stringify({
  type: 'beacon',
  deviceId: 'desktop-abc123',
  alias: 'Mi Laptop',
  deviceType: 'desktop',
  port: 53317,
  version: '1.0',
}));

setInterval(() => {
  socket.send(beacon, 53317, '255.255.255.255', err => {
    if (err) console.error('UDP send error:', err);
  });
}, 2000);

socket.on('message', (msg, rinfo) => {
  try {
    const data = JSON.parse(msg.toString());
    console.log('Discovery from:', data.alias, rinfo.address);
  } catch (_) {}
});

socket.bind(53317);
```

### 2. Aceptar WebSocket en :53317
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 53317 });

wss.on('connection', ws => {
  ws.on('message', msg => {
    const data = JSON.parse(msg);
    if (data.type === 'transfer-request') {
      // Mostrar dialog al usuario
      if (userAccepts) {
        ws.send(JSON.stringify({ type: 'accept' }));
      } else {
        ws.send(JSON.stringify({ type: 'reject' }));
      }
    }
  });
});
```

### 3. Recibir TCP raw en :53318
```javascript
const net = require('net');
const fs = require('fs');

net.createServer(socket => {
  let headerDone = false, fileStream = null;
  let buffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    if (!headerDone) {
      buffer = Buffer.concat([buffer, chunk]);
      const idx = buffer.indexOf('\n');
      if (idx !== -1) {
        const header = JSON.parse(buffer.slice(0, idx).toString());
        fileStream = fs.createWriteStream(`~/Downloads/${header.name}`);
        headerDone = true;
        if (buffer.length > idx + 1) {
          fileStream.write(buffer.slice(idx + 1));
        }
        buffer = Buffer.alloc(0);
      }
    } else {
      fileStream.write(chunk);
    }
  });

  socket.on('end', () => {
    if (fileStream) fileStream.end();
  });
}).listen(53318);
```

---

## Troubleshooting

### "No se detectan dispositivos"
- Verificar que ambos estén en la misma red Wi-Fi (no datos móviles)
- En Windows: revisar Firewall (permitir UDP 53317, TCP 53317-53318)
- Algunos routers bloquean broadcast — intentar con multicast `239.255.77.77`

### iOS no detecta dispositivos
- Asegurar que `NSLocalNetworkUsageDescription` esté en `app.json`
- En iOS 14+, la app debe pedir permiso explícitamente la primera vez
- Ejecutar app de escritorio primero (para que iOS vea tráfico UDP)

### Transferencia lenta
- Reducir CHUNK_SIZE en `TransferService.ts` de 32KB a 16KB
- Verificar velocidad de red con `speedtest`
- En Android, desactivar "Battery Optimization" para la app

### "Cannot find module react-native-udp"
- Ejecutar `expo prebuild --clean` nuevamente
- Asegurar que el development build fue instalado correctamente

---

## Build de producción

### Android APK
```bash
eas build --platform android --profile preview
```

### Android App Bundle (para Play Store)
```bash
eas build --platform android --profile production
```

### iOS
```bash
eas build --platform ios --profile production
```

---

## Roadmap

- [ ] Soporte para iOS
- [ ] Selector de carpeta de destino
- [ ] Historial de transferencias
- [ ] Cambiar alias del dispositivo
- [ ] Soporte para múltiples archivos simultaneos
- [ ] Compresión de archivos
- [ ] Encriptación E2E

---

## Licencia

MIT — LocalSend Mobile 2026
