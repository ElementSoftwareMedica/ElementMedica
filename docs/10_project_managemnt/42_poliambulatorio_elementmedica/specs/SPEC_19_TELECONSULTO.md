````markdown
# 📹 SPEC_19: Teleconsulto e Telemedicina

**Versione**: 1.0  
**Data**: 2025-12-11  
**Collegato a**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md), [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md), [SPEC_17_COMUNICAZIONI.md](./SPEC_17_COMUNICAZIONI.md)

---

## 1. OVERVIEW

Il modulo Teleconsulto permette:
- Visite mediche in videochiamata
- Condivisione documenti real-time
- Refertazione remota
- Prescrizioni digitali
- Integrazione con visita in presenza

---

## 2. ARCHITETTURA

```
┌────────────────────────────────────────────────────────────────────┐
│                    SISTEMA TELECONSULTO                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PAZIENTE                              MEDICO                      │
│   ┌──────────┐                         ┌──────────┐                │
│   │  Browser │                         │  Browser │                │
│   │ /WebRTC  │                         │ /WebRTC  │                │
│   └────┬─────┘                         └────┬─────┘                │
│        │                                    │                       │
│        │          ┌───────────────┐         │                       │
│        └──────────┤  MEDIA SERVER ├─────────┘                       │
│                   │   (Jitsi/     │                                 │
│                   │   Twilio)     │                                 │
│                   └───────┬───────┘                                 │
│                           │                                         │
│                   ┌───────┴───────┐                                │
│                   │  BACKEND API  │                                │
│                   │  ElementMedica│                                │
│                   └───────┬───────┘                                │
│                           │                                         │
│          ┌────────────────┼────────────────┐                       │
│          │                │                │                        │
│          ▼                ▼                ▼                        │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐                │
│   │  Sessions  │   │  Storage   │   │ Recording  │                │
│   │  Database  │   │ (documenti)│   │  (opz.)    │                │
│   └────────────┘   └────────────┘   └────────────┘                │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. MODELLI DATI

### 3.1 Schema Prisma

```prisma
// prisma/schema.prisma - Estensione Teleconsulto

model SessioneTeleconsulto {
  id                String    @id @default(uuid())
  
  // Relazioni
  appuntamentoId    String    @unique
  appuntamento      Appuntamento @relation(fields: [appuntamentoId], references: [id])
  
  medicoId          String
  medico            Person    @relation("MedicoTeleconsulto", fields: [medicoId], references: [id])
  
  pazienteId        String
  paziente          Person    @relation("PazienteTeleconsulto", fields: [pazienteId], references: [id])
  
  // Sessione
  roomId            String    @unique  // ID stanza video
  roomUrl           String              // URL completo accesso
  accessTokenMedico String?             // Token accesso medico
  accessTokenPaziente String?           // Token accesso paziente
  
  // Stati
  stato             StatoTeleconsulto @default(PROGRAMMATO)
  
  // Timing
  scheduledStart    DateTime           // Inizio programmato
  scheduledEnd      DateTime           // Fine programmata
  actualStart       DateTime?          // Inizio effettivo
  actualEnd         DateTime?          // Fine effettiva
  
  // Qualità
  qualityScore      Int?               // 1-5 rating post-sessione
  qualityNotes      String?
  
  // Recording (se abilitato)
  recordingEnabled  Boolean   @default(false)
  recordingUrl      String?
  recordingConsent  Boolean   @default(false)  // Consenso paziente
  
  // Metadata
  metadata          Json?     @default("{}")
  
  // Multi-tenancy
  tenantId          String
  
  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  // Relazioni inverse
  documentiCondivisi DocumentoTeleconsulto[]
  messaggi          MessaggioChat[]
  eventi            EventoTeleconsulto[]
  
  @@index([tenantId, scheduledStart])
  @@index([medicoId, stato])
  @@index([pazienteId, stato])
}

enum StatoTeleconsulto {
  PROGRAMMATO       // Schedulato, non ancora iniziato
  IN_ATTESA_PAZIENTE // Medico in sala, paziente non ancora
  IN_ATTESA_MEDICO   // Paziente in sala, medico non ancora
  IN_CORSO           // Videochiamata attiva
  IN_PAUSA           // Temporaneamente sospeso
  COMPLETATO         // Terminato normalmente
  FALLITO            // Problemi tecnici
  CANCELLATO         // Annullato
  NO_SHOW_PAZIENTE   // Paziente non presente
  NO_SHOW_MEDICO     // Medico non presente
}

model DocumentoTeleconsulto {
  id              String    @id @default(uuid())
  
  sessioneId      String
  sessione        SessioneTeleconsulto @relation(fields: [sessioneId], references: [id])
  
  // File
  nome            String
  tipo            TipoDocumentoCondiviso
  url             String
  mimeType        String
  dimensione      Int        // Bytes
  
  // Chi ha condiviso
  condivisoDaId   String
  condivisoDa     Person     @relation(fields: [condivisoDaId], references: [id])
  
  // Quando
  condivisoAt     DateTime   @default(now())
  
  // Note
  note            String?
  
  tenantId        String
  
  @@index([sessioneId])
}

enum TipoDocumentoCondiviso {
  REFERTO_PRECEDENTE
  ESAME_LABORATORIO
  IMAGING
  PRESCRIZIONE
  ALTRO
}

model MessaggioChat {
  id              String    @id @default(uuid())
  
  sessioneId      String
  sessione        SessioneTeleconsulto @relation(fields: [sessioneId], references: [id])
  
  mittentId       String
  mittente        Person    @relation(fields: [mittentId], references: [id])
  
  contenuto       String
  timestamp       DateTime  @default(now())
  
  // Per messaggi sistema
  tipo            TipoMessaggioChat @default(TESTO)
  
  tenantId        String
  
  @@index([sessioneId, timestamp])
}

enum TipoMessaggioChat {
  TESTO
  SISTEMA           // "Paziente entrato", "Connessione persa"
  DOCUMENTO         // Notifica documento condiviso
}

model EventoTeleconsulto {
  id              String    @id @default(uuid())
  
  sessioneId      String
  sessione        SessioneTeleconsulto @relation(fields: [sessioneId], references: [id])
  
  evento          TipoEventoTeleconsulto
  timestamp       DateTime  @default(now())
  
  // Dettagli
  personId        String?    // Chi ha causato l'evento
  metadata        Json?      // Dettagli aggiuntivi
  
  tenantId        String
  
  @@index([sessioneId, timestamp])
}

enum TipoEventoTeleconsulto {
  STANZA_CREATA
  MEDICO_ENTRATO
  MEDICO_USCITO
  PAZIENTE_ENTRATO
  PAZIENTE_USCITO
  SESSIONE_INIZIATA
  SESSIONE_TERMINATA
  DOCUMENTO_CONDIVISO
  SCREEN_SHARE_STARTED
  SCREEN_SHARE_STOPPED
  RECORDING_STARTED
  RECORDING_STOPPED
  ERRORE_CONNESSIONE
  RICONNESSIONE
}
```

---

## 4. FLUSSO TELECONSULTO

### 4.1 Prenotazione

```
1. Paziente prenota "Visita Cardiologica - Teleconsulto"
   └── Flag modalita=TELECONSULTO
          │
          ▼
2. Sistema crea appuntamento + SessioneTeleconsulto
   └── Genera roomId unico
   └── Calcola URL accesso
          │
          ▼
3. Invio conferma paziente
   └── Email con link + istruzioni
   └── SMS reminder
   └── Link test connessione
          │
          ▼
4. Giorno visita: notifiche
   └── 24h prima: reminder email
   └── 1h prima: reminder SMS/WhatsApp
   └── 15 min: link diretto accesso
```

### 4.2 Svolgimento Sessione

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUSSO SESSIONE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRE-SESSIONE (15 min prima)                                    │
│  ├── Paziente: Test connessione/audio/video                     │
│  └── Medico: Revisione cartella clinica                         │
│                                                                  │
│  INGRESSO                                                        │
│  ├── Paziente entra in sala d'attesa virtuale                   │
│  ├── Medico riceve notifica                                     │
│  └── Medico "ammette" paziente                                  │
│                                                                  │
│  SESSIONE                                                        │
│  ├── Videochiamata attiva                                       │
│  ├── Chat laterale per note/link                                │
│  ├── Condivisione documenti                                     │
│  ├── Screen sharing (medico)                                    │
│  └── Timer durata visibile                                      │
│                                                                  │
│  CHIUSURA                                                        │
│  ├── Medico termina sessione                                    │
│  ├── Popup rating qualità (opzionale)                           │
│  └── Redirect a compilazione referto                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. PROVIDER VIDEO

### 5.1 Jitsi Meet (Self-hosted)

```javascript
// backend/services/teleconsulto/jitsiService.js

import { JitsiMeetExternalAPI } from 'jitsi-meet';
import jwt from 'jsonwebtoken';

const JITSI_DOMAIN = process.env.JITSI_DOMAIN; // meet.elementmedica.it
const JITSI_APP_ID = process.env.JITSI_APP_ID;
const JITSI_SECRET = process.env.JITSI_SECRET;

export const jitsiService = {
  // Genera token JWT per accesso stanza
  generateToken(sessioneId, user, role) {
    const payload = {
      context: {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatar: user.avatar
        },
        features: {
          livestreaming: false,
          recording: role === 'medico',
          transcription: false,
          'screen-sharing': role === 'medico'
        }
      },
      aud: JITSI_APP_ID,
      iss: JITSI_APP_ID,
      sub: JITSI_DOMAIN,
      room: sessioneId,
      moderator: role === 'medico'
    };
    
    return jwt.sign(payload, JITSI_SECRET, {
      algorithm: 'HS256',
      expiresIn: '2h'
    });
  },
  
  // URL completo stanza
  getRoomUrl(sessioneId, token) {
    return `https://${JITSI_DOMAIN}/${sessioneId}?jwt=${token}`;
  },
  
  // Configura stanza
  getRoomConfig(options) {
    return {
      roomName: options.sessioneId,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: true,
        enableWelcomePage: false,
        enableClosePage: false,
        disableThirdPartyRequests: true,
        // Layout
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop',
          'chat', 'raisehand', 'tileview',
          'hangup'
        ],
        // Limiti
        maxParticipants: 2,
        enableNoisyMicDetection: true
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_CHROME_EXTENSION_BANNER: false,
        MOBILE_APP_PROMO: false,
        // Custom branding
        DEFAULT_LOGO_URL: 'https://elementmedica.it/logo.png',
        APP_NAME: 'ElementMedica Teleconsulto'
      }
    };
  }
};
```

### 5.2 Twilio Video (Alternative)

```javascript
// backend/services/teleconsulto/twilioVideoService.js

import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const twilioVideoService = {
  async createRoom(sessioneId) {
    const room = await client.video.v1.rooms.create({
      uniqueName: sessioneId,
      type: 'group-small',
      maxParticipants: 2,
      recordParticipantsOnConnect: false,
      statusCallback: `${process.env.API_URL}/webhooks/twilio-video`,
      statusCallbackMethod: 'POST'
    });
    
    return room;
  },
  
  generateAccessToken(sessioneId, user, role) {
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;
    
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { identity: user.id }
    );
    
    token.addGrant(new VideoGrant({
      room: sessioneId
    }));
    
    return token.toJwt();
  }
};
```

---

## 6. COMPONENTI FRONTEND

### 6.1 Sala Teleconsulto (Medico)

```tsx
// src/features/teleconsulto/MedicoTeleconsultoRoom.tsx

export function MedicoTeleconsultoRoom({ sessioneId }) {
  const { sessione, isLoading } = useSessioneTeleconsulto(sessioneId);
  const { join, leave, toggleAudio, toggleVideo, shareScreen } = useVideoRoom();
  const [chatOpen, setChatOpen] = useState(true);
  
  // Auto-join quando sessione disponibile
  useEffect(() => {
    if (sessione?.accessTokenMedico) {
      join(sessione.roomUrl, sessione.accessTokenMedico);
    }
    return () => leave();
  }, [sessione]);
  
  return (
    <div className="h-screen flex">
      {/* Video principale */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="p-4 bg-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Badge variant="live" className="animate-pulse">
              LIVE
            </Badge>
            <span className="text-white">
              {sessione.paziente.firstName} {sessione.paziente.lastName}
            </span>
          </div>
          
          <SessionTimer startTime={sessione.actualStart} />
        </div>
        
        {/* Area video */}
        <div className="flex-1 relative">
          {/* Video remoto (paziente) */}
          <div id="remote-video" className="w-full h-full" />
          
          {/* Video locale (medico) - PiP */}
          <div 
            id="local-video" 
            className="absolute bottom-4 right-4 w-48 h-36 
                       rounded-lg overflow-hidden border-2 border-white"
          />
        </div>
        
        {/* Toolbar */}
        <div className="p-4 bg-gray-800 flex justify-center gap-4">
          <ToolbarButton 
            icon={<Mic />} 
            onClick={toggleAudio}
            active={audioEnabled}
          />
          <ToolbarButton 
            icon={<Video />} 
            onClick={toggleVideo}
            active={videoEnabled}
          />
          <ToolbarButton 
            icon={<Monitor />} 
            onClick={shareScreen}
            label="Condividi"
          />
          <ToolbarButton 
            icon={<FileUp />} 
            onClick={() => setDocumentsOpen(true)}
            label="Documenti"
          />
          <ToolbarButton 
            icon={<MessageSquare />} 
            onClick={() => setChatOpen(!chatOpen)}
            badge={unreadMessages}
          />
          <ToolbarButton 
            icon={<PhoneOff />} 
            onClick={handleEndSession}
            variant="danger"
            label="Termina"
          />
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="w-96 border-l flex flex-col">
        <Tabs defaultValue="chat">
          <TabsList className="w-full">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="cartella">Cartella</TabsTrigger>
            <TabsTrigger value="documenti">Documenti</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1">
            <ChatPanel sessioneId={sessioneId} />
          </TabsContent>
          
          <TabsContent value="cartella">
            <CartellaClinicaPanel pazienteId={sessione.pazienteId} />
          </TabsContent>
          
          <TabsContent value="documenti">
            <DocumentiCondivisiPanel sessioneId={sessioneId} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modal condivisione documenti */}
      <ShareDocumentModal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        sessioneId={sessioneId}
      />
    </div>
  );
}
```

### 6.2 Sala Paziente

```tsx
// src/features/teleconsulto/PazienteTeleconsultoRoom.tsx

export function PazienteTeleconsultoRoom({ sessioneId, accessToken }) {
  const { join, leave, connectionState } = useVideoRoom();
  const [showWaitingRoom, setShowWaitingRoom] = useState(true);
  
  // Waiting room fino a quando medico non ammette
  if (showWaitingRoom) {
    return (
      <WaitingRoom 
        onAdmitted={() => setShowWaitingRoom(false)}
        sessioneId={sessioneId}
      />
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header semplificato */}
      <div className="p-4 bg-blue-600 text-white">
        <h1 className="text-lg font-medium">
          Teleconsulto con Dr. {sessione.medico.lastName}
        </h1>
      </div>
      
      {/* Video area */}
      <div className="flex-1 relative">
        <div id="remote-video" className="w-full h-full" />
        <div 
          id="local-video" 
          className="absolute bottom-4 right-4 w-32 h-24 rounded-lg"
        />
        
        {/* Stato connessione */}
        {connectionState !== 'connected' && (
          <ConnectionOverlay state={connectionState} />
        )}
      </div>
      
      {/* Toolbar semplificata */}
      <div className="p-4 bg-gray-800 flex justify-center gap-6">
        <CircleButton icon={<Mic />} onClick={toggleAudio} />
        <CircleButton icon={<Video />} onClick={toggleVideo} />
        <CircleButton 
          icon={<PhoneOff />} 
          onClick={handleLeave}
          variant="danger"
        />
      </div>
      
      {/* Chat collassabile */}
      <CollapsibleChat sessioneId={sessioneId} />
    </div>
  );
}
```

### 6.3 Pre-call Check

```tsx
// src/features/teleconsulto/PreCallCheck.tsx

export function PreCallCheck({ onReady }) {
  const { 
    audioDevices, 
    videoDevices, 
    selectedAudio, 
    selectedVideo,
    audioLevel,
    videoStream,
    testAudio,
    testVideo
  } = useDeviceCheck();
  
  const [checksCompleted, setChecksCompleted] = useState({
    browser: false,
    camera: false,
    microphone: false,
    network: false
  });
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Verifica connessione</CardTitle>
        <CardDescription>
          Assicurati che audio e video funzionino correttamente
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preview video */}
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Selettore webcam */}
        <div className="space-y-2">
          <Label>Webcam</Label>
          <Select value={selectedVideo} onValueChange={setSelectedVideo}>
            {videoDevices.map(device => (
              <SelectItem key={device.id} value={device.id}>
                {device.label}
              </SelectItem>
            ))}
          </Select>
          <CheckItem 
            label="Camera funzionante" 
            checked={checksCompleted.camera}
          />
        </div>
        
        {/* Selettore microfono */}
        <div className="space-y-2">
          <Label>Microfono</Label>
          <Select value={selectedAudio} onValueChange={setSelectedAudio}>
            {audioDevices.map(device => (
              <SelectItem key={device.id} value={device.id}>
                {device.label}
              </SelectItem>
            ))}
          </Select>
          
          {/* Visualizzatore livello audio */}
          <AudioLevelMeter level={audioLevel} />
          
          <CheckItem 
            label="Microfono funzionante" 
            checked={checksCompleted.microphone}
          />
        </div>
        
        {/* Test rete */}
        <div className="space-y-2">
          <NetworkQualityIndicator />
          <CheckItem 
            label="Connessione stabile" 
            checked={checksCompleted.network}
          />
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={onReady}
          disabled={!Object.values(checksCompleted).every(Boolean)}
          className="w-full"
        >
          Sono pronto per la visita
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 7. API ENDPOINTS

```
# Gestione Sessioni

POST /api/v1/teleconsulto/sessioni
     # Crea sessione per appuntamento
     { appuntamentoId, scheduledStart, scheduledEnd, recordingEnabled }

GET  /api/v1/teleconsulto/sessioni/:id
     # Dettaglio sessione (tokens inclusi per autorizzati)

PUT  /api/v1/teleconsulto/sessioni/:id/stato
     # Aggiorna stato
     { stato: "IN_CORSO" | "COMPLETATO" | ... }

DELETE /api/v1/teleconsulto/sessioni/:id
     # Cancella sessione

# Accesso Stanza

GET  /api/v1/teleconsulto/sessioni/:id/join
     # Ottieni URL e token per entrare
     # Verifica: user = medico o paziente della sessione

POST /api/v1/teleconsulto/sessioni/:id/admit
     # Medico ammette paziente dalla waiting room

# Documenti

GET  /api/v1/teleconsulto/sessioni/:id/documenti
     # Lista documenti condivisi

POST /api/v1/teleconsulto/sessioni/:id/documenti
     # Condividi documento
     # multipart/form-data + metadata

# Chat

GET  /api/v1/teleconsulto/sessioni/:id/messaggi
     # Storico chat

POST /api/v1/teleconsulto/sessioni/:id/messaggi
     # Invia messaggio

# Eventi (per analytics)

GET  /api/v1/teleconsulto/sessioni/:id/eventi
     # Log eventi sessione

# Webhooks (da provider video)

POST /webhooks/jitsi
     # Eventi Jitsi (join, leave, etc.)

POST /webhooks/twilio-video
     # Eventi Twilio Video
```

---

## 8. WEBSOCKET REAL-TIME

```javascript
// Socket events per teleconsulto

// Client -> Server
socket.emit('teleconsulto:join', { sessioneId, role });
socket.emit('teleconsulto:leave', { sessioneId });
socket.emit('teleconsulto:chat:send', { sessioneId, message });
socket.emit('teleconsulto:document:share', { sessioneId, documentId });
socket.emit('teleconsulto:admit', { sessioneId, pazienteId });

// Server -> Client
socket.on('teleconsulto:participant:joined', { userId, role });
socket.on('teleconsulto:participant:left', { userId, role });
socket.on('teleconsulto:chat:message', { from, message, timestamp });
socket.on('teleconsulto:document:shared', { document });
socket.on('teleconsulto:session:ended', { reason });
socket.on('teleconsulto:admitted', {});  // Per paziente in waiting room
```

---

## 9. QUALITÀ E MONITORAGGIO

### 9.1 Metriche Real-time

```javascript
// Metriche WebRTC da monitorare
const metricsToTrack = {
  video: {
    frameRate: 'frames per second',
    resolution: 'width x height',
    bitrate: 'kbps',
    packetsLost: 'count',
    jitter: 'ms'
  },
  audio: {
    bitrate: 'kbps',
    packetsLost: 'count',
    jitter: 'ms',
    audioLevel: '0-1'
  },
  connection: {
    rtt: 'round trip time ms',
    candidateType: 'host/srflx/relay',
    transport: 'udp/tcp'
  }
};
```

### 9.2 Alert Qualità

```javascript
// Soglie alert
const qualityThresholds = {
  warning: {
    packetsLost: 5,    // %
    jitter: 50,        // ms
    rtt: 300           // ms
  },
  critical: {
    packetsLost: 15,
    jitter: 100,
    rtt: 500
  }
};
```

---

## 10. COMPLIANCE E PRIVACY

### 10.1 Requisiti GDPR

- ✅ Consenso esplicito per videochiamata
- ✅ Consenso separato per registrazione
- ✅ Dati trasmessi su canali crittografati (DTLS-SRTP)
- ✅ Server in EU (Jitsi self-hosted o Twilio EU)
- ✅ Retention policy: registrazioni max 90 giorni
- ✅ Diritto cancellazione registrazioni

### 10.2 Consensi da Raccogliere

```javascript
const consensiTeleconsulto = [
  {
    codice: 'TELECONSULTO_BASE',
    obbligatorio: true,
    testo: 'Acconsento alla visita medica in videochiamata...'
  },
  {
    codice: 'TELECONSULTO_RECORDING',
    obbligatorio: false,
    testo: 'Acconsento alla registrazione della videochiamata...'
  },
  {
    codice: 'TELECONSULTO_CONDIVISIONE',
    obbligatorio: false,
    testo: 'Acconsento alla condivisione di documenti sanitari...'
  }
];
```

---

## 11. COLLEGAMENTI

- **Specifiche correlate**: 
  - [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md) - Integrazione appuntamenti
  - [SPEC_10_REFERTI.md](./SPEC_10_REFERTI.md) - Refertazione post-visita
  - [SPEC_17_COMUNICAZIONI.md](./SPEC_17_COMUNICAZIONI.md) - Notifiche

- **Workflow**:
  - [WF_05_TELECONSULTO.md](../workflows/WF_05_TELECONSULTO.md) - (da creare)

````
