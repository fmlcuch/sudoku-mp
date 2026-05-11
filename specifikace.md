# Specifikace hry: Sudoku Multiplayer

## 1. Cíl produktu

Online soutěžní Sudoku pro 2 hráče v reálném čase.
Oba hráči hrají ve **stejné tabulce** současně.
Vyhrává ten, kdo **správně vyplní více políček**.

Hra má působit jako **newspaper / paperwhite editor**:
- světlý papírový podklad
- jemné stíny
- čitelné serifové písmo
- decentní kontrast
- jednoduché, elegantní ovládání

---

## 2. Herní princip

### Základní smyčka
1. Hráč se připojí do lobby nebo pozve soupeře.
2. Server vygeneruje jednu společnou hru.
3. Oba hráči vyplňují stejnou mřížku.
4. Každé správné pole se započítá hráči, který ho vyplnil jako první.
5. Po dokončení nebo po vypršení času se určí vítěz.

### Výhra
Vyhrává hráč s vyšším počtem bodů:
- 1 bod za správně vyplněné pole
- 0 bodů za chybný pokus
- volitelně penalizace za chyby: `-0.25`

### Tiebreaker
Při shodě bodů rozhoduje:
1. méně chyb
2. kratší čas do posledního správného tahu
3. případně remíza

---

## 3. Herní pravidla

### Mřížka
- klasické Sudoku 9×9
- 3×3 bloky
- zadání má vždy jedno řešení

### Sdílený stav
- oba hráči vidí stejnou mřížku v reálném čase
- po potvrzení čísla server rozhodne, zda je tah validní
- pokud už je pole obsazené, nelze ho přepsat

### Tah
- hráč vybere pole
- zvolí číslo
- server ověří tah
- správný tah:
  - zamkne pole
  - přičte bod
  - aktualizuje skóre oběma hráčům
- chybný tah:
  - pole zůstává volné
  - zaznamená se chyba
  - volitelně krátká vizuální odezva

### Nápovědy
Na začátku raději vypnout nebo omezit:
- hinty mohou být v soutěžním režimu zakázané
- případně dostupné jen v tréninku

---

## 4. Režimy hry

### A. Soutěžní režim
- 2 hráči
- časovač
- skóre
- žádné nápovědy
- výsledek po skončení

### B. Tréninkový režim
- solo hra
- ukládání rozehranosti
- poznámky
- nápovědy
- bez online soupeře

### C. Private room
- hra jen přes kód místnosti
- vhodné pro kamarády nebo testování

---

## 5. Tok uživatele

### Start
- úvodní obrazovka
- tlačítko `Nová hra`
- tlačítko `Připojit se`
- tlačítko `Vytvořit místnost`

### Lobby
- místnost s kódem
- čekání na soupeře
- výběr obtížnosti
- start hry po potvrzení oběma hráči nebo hostem

### Herní obrazovka
- levá část: Sudoku
- pravá část: čísla, stav, skóre, čas, chat / reakce
- na mobilu: board nahoře, ovládání pod ním nebo vysouvací panel

### Konec hry
- konečné skóre
- vítěz
- remíza
- možnost rematche
- návrat do lobby

---

## 6. Datový model

### Hlavní entity

#### User
- id
- displayName
- avatarUrl
- createdAt
- lastSeenAt

#### Room
- id
- roomCode
- hostUserId
- status: `waiting | playing | finished`
- difficulty
- createdAt
- startedAt
- finishedAt

#### Game
- id
- roomId
- puzzleSeed
- puzzleGrid
- solutionGrid
- currentGrid
- status
- turnMode: `simultaneous`
- timeLimitSeconds
- createdAt
- updatedAt

#### GamePlayer
- id
- gameId
- userId
- score
- mistakes
- connected
- lastActionAt

#### CellClaim
- id
- gameId
- row
- col
- value
- userId
- isCorrect
- createdAt

#### MoveEvent
- id
- gameId
- userId
- row
- col
- value
- result: `correct | wrong | blocked`
- createdAt

---

## 7. Databázový systém

### Doporučení
- **PostgreSQL** jako hlavní databáze
- **Redis** pro realtime stav místností, připojení a krátkodobé session informace
- volitelně object storage jen pokud budou avatary / logy / exporty

### Proč takhle
- PostgreSQL: trvalá data, historie her, výsledky, statistiky
- Redis: rychlé realtime zápisy, presence, locky, heartbeat, matchmaking

### Uložení stavu hry
- PostgreSQL ukládá výsledný stav a historii
- Redis drží aktuální live stav během hry
- po skončení se live stav persistuje do PostgreSQL

### Konzistence
Server je autorita.
Klient jen posílá záměry tahu, ne pravdu.

---

## 8. Realtime propojení

### Technologie
- WebSocket pro živé tahy, scoring a presence
- REST API pro login, lobby, historie a výsledky

### Tok
1. klient se připojí na WS
2. server přidělí session
3. klient se přihlásí do room
4. server rozesílá:
   - tahy
   - skóre
   - stav hry
   - připojení / odpojení
   - konec hry

### Sync pravidla
- klient nikdy nepřepisuje serverový stav přímo
- každý tah je potvrzen serverem
- při reconnectu klient stáhne aktuální snapshot

---

## 9. Konflikty a pravidla validace

### Konfliktní tahy
Když oba hráči zkusí vyplnit stejné pole:
- server přijme první validní tah
- druhý pokus odmítne jako `blocked`

### Chybný tah
- tah neprojde validací vůči řešení
- pole se nezamkne
- chyby se evidují

### Duplicate protection
- stejné pole nelze odehrát dvakrát
- server vrátí stav `occupied`

---

## 10. UI / UX design

### Styl
**Newspaper / paperwhite**:
- odstíny starého papíru
- jemně zašpiněná bílá
- černohnědý inkoust
- tenké linky, lehký emboss
- serif + čitelné UI písmo

### Vizuální charakter
- hra musí působit jako kvalitní tištěná stránka
- žádné neonové barvy
- minimum rušivých animací
- jemné mikrointerakce

### Layout
#### Desktop
- max šířka 800 px pro hlavní obsah
- board nesmí přetékat výšku okna
- pokud je okno nízké, board se zmenší
- pravý panel pro čísla a akce

#### Široké monitory
- stále centrované
- nešířit board příliš agresivně
- raději zachovat elegantní vzduch
- obsah nesmí být oříznutý

#### Mobil
- hlavně board-first
- čísla až po výběru pole
- ovládací panel vysouvací
- start screen scrollovatelný
- hra fixní bez zbytečného scrollu

### Barvy
- background: `#f5efe1`
- panel: `#fbf7ef`
- text: `#2a2218`
- linky: `#cbb99c`
- accent: `#7c5c2e`

---

## 11. Struktura souborů

Doporučená struktura projektu:

```text
sudoku-multiplayer/
├─ public/
│  ├─ index.html
│  ├─ favicon.svg
│  └─ manifest.json
├─ src/
│  ├─ app/
│  │  ├─ main.ts
│  │  ├─ router.ts
│  │  └─ state.ts
│  ├─ components/
│  │  ├─ TopBar.tsx
│  │  ├─ SudokuBoard.tsx
│  │  ├─ Keypad.tsx
│  │  ├─ LobbyCard.tsx
│  │  └─ ScoreBoard.tsx
│  ├─ game/
│  │  ├─ sudokuGenerator.ts
│  │  ├─ sudokuValidator.ts
│  │  ├─ gameRules.ts
│  │  └─ scoring.ts
│  ├─ net/
│  │  ├─ wsClient.ts
│  │  ├─ apiClient.ts
│  │  └─ reconnect.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  ├─ newspaper.css
│  │  └─ responsive.css
│  └─ utils/
│     ├─ time.ts
│     ├─ ids.ts
│     └─ storage.ts
├─ server/
│  ├─ index.ts
│  ├─ ws/
│  │  ├─ rooms.ts
│  │  ├─ events.ts
│  │  └─ presence.ts
│  ├─ services/
│  │  ├─ gameService.ts
│  │  ├─ roomService.ts
│  │  └─ scoringService.ts
│  ├─ db/
│  │  ├─ schema.sql
│  │  ├─ migrations/
│  │  └─ repositories/
│  └─ auth/
│     ├─ session.ts
│     └─ users.ts
├─ shared/
│  ├─ types.ts
│  ├─ events.ts
│  └─ constants.ts
└─ README.md
```

### Poznámka
Pokud zvolíme jednoduchý stack bez Reactu, lze to zploštit do:
- `index.html`
- `style.css`
- `script.js`
- `server.js`
- `db/`

Ale pro multiplayer je lepší oddělit klienta a server.

---

## 12. Návrh API

### REST
- `POST /api/rooms` — vytvořit místnost
- `POST /api/rooms/join` — připojit se k místnosti
- `GET /api/rooms/:code` — detail místnosti
- `GET /api/games/:id` — snapshot hry
- `GET /api/results/:gameId` — výsledky

### WebSocket eventy
#### Client -> Server
- `room:create`
- `room:join`
- `game:move`
- `game:ready`
- `presence:ping`
- `chat:message` (volitelně)

#### Server -> Client
- `room:state`
- `game:snapshot`
- `game:moveAccepted`
- `game:moveRejected`
- `score:update`
- `player:joined`
- `player:left`
- `game:finished`

---

## 13. Rozšíření

### Verze 1
- 2 hráči
- matchmaking přes kód
- realtime board
- skóre
- konec hry

### Verze 2
- chat / quick reactions
- rematch
- historie zápasů
- osobní statistiky

### Verze 3
- ranked mode
- sezóny
- denní challenge
- týmové režimy
- spectate mód

### Verze 4
- turnajové místnosti
- privátní serverové lobby
- kosmetické skiny papíru a písma
- přizpůsobení vzhledu místnosti

---

## 14. Bezpečnost a anti-cheat

- server validuje každý tah
- klient nesmí poslat hotový board jako pravdu
- rate limit na eventy
- reconnect ochrana
- room auth token
- snapshot po reconnectu
- audit log tahů

---

## 15. Přístupnost

- klávesová navigace
- vysoký kontrast v textu
- dostatečně velké tap targety
- čitelné fonty
- jasný focus state
- podpora pro screen readers

---

## 16. Ne-funkční požadavky

- odezva realtime do 200 ms ideálně
- stabilní reconnect
- plynulý mobilní layout
- bez ořezávání boardu
- jednoduchá správa stavů
- připravenost na deploy na GitHub Pages + backend hosting

---

## 17. Implementační plán

1. navrhnout datové modely
2. vytvořit server pro rooms a websocket
3. udělat generátor sudoku
4. napojit board na live stav
5. přidat scoring
6. přidat lobby a připojení
7. doladit newspaper design
8. otestovat na mobilu i desktopu

---

## 18. Poznámky k implementaci

- hru raději stavět server-first
- board i skóre musí být autoritativní na backendu
- klient má být co nejhloupější a nejodolnější
- paperwhite styl držet konzistentně od start screen až po end screen

---

## 19. Shrnutí

Tahle hra je:
- realtime Sudoku pro 2 hráče
- soutěž o počet správně vyplněných polí
- se serverovou validací
- s newspaper vizuálem
- s jednoduchým, čitelným UX
- připravená na rozšiřování

---

## 20. Rozhodnutí pro start vývoje

Doporučený stack:
- Frontend: Vite + TypeScript
- Backend: Node.js + Fastify nebo Express
- Realtime: WebSocket
- DB: PostgreSQL
- Cache/presence: Redis

Pokud chceme začít jednodušeji, můžeme nejdřív postavit:
- čisté HTML/CSS/JS UI
- jednoduchý Node backend
- lokální mock multiplayer

