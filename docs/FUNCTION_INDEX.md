# Indeks funkcji — Ghost Protocol

Indeks wygenerowany z analizy kodu w `src/` (stan na gałąź `main`, commit `c74067e`).
Obejmuje funkcje i klasy najwyższego poziomu (top-level). Funkcje zagnieżdżone i
handlery inline są pominięte. Numery linii mogą się przesunąć po zmianach w kodzie.

Legenda: **export** = funkcja eksportowana z modułu. Zależności podano na poziomie pliku.

---

## Mapa modułów

| Moduł | Rola | Importuje z |
|---|---|---|
| `src/main.js` | Punkt wejścia, wywołuje `boot()` | `core/game.js` |
| `src/core/game.js` | Orkiestracja: boot, menu startowe, start runu, pętla gry, tutorial | prawie wszystkie moduły |
| `src/core/state.js` | Globalny stan `G`, inicjalizacja fal i pięter, ulepszenia hacków | `constants` |
| `src/core/persistence.js` | Zapis/odczyt stanu huba (`localStorage: gp_hub_state`) | `state` |
| `src/core/constants.js` | Stałe: rozmiar kafla, mapy, typy kafli, dystanse | — |
| `src/core/balance.js` | Parametry balansu trace i breach | — |
| `src/debug/debugBootstrap.js` | Flagi debug (start z kredytami, kontaktami, shardami) | — |
| `src/entities/*` | Kamera, dron, strażnik, technik, gracz, dystrakcja | `state`, `systems/mission`, `systems/ui`, `world/pathing`, `utils/*` |
| `src/world/generator.js` | Generacja map wielopiętrowych, tutorialu, ścieżek, schodów | `constants` |
| `src/world/floors/generator.js` | Szkic generatora pięter (placeholder) | — |
| `src/world/map.js`, `pathing.js` | Kolizje ruchu i pathfinding | `constants` |
| `src/systems/update.js` | Główna pętla logiki (`update(dt)`), ruch gracza, wykrycie, spawn | entities, systems |
| `src/systems/render.js` | Rysowanie canvasu: kafle, mgła, stożki widzenia, urządzenia | `state`, `constants` |
| `src/systems/visibility.js` | Widoczność i mgła wojny (raycast) | `state` |
| `src/systems/input.js` | Obsługa klawiatury i myszy na canvasie, podpowiedzi hover | `state`, `hacking` |
| `src/systems/hacking.js` | Menu kontekstowe celów, hacki urządzeń (kamery, strażnicy, drony) | `ui`, `mission`, `quickhacks` |
| `src/systems/terminalRuntime.js` | Realtime terminal (overlay): komendy, cele, heat, podpowiedzi | `ui`, `mission`, `terminalCommands`, `traceSystem`, `tutorial`, `quickhacks`, `networkBreach` |
| `src/systems/terminalCommands.js` | Rejestr komend terminala i koszty heat/bw | — |
| `src/systems/terminalParser.js` | Parsowanie i autouzupełnianie komend | `terminalCommands` |
| `src/systems/traceSystem.js` | System śladu (trace): wartość, progi, kontrmiary | `state`, `balance` |
| `src/systems/networkBreach.js` | Główna gra wieloetapowa (breach terminala głównego) | `state`, `mission` |
| `src/systems/mission.js` | Fazy misji, wygrana/przegrana, tekst misji | `ui`, `recruitment`, `dataFragments`, `runIntel` |
| `src/systems/quickhacks.js` | Quickhacki: okno czasowe, sloty, sklep | `ui`, `terminalRuntime` |
| `src/systems/recruitment.js` | Hub: runy, kontakty, załoga (operatorzy), wyniki runów | `state`, `persistence`, `runIntel` |
| `src/systems/runIntel.js` | Generator proceduralnych plików wywiadu (intel) per run | `state` |
| `src/systems/dataFragments.js` | Fragmenty danych: tablica, połączenia, dekrypcja, metadane | `state` |
| `src/systems/tutorial.js` | Kroki tutorialu i podpowiedzi naprawcze | `state`, `terminalRuntime`, `ui`, `mission` |
| `src/systems/menuTerminal.js` | Terminal w menu startowym (help, runs, crew, market, ssh do intel) | `state`, `persistence`, `recruitment`, `quickhacks`, `networkBreach`, `dataFragments`, `runIntel` |
| `src/systems/audio.js` | Muzyka (pule utworów, fade, intro), preferencje audio | `state` |
| `src/systems/ui.js` | HUD, log, lista celów, panele huba, tablica danych | `constants`, `state`, `audio` |

---

## src/core/game.js

| Funkcja | Linia | Opis |
|---|---|---|
| `playMainMenuClickSfx` | 76 | Odtwarza dźwięk kliknięcia w menu |
| `bindMainMenuClickSfx` | 93 | Podpina dźwięk kliknięcia do przycisków menu (raz) |
| `getGlobalWalletCredits` | 131 | Zwraca saldo kredytów z huba |
| `setGlobalWalletCredits` | 152 | Ustawia saldo kredytów w hubie (zaokrąglone, ≥0) |
| `applyDebugBootstrap` | 176 | Nadpisuje kredyty/kontakty/shardy wg `DEBUG_BOOTSTRAP` |
| `renderStartMenu` | 204 | Renderuje ekran startowy (operatorzy, runy, rynek) |
| `renderHackMarket` | 358 | Renderuje rynek quickhacków i akcji breach z slotami |
| `buyQuickHackFromMenu` | 482 | Kup quickhack z menu |
| `equipQuickHackFromMenu` | 496 | Załóż quickhack w slot loadoutu |
| `buyBreachActionFromMenu` | 508 | Kup akcję breach z menu |
| `equipBreachActionFromMenu` | 522 | Załóż akcję breach w slot |
| `buyMetadataScannerFromMenu` | 533 | Kup Metadata Scanner (koszt 2000) |
| `buyDecryptorFromMenu` | 553 | Kup Decryptor v1 (koszt 2500) |
| `getAllRunsForPlan` | 572 | Łączy aktywne runy i runy z kontaktów (rekrutacja) w jedną listę |
| `getRunDifficulty` | 605 | Etykieta trudności runu (recruit / hardcore / hard / …) |
| `renderPlanMapAndList` | 613 | Renderuje mapę i listę runów w zakładce plan |
| `getRunNetworkName` | 656 | Deterministyczna nazwa sieci hosta dla runu |
| `renderPlanRunDetail` | 663 | Szczegóły wybranego runu i przycisk infiltracji |
| `renderIntelHostPicker` | 716 | Lista hostów do wyboru w panelu wywiadu |
| `renderIntelPanel` | 769 | Renderuje panel wywiadu (drzewo plików, nagłówek) |
| `renderIntelFile` | 902 | Pokazuje zawartość wybranego pliku wywiadu |
| `bindIntelMarkButtons` | 920 | Podpina przyciski oznaczeń (verified / suspicious / clear) |
| `updateIntelFileStatus` | 951 | Aktualizuje status pliku (odczytany, plik/katalog) |
| `updateIntelMarkButtons` | 977 | Podświetla aktywne oznaczenie pliku |
| `getIntelReadMap` | 991 | Mapa przeczytanych plików runu |
| `getIntelMarkMap` | 1000 | Mapa oznaczeń użytkownika dla runu |
| `openIntelForRun` | 1009 | Otwiera panel wywiadu dla runu |
| `hashString` | 1026 | Hash FNV-1a (ziarno do generacji) |
| `pickFromSeed` | 1037 | Deterministyczny wybór elementu z listy po ziarnie |
| `buildOperatorPortrait` | 1041 | Generuje proceduralny portret operatora (SVG/canvas) |
| `switchStartMenuTab` | 1108 | Przełącza zakładkę menu (plan, recruit, market, terminal, instructions) |
| `hideMainMenu` | 1170 | Ukrywa menu główne |
| `showMainMenu` | 1179 | Pokazuje menu główne |
| `openMainMenuForRunSelection` | 1197 | Otwiera menu z wyborem runu (używane przez `RESTART`/`NEXT`) |
| `startTerminalStream` | 1206 | Animacja strumienia tekstu przy starcie runu |
| `startSelectedRun` | 1244 | Startuje wybrany run z planu |
| `startSelectedRunFromMap` | 1270 | Alias `startSelectedRun` dla widoku mapy |
| `startTutorialRun` | 1274 | Startuje mapę tutorialu |
| `createTutorialDevices` | 1336 | Tworzy urządzenia (kamery, strażnicy, drony) na mapie tutorialu |
| `boot` | 1381 (export) | Inicjalizacja gry: UI, stan huba, audio, terminale, pętla, menu |
| `startRun` | 1447 (export) | Buduje mapę pięter, spawnuje encje i resetuje stan dla nowego runu |
| `startLoop` | 1521 | Pętla `requestAnimationFrame`: `update` → `updateVisibility` → `render` |
| `updateAmbientBg` | 1540 | Włącza overlay tła przy wysokim alarmie (>85) |
| `resize` | 1550 | Dopasowuje rozmiar canvasu do okna |

## src/core/state.js

| Funkcja | Linia | Opis |
|---|---|---|
| `createTerminalRuntimeState` | 1 | Domyślny stan realtime terminala (heat, cele, kolejka) |
| `createTraceRuntimeState` | 68 | Domyślny stan trace (wartość, prędkości, maska) |
| `createTutorialState` | 84 | Domyślny stan tutorialu i postępu |
| `initWaveState` | 258 (export) | Ustawia stan fali: gracz, załoga, loadout, piętra |
| `initFloorState` | 337 (export) | Ustawia stan konkretnego piętra (mapa, urządzenia, widoczność) |
| `byType` | 403 (export) | Filtruje `G.devices` po typie (`cam`, `guard`, `drone`, `tech`, …) |
| `upgradeHack` | 407 (export) | Ulepsza poziom quickhacka za koszt |

## src/core/persistence.js

| Funkcja | Linia | Opis |
|---|---|---|
| `clone` | 5 | Bezpieczna kopia głęboka przez JSON |
| `saveHubState` | 13 (export) | Zapisuje hub do `localStorage` (`gp_hub_state`) |
| `loadHubState` | 42 (export) | Wczytuje hub z `localStorage` |

## src/core/constants.js / balance.js / debug

- `constants.js`: `TILE`, `MAP_W/H`, `HUD_HEIGHT`, `HACK_RANGE`, `PLAYER_SPEED`, `TILE_TYPES`, `MAIN_HACK_DISTANCE`, `EXFIL_DISTANCE` (brak funkcji).
- `balance.js`: `TRACE_TIERS`, `TRACE_BALANCE`, `BREACH_BALANCE` (stałe, brak funkcji).
- `debug/debugBootstrap.js`: `DEBUG_BOOTSTRAP` (`enabled`, `contacts`, `dataShards`, `credits`).

## src/entities

| Plik | Funkcja | Linia | Opis |
|---|---|---|---|
| `camera.js` | `createCamera` (export) | 1 | Tworzy kamerę w pokoju (`cam{index}`) |
| `distraction.js` | `createDistraction` (export) | 1 | Tworzy węzeł dystrakcji (świało/panel) |
| `distraction.js` | `tickDistraction` (export) | 22 | Aktualizacja dystrakcji (obecnie pusta) |
| `drone.js` | `createDrone` (export) | 6 | Tworzy drona krążącego po pokoju |
| `drone.js` | `tickDrone` (export) | 28 | Ruch drona; obsługa stanu przejęcia (`hijacked`) |
| `guard.js` | `generatePatrolWaypoints` | 10 | Generuje punkty patrolu strażnika |
| `guard.js` | `createGuard` (export) | 40 | Tworzy strażnika z pozycją startową i patrolem |
| `guard.js` | `tickGuard` (export) | 73 | Logika strażnika: patrol, alarm, timery optyki/motoryki, widzenie |
| `guard.js` | `isPlayerHiddenFromGuard` | 239 | Czy gracz jest ukryty przed strażnikiem (cień, hide spot) |
| `guard.js` | `moveWithPath` | 251 | Ruch strażnika po ścieżce do celu |
| `player.js` | `createPlayer` (export) | 1 | Tworzy obiekt gracza (pozycja, HP, BW, kredyty) |
| `technician.js` | `createTechnician` (export) | 10 | Tworzy technika (`tech{index}`) |
| `technician.js` | `tickTechnician` (export) | 35 | Logika technika: patrol, wykrywanie, dyspozycja do kamery |
| `technician.js` | `moveToward` | 176 | Ruch technika w stronę celu |
| `technician.js` | `updateSpotting` | 203 | Wykrywanie gracza przez technika (cooldown, zasięg) |
| `technician.js` | `isPlayerHiddenFromTech` | 242 | Czy gracz jest ukryty przed technikiem |

## src/world

| Plik | Funkcja | Linia | Opis |
|---|---|---|---|
| `generator.js` | `generateMultiFloorMap` (export) | 4 | Generuje wiele pięter (domyślnie 3) |
| `generator.js` | `generateMap` (export) | 66 | Generuje jedno piętro: pokoje, korytarze, terminale, wejście |
| `generator.js` | `generateTutorialMap` (export) | 303 | Stała mapa tutorialu |
| `generator.js` | `assignRunAccessPlan` | 524 | Przypisuje sieci i shardy hasła do terminali pobocznych |
| `generator.js` | `generatePassphrase` | 574 | Generuje hasło do terminala głównego |
| `generator.js` | `splitPassphrase` | 581 | Dzieli hasło na shardy |
| `generator.js` | `makeNetworkName` | 594 | Tworzy nazwę sieci (prefiks + piętro + ordynał) |
| `generator.js` | `pick` | 601 | Losowy wybór z listy |
| `generator.js` | `placeDebugMainTerminal` | 605 | Umieszcza terminal główny w trybie debug |
| `generator.js` | `addPillarsInLargeRooms` | 629 | Dodaje filary w dużych pokojach |
| `generator.js` | `addCorporatePartitions` | 665 | Dodaje przegrody w pokojach biurowych |
| `generator.js` | `paintPartitionLine` | 719 | Maluje linię przegrody z przejściem |
| `generator.js` | `canPlaceRoom` | 762 | Sprawdza, czy pokój nie nachodzi na inne |
| `generator.js` | `pickRoomProfile` | 778 | Losuje typ pokoju |
| `generator.js` | `addDistractionNodes` | 792 | Dodaje węzły dystrakcji |
| `generator.js` | `ensureCriticalPaths` | 871 | Gwarantuje ścieżkę od wejścia do terminala głównego |
| `generator.js` | `findAdjacentWallTile` | 888 | Szuka ściany przy punkcie (np. dla terminala ściennego) |
| `generator.js` | `hasPath` | 915 | Sprawdza istnienie ścieżki (BFS) |
| `generator.js` | `carveRoute` | 967 | Wykopuje trasę między punktami |
| `generator.js` | `placeStairTile` | 986 | Umieszcza schody w pokoju |
| `generator.js` | `isValidStairPlacement` | 1021 | Waliduje położenie schodów |
| `floors/generator.js` | `generateFloors` | 4 | Szkic generatora pięter (placeholder) |
| `floors/generator.js` | `generateSingleFloor` | 19 | Szkic jednego piętra (placeholder) |
| `map.js` | `canWalk` (export) | 3 | Czy kafel jest przechodni |
| `pathing.js` | `findNextStep` (export) | 4 | Następny krok A* / BFS do celu |

## src/utils

| Plik | Funkcja | Linia | Opis |
|---|---|---|---|
| `math.js` | `dst` (export) | 1 | Odległość euklidesowa |
| `math.js` | `clamp` (export) | 5 | Ograniczenie wartości do przedziału |
| `los.js` | `lineOfSight` (export) | 1 | Linia widzenia (Bresenham) przez kafle |

## src/systems/update.js

| Funkcja | Linia | Opis |
|---|---|---|
| `spawnEntities` (export) | 29 | Tworzy kamery, strażników, drony i techników dla fali |
| `getSpawnRooms` | 71 | Wybiera pokoje spawnu (bez wejścia) |
| `update` (export) | 91 | Główna aktualizacja logiki w każdej klatce |
| `checkDeadGuardDiscovery` | 218 | Wykrycie martwego strażnika przez innych |
| `canWatcherSeeBody` | 238 | Czy strażnik widzi ciało |
| `canCameraSeeBody` | 259 | Czy kamera widzi ciało |
| `updatePlayerMovement` | 290 | Ruch gracza z WASD (z kolizjami) |
| `canOccupy` | 333 | Czy gracz zmieści się na danej pozycji |
| `checkExfiltration` | 347 | Sprawdza ekstrakcję przy wejściu (faza 2) |
| `checkStairTransition` | 376 | Przejście schodami między piętrami |
| `findEntryTile` | 454 | Pozycja wejścia na piętro |
| `resolveSafeSpawnPoint` | 474 | Bezpieczny punkt startowy na piętrze |
| `isSpawnPointSafe` | 490 | Czy punkt nie koliduje z przeszkodami |
| `findNearestSafeSpawnTile` | 498 | Najbliższy bezpieczny kafel |
| `updateCameras` | 524 | Aktualizacja widzenia kamer i alarmów |
| `triggerGuardInvestigation` | 566 | Wysłanie strażnika na miejsce gracza |
| `triggerGuardInvestigationAt` | 570 (export) | Wysłanie strażnika na współrzędne |
| `isPlayerHiddenFrom` | 596 | Czy gracz jest ukryty przed obserwatorem |

## src/systems/render.js

| Funkcja | Linia | Opis |
|---|---|---|
| `render` (export) | 4 | Rysuje klatkę: kafle, mgłę, stożki, urządzenia, gracza, overlaye |
| `drawHoverLabel` | 35 | Etykieta obiektu pod kursorem |
| `drawFog` | 68 | Mgła wojny (odkryte / widoczne) |
| `drawTiles` | 104 | Rysuje kafle w viewport |
| `drawDoorPreviewLinks` | 335 | Linie podglądu połączeń drzwi |
| `drawCameraFov` | 370 | Stożki widzenia kamer |
| `drawGuardVision` | 395 | Stożki widzenia strażników |
| `drawDevices` | 420 | Rysuje wszystkie urządzenia |
| `drawPlayer` | 446 | Rysuje gracza |
| `drawOverlays` | 476 | Blackout i inne nakładki |
| `drawTerminalScanHighlights` | 493 | Podświetlenie wyników skanu |
| `getHighlightColor` | 524 | Kolor podświetlenia wg typu celu |
| `drawVisionCone` | 535 | Rysuje stożek widzenia |
| `drawClippedCone` | 549 | Stożek przycięty przez ściany |
| `traceVisionRay` | 563 | Promień widzenia do pierwszej ściany |
| `drawDevice` | 588 | Rysuje pojedyncze urządzenie |
| `applyDesaturationEffect` | 682 | Efekt odbarwienia przy obrażeniach/alarmie |

## src/systems/visibility.js / input.js

| Plik | Funkcja | Linia | Opis |
|---|---|---|---|
| `visibility.js` | `updateVisibility` (export) | 4 | Przelicza widoczne kafle wokół gracza |
| `visibility.js` | `castRay` | 32 | Raycast widoczności |
| `visibility.js` | `markVisibleTile` | 61 | Oznacza kafel jako widoczny i odkryty |
| `input.js` | `bindInput` (export) | 13 | Podpina klawiaturę i mysz (raz) |
| `input.js` | `clearCanvasHover` | 66 | Czyści podpowiedź hover |
| `input.js` | `handleCanvasHover` | 70 | Ustawia podpowiedź po najechaniu |
| `input.js` | `getDeviceLabel` | 162 | Etykieta typu urządzenia |
| `input.js` | `withNetworkName` | 171 | Dokleja nazwę sieci do etykiety |

## src/systems/hacking.js

| Funkcja | Linia | Opis |
|---|---|---|
| `playHackSfx` | 24 | Dźwięk hacka |
| `closeCtx` (export) | 45 | Zamyka menu kontekstowe |
| `addCtxBtn` | 52 | Dodaje przycisk do menu kontekstowego |
| `addCtxSep` | 64 | Dodaje separator |
| `showCtx` (export) | 70 | Pokazuje menu kontekstowe dla celu |
| `handleCanvasClick` (export) | 214 | Obsługa kliknięcia na canvas |
| `announceTerminalOverlayFlow` | 272 | Podpowiedź o przepływie w terminalu |
| `getTerminalFlowHint` | 285 | Tekst podpowiedzi dla typu celu |
| `hackCam` | 320 | Hack kamery (koszt BW 15) |
| `loopCam` | 339 | Pętla wideo kamery (BW 8) |
| `overloadGuard` (export) | 366 | Przeciążenie strażnika (BW 30) |
| `blindGuard` | 380 | Oślepienie strażnika (BW 15) |
| `redirectGuard` | 401 | Przekierowanie strażnika (BW 10) |
| `hijackDrone` (export) | 420 | Przejęcie drona (BW 25) |
| `killDrone` | 435 | Zniszczenie drona (BW 20) |
| `hackSideTerm` | 449 | Hack terminala pobocznego (BW 20) |
| `renderTerminalOptions` | 472 | Opcje menu dla terminala |
| `buildTerminalOptions` | 507 | Buduje listę opcji terminala |
| `disableNearestCamera` | 602 | Wyłącza najbliższą kamerę |
| `redirectNearestGuard` | 620 | Przekierowuje najbliższego strażnika |
| `revealLocalMap` | 643 | Odsłania lokalną mapę piętra |
| `restoreBandwidth` | 654 | Przywraca BW |
| `extractCryptoCredits` | 663 | Wyciąga kredyty z terminala |
| `disableTechnicians` | 678 | Wyłącza techników (BW 12) |
| `eliminateTechnician` | 691 | Eliminuje technika (BW 8) |
| `disableNearestDrone` | 706 | Wyłącza najbliższego drona |
| `renderDoorControlMenu` | 724 | Menu sterowania drzwiami |
| `toggleDoor` | 769 | Otwiera/zamyka drzwi (BW 4) |
| `requestTechnician` | 780 | Wysyła technika do kamery |
| `blindSector` | 803 | Oślepia sektor (BW 5) |
| `falseAlarm` | 820 | Fałszywy alarm (BW 10) |
| `suppressAlert` | 843 | Tłumi alarm (BW 15) |
| `raiseCameraInteractionAlert` | 853 | Podnosi alarm przy interakcji z kamerą |

## src/systems/terminalRuntime.js (realtime terminal)

Najbardziej rozbudowany moduł (~3100 linii). Wykonuje komendy w czasie rzeczywistym, z kolejką, cooldownem i heat.

| Funkcja | Linia | Opis |
|---|---|---|
| `initTerminalRuntime` (export) | 164 | Inicjalizacja stanu i DOM terminala |
| `resetTerminalRuntime` (export) | 194 | Reset przy starcie runu |
| `isTerminalOverlayOpen` (export) | 240 | Czy overlay jest otwarty |
| `toggleTerminalOverlay` (export) | 244 | Przełącza overlay (klawisz TAB) |
| `closeTerminalOverlay` (export) | 272 | Zamyka overlay |
| `autocompleteTerminalInput` (export) | 288 | Autouzupełnianie w wejściu |
| `executeTerminalInput` (export) | 300 | Wykonuje wpisaną komendę |
| `tickTerminalRuntime` (export) | 329 | Tick: kolejka, cooldowny, heat, aktywne hacki |
| `tickTerminalScriptQueue` | 366 | Wykonuje kolejne linie skryptu |
| `queueTerminalScript` | 380 | Dodaje skrypt do kolejki |
| `noteMainHackChannelProgress` (export) | 397 | Aktualizuje postęp kanału hacka terminala głównego |
| `syncTerminalOverlay` (export) | 425 | Synchronizuje widok overlay z stanem |
| `queueTerminalCommand` | 495 | Kolejkuje komendę (blokada przy cooldownie) |
| `resolveCommandExecution` | 595 | Wykonuje komendę po opóźnieniu i ewentualnym scramblu |
| `resolveTargetAlias` | 883 | Rozwiązuje alias celu (`cam_0`, `#1`, …) |
| `runConnect` | 908 | `connect <cel>` — połączenie z celem |
| `runDisconnect` | 959 | `disconnect` |
| `runScanLocal` | 978 | `scan local` |
| `runScanNetwork` | 1005 | `scan network` |
| `runDownloadMap` | 1020 | `download map` na terminalu pobocznym |
| `runDownloadHack` | 1037 | `download hack` |
| `runTransferCredits` | 1051 | `transfer credits` |
| `runDumpCreds` | 1067 | `dump creds` |
| `runBreachFirewall` | 1115 | `breach firewall` |
| `requireSideTerminalTarget` | 1138 | Walidacja, że cel to terminal poboczny |
| `markSideTerminalConsumed` | 1171 | Oznacza terminal jako wykorzystany |
| `runInject` | 1182 | `inject` (wstrzyknięcie payloadu) |
| `runScp` | 1218 | `scp` (kopiowanie danych) |
| `runSource` | 1247 | `source` (wczytanie skryptu) |
| `runFeedBlind` | 1289 | `feed blind` na kamerze |
| `runFeedLoop` | 1301 | `feed loop` na kamerze |
| `runElevatorUnlock` | 1317 | `elevator unlock` |
| `runElevatorMove` | 1321 | Ruch windy (up/down) |
| `runBreach` | 1342 | `breach <cel>` |
| `runDeploy` | 1378 | `deploy worm` |
| `runOverride` | 1414 | `override` |
| `runSetFriendly` | 1438 | `set friendly` |
| `runUnlock` | 1461 | `unlock` (drzwi, winda) |
| `runReroute` | 1508 | `reroute` |
| `runDisable` | 1519 | `disable` |
| `runDistractionCommand` | 1539 | Komendy dystrakcji (`lights cut`, `junction overload`) |
| `registerTimedHack` | 1638 | Rejestruje hack z czasem trwania |
| `resolveConnectedTarget` | 1647 | Aktualnie połączony cel |
| `findTargetById` | 1655 | Znajdź cel po id |
| `enumerateHackTargets` | 1661 | Lista celów (lokalnych lub całej sieci) |
| `getElevatorTargets` | 1780 | Piętra dostępne windą |
| `pushTarget` | 1810 | Dodaje cel do listy z limitem odległości |
| `handleTerminalInputKeyDown` | 1817 | Obsługa klawiszy w wejściu terminala |
| `runHelp` | 1867 | `help [temat]` |
| `runTutorial` | 1999 | `tutorial` — instrukcja terminala |
| `runClear` | 2031 | `clear` |
| `emitTutorialIntro` | 2048 | Wiadomość powitalna terminala |
| `pushConnectedHelp` | 2054 | Pomoc dla połączonego celu |
| `pushConnectedCommandHint` | 2096 | Podpowiedź komend dla celu |
| `updateScanHighlights` | 2131 | Aktualizuje podświetlenia skanu |
| `syncTerminalHints` | 2144 | Podpowiedź wpisywanego tekstu |
| `autocompleteInputValue` | 2157 | Logika autouzupełniania |
| `autocompleteCommandByToken` | 2216 | Autouzupełnianie komendy po tokenach |
| `getAutocompletePhraseTokens` | 2277 | Lista fraz do autouzupełniania |
| `getAutocompleteTargetIds` | 2293 | Lista id celów do autouzupełniania |
| `parseConnectInlineChain` | 2298 | Parsuje łańcuch `connect ... -> akcja` |
| `normalizeInlineSegment` | 2350 | Normalizuje segment łańcucha |
| `resolveCameraInlineAction` | 2371 | Akcja kamery w łańcuchu |
| `resolveInlineActionFromTail` | 2391 | Akcja z końcówki łańcucha |
| `getTerminalPrompt` | 2408 | Prompt terminala (zależny od celu) |
| `findNearbyStair` | 2418 | Najbliższe schody |
| `dispatchTechnicianToCamera` | 2442 | Wysyła technika do kamery |
| `longestCommonPrefix` | 2462 | Wspólny prefiks (autouzupełnianie) |
| `pushTerminalLine` | 2484 | Dodaje linię do wyjścia terminala |
| `syncTerminalOutputDom` | 2503 | Renderuje wyjście do DOM |
| `formatScanLine` | 2562 | Formatuje linię wyniku skanu |
| `getScanLineClass` | 2576 | Klasa CSS linii skanu |
| `isMainTerminalAccessUnlocked` | 2588 | Czy terminal główny jest odblokowany |
| `getMainAuthProgress` | 2592 | Postęp zbierania shardów hasła |
| `getRecoveredShardsOrdered` | 2598 | Odzyskane shardy w kolejności |
| `clearMovementKeys` | 2606 | Czyści klawisze ruchu przy otwarciu terminala |
| `escapeHtml` | 2621 | Escape HTML |
| `addTerminalHeat` (export) | 2630 | Dodaje heat terminala |
| `getTerminalHeatPenaltyMs` (export) | 2658 | Kara czasowa z powodu heat |
| `getCommandHeatCost` | 2672 | Koszt heat komendy |
| `getCommandBwCost` | 2676 | Koszt BW komendy |
| `getTerminalHeatStateLabel` | 2680 | Etykieta stanu heat (NORMAL / OVERHEAT / …) |
| `updateTerminalHeatState` | 2695 | Aktualizacja heat (decay, overheat, crash) |
| `runAutoConnectGuard` | 2738 | Automatyczne połączenie ze strażnikiem |
| `ensureTerminalDirectives` | 2755 | Inicjalizacja dyrektyw systemowych |
| `emitTerminalDirectiveBootLine` | 2811 | Linia startowa dyrektyw |
| `pushCommandTelemetryLine` | 2836 | Telemetria po komendzie |
| `trackMetaObjectiveProgress` | 2856 | Postęp celu meta |
| `applyAICounterreaction` | 2894 | Reakcja AI systemu na komendy (kontrmiary) |
| `runQuickHackOnTarget` | 2973 | Quickhack wykonany z terminala |
| `openDetectionTerminal` (export) | 3036 | Otwiera panel detekcji dla strażnika |
| `closeDetectionTerminal` (export) | 3083 | Zamyka panel detekcji |
| `listRewards` | 3100 | Lista nagród (`rewards/`) |

## src/systems/terminalCommands.js / terminalParser.js

| Plik | Funkcja | Linia | Opis |
|---|---|---|---|
| `terminalCommands.js` | `getCommandDef` (export) | 513 | Definicja komendy po id |
| `terminalCommands.js` | `listCommandPhrases` (export) | 517 | Lista fraz komend (`COMMAND_REGISTRY`) |
| `terminalParser.js` | `normalizeInput` | 3 | Normalizacja wejścia (trim, lowercase, spacje) |
| `terminalParser.js` | `startsWithTokens` | 7 | Dopasowanie fraz po tokenach |
| `terminalParser.js` | `parseTerminalCommand` (export) | 21 | Parsuje wejście na `{commandId, args}` |
| `terminalParser.js` | `autocompleteTerminalCommand` (export) | 65 | Autouzupełnianie komendy |

`terminalCommands.js` zawiera stałe `COMMAND_REGISTRY`, `COMMAND_BY_ID`, i (w `terminalRuntime.js`) `COMMAND_HEAT_COSTS`/`COMMAND_BW_COSTS`.

## src/systems/traceSystem.js

| Funkcja | Linia | Opis |
|---|---|---|
| `addTrace` (export) | 5 | Dodaje trace (wartość rośnie, progi) |
| `softenTrace` (export) | 20 | Zmniejsza trace |
| `activateTraceMask` (export) | 28 | Aktywuje maskę (spowalnia narastanie) |
| `activateGhostWindow` (export) | 36 | Aktywuje okno ghost (niewidoczność trace) |
| `tickTraceSystem` (export) | 44 | Tick trace: pasywny wzrost, rozpad, reakcje |
| `applyCountermeasureTier` | 89 | Stosuje kontrmiarę dla danego progu (1–4) |

## src/systems/networkBreach.js (terminal główny)

| Funkcja | Linia | Opis |
|---|---|---|
| `ensureCatalogState` | 18 | Inicjalizuje katalog akcji breach |
| `createDefaultMainBreachState` | 38 | Domyślny stan breach |
| `ensureMainBreachState` | 54 | Gwarantuje istnienie stanu breach |
| `terminalState` | 61 | Skrót do `G.terminalRuntime` |
| `logBreachLine` | 65 | Log linii breach |
| `setTerminalContext` | 72 | Ustawia kontekst terminala |
| `setMainHackStep` | 79 | Ustawia krok hacka terminala głównego |
| `unlockedShardCount` | 86 | Liczba odzyskanych shardów |
| `normalizeSlotName` | 90 | Normalizacja nazwy slotu (a/b/…) |
| `getBreachActionDefinitions` (export) | 98 | Katalog akcji breach |
| `buyBreachAction` (export) | 103 | Kup akcję breach |
| `equipBreachActionInSlot` (export) | 122 | Załóż akcję w slot (0–3) |
| `initNetworkBreachBridge` (export) | 141 | Pusty (legacy bridge usunięty) |
| `resetNetworkBreachState` (export) | 145 | Reset breach |
| `launchNetworkBreach` (export) | 160 | Uruchamia breach |
| `handleCrackIce` (export) | 184 | Faza 1: złamanie ICE |
| `handleProbeLock` (export) | 204 | Sondowanie zamka (wymaga fazy ≥1) |
| `openAuthLock` | 216 | Otwiera blokadę auth |
| `handleInjectBypass` (export) | 224 | Wstrzyknięcie obejścia (po probe) |
| `handleUploadCreds` (export) | 239 | Upload poświadczeń |
| `handleUploadPayload` (export) | 258 | Upload payloadu do slotu |
| `handleAbortBreach` (export) | 286 | Przerwanie breach |
| `tickNetworkBreach` (export) | 299 | Tick breach: trace, CPU/RAM, black ICE |
| `failNetworkBreach` (export) | 345 | Porażka breach |
| `noteMainBreachShardAvailable` (export) | 356 | Odblokowuje auth przy zdobyciu shardu |

## src/systems/quickhacks.js

| Funkcja | Linia | Opis |
|---|---|---|
| `grantQuickHack` (export) | 71 | Dodaje ładunki quickhacka |
| `getQuickHackDefinitions` (export) | 84 | Lista quickhacków |
| `getQuickHackDefinition` (export) | 88 | Definicja po id |
| `getEquippedQuickHackIds` (export) | 92 | Założone quickhacki |
| `buyQuickHackCatalogItem` (export) | 102 | Kup quickhack |
| `equipQuickHackInSlot` (export) | 125 | Załóż quickhack w slot |
| `startQuickHackWindow` (export) | 155 | Start okna czasowego (zwolnienie czasu) |
| `tickQuickHackWindow` (export) | 171 | Tick okna quickhacka |
| `getTimeScale` (export) | 194 | Współczynnik czasu (zwolniony w oknie) |
| `resetQuickHackState` (export) | 198 | Reset |
| `useQuickHack` (export) | 212 | Użycie quickhacka (koszt heat, efekt) |
| `getQuickHackHeatCost` | 310 | Koszt heat (np. ddos = 24) |
| `triggerNeuralOverload` | 332 | Efekt neural: blackout 9 s |
| `resolveQuickHackTarget` | 367 | Wybór celu quickhacka |
| `bindQuickHackUIEvents` | 384 | Podpięcie zdarzeń UI |
| `showQuickHackUI` | 405 | Pokaż panel wyboru |
| `renderQuickHackTimer` | 421 | Pasek czasu okna |
| `renderQuickHackChoices` | 435 | Lista wyboru quickhacków |
| `hideQuickHackUI` | 463 | Ukryj panel |

## src/systems/recruitment.js (hub)

| Funkcja | Linia | Opis |
|---|---|---|
| `randInt` / `randFloat` / `pick` | 46 / 50 / 54 | Losowanie pomocnicze |
| `createStarterCrewMember` | 58 | Startowy operator (tier skid / operator) |
| `ensureStarterCrew` | 73 | Gwarantuje startową załogę |
| `tierFromWave` | 83 | Tier kontaktu wg fali i notoryczności |
| `ensureHubState` (export) | 94 | Inicjalizuje cały hub (runy, kontakty, załoga, notoryczność) |
| `createRunOffer` | 227 | Tworzy ofertę runu (typ, cel, zagrożenie, piętra, zysk) |
| `getCurrentRunOffer` (export) | 259 | Aktualny run |
| `getActiveRunOffers` (export) | 264 | Lista aktywnych ofert |
| `setCurrentRunOffer` (export) | 269 | Wybór runu |
| `autoSelectRunForWave` (export) | 281 | Auto-wybór runu dla fali |
| `rotateRunBoardAfterRun` (export) | 294 | Odświeża tablicę runów po runie |
| `createContact` | 310 | Tworzy kontakt (rekrutowalny operator) |
| `maybeGrantContactFromMainTerminal` (export) | 355 | Kontakt jako nagroda za terminal główny |
| `getContacts` (export) | 372 | Lista kontaktów |
| `ensureDebugContacts` (export) | 377 | Debug: dodaje kontakty |
| `getCrew` (export) | 390 | Załoga |
| `getSelectedCrewMember` (export) | 395 | Wybrany operator |
| `setSelectedCrewMember` (export) | 411 | Ustawia operatora |
| `markRunStarted` (export) | 424 | Oznacza start runu |
| `resolveRunFailure` (export) | 441 | Obsługuje porażkę runu (notoryczność) |
| `resolveRunSuccess` (export) | 471 | Obsługuje sukces runu |
| `startRecruitmentMission` (export) | 485 | Start misji rekrutacyjnej |
| `rejectContact` (export) | 515 | Odrzuca kontakt |
| `hireContact` (export) | 527 | Zatrudnia kontakt |
| `processRunOutcome` (export) | 558 | Przetwarza wynik runu (sukces/porażka) |

## src/systems/runIntel.js (proceduralny wywiad)

Generuje deterministyczne pliki wywiadu (np. `nodes.txt`, `risk_model.csv`, `heat_trace.json`) dla hostów runów. Część treści jest prawdziwa, część fałszywa lub zniekształcona (zależnie od `disinfoIntensity`).

| Funkcja | Linia | Opis |
|---|---|---|
| `hashString` | 199 | Hash FNV-1a |
| `createRng` | 211 | Generator liczb (ziarno) |
| `pick` / `pickWeighted` | 220 / 228 | Losowanie z listy / z wagami |
| `clamp` | 250 | Ograniczenie wartości |
| `toSingleLine` | 254 | Spłaszcza tekst do jednej linii |
| `ensureIntelState` | 261 | Inicjalizuje stan wywiadu w hubie |
| `normalizeRunRecord` | 271 | Normalizuje rekord runu |
| `defaultIntelHost` | 332 | Domyślna nazwa hosta |
| `getDisinfoIntensity` | 340 | Poziom dezinformacji (z bezpieczeństwa i zagrożenia) |
| `deriveRunState` | 354 | Stan runu (typ, bezpieczeństwo, trace) |
| `pickTruthLevel` | 394 | Losuje prawdziwość: true / distorted / fake |
| `pickSource` | 447 | Losuje źródło informacji |
| `pickLengthMode` | 526 | Losuje długość wpisu |
| `pickTrigger` | 568 | Losuje wyzwalacz |
| `pickObservation` | 579 | Losuje obserwację |
| `pickImplication` | 603 | Losuje wniosek |
| `mutateForTruth` | 617 | Zniekształca wpis wg prawdziwości |
| `buildOperationalSentence` | 649 | Składa zdanie operacyjne |
| `renderEntryBySource` | 653 | Renderuje wpis wg źródła |
| `generateIntelEntry` | 746 | Generuje pojedynczy wpis |
| `generateIntelBatch` | 771 | Generuje partię wpisów |
| `buildRunBriefing` | 780 | Tworzy plik briefingu |
| `buildEntryNodesFile` | 800 | Tworzy plik węzłów wejściowych |
| `buildRiskModelCsv` | 820 | Tworzy plik CSV modelu ryzyka |
| `buildHeatTraceJson` | 833 | Tworzy plik JSON heat/trace |
| `makeIntelTree` | 856 | Buduje drzewo katalogów i plików runu |
| `ensureRunIntelForRun` (export) | 1004 | Zwraca lub tworzy wywiad dla runu |
| `getRunIntel` (export) | 1018 | Pobiera wywiad |
| `openRunIntelSession` (export) | 1027 | Otwiera sesję wywiadu |
| `splitPath` | 1039 | Dzieli ścieżkę |
| `normalizeIntelPath` (export) | 1044 | Normalizuje ścieżkę względem cwd |
| `listRunIntelDir` (export) | 1068 | `ls` w wywiadzie |
| `changeRunIntelDir` (export) | 1095 | `cd` w wywiadzie |
| `readRunIntelFile` (export) | 1104 | `cat` pliku wywiadu |
| `getRunIntelSummary` (export) | 1143 | Podsumowanie wywiadu |
| `setRunIntelMark` (export) | 1180 | Ustawia oznaczenie pliku |
| `getRunIntelMark` (export) | 1210 | Pobiera oznaczenie |
| `pruneRunIntelCache` (export) | 1224 | Czyści cache dla nieaktywnych runów |

## src/systems/dataFragments.js (tablica danych)

| Funkcja | Linia | Opis |
|---|---|---|
| `ensureDataFragmentState` (export) | 236 | Inicjalizuje stan fragmentów w hubie |
| `saveDataFragments` (export) | 264 | Zapis do `localStorage` (`gp_data_fragments`) |
| `loadDataFragments` (export) | 274 | Odczyt z `localStorage` |
| `maybeGrantDataFragment` (export) | 307 | Losowa nagroda: fragment danych |
| `getCollectedFragments` (export) | 341 | Zebrane fragmenty |
| `getFragmentById` (export) | 347 | Fragment po id |
| `getTotalFragmentCount` (export) | 351 | Liczba wszystkich fragmentów |
| `ensureDebugDataShards` (export) | 355 | Debug: dodaje shardy |
| `assignFragmentCategory` (export) | 378 | Przypisuje kategorię użytkownika |
| `setFragmentBoardPos` (export) | 384 | Zapisuje pozycję karty na tablicy |
| `setFragmentNote` (export) | 390 | Zapisuje notatkę |
| `addFragmentConnection` (export) | 400 | Dodaje połączenie między fragmentami |
| `removeFragmentConnection` (export) | 411 | Usuwa połączenie |
| `getConnectionsFor` (export) | 419 | Połączenia fragmentu |
| `getAllConnections` (export) | 424 | Wszystkie połączenia |
| `isProbabilityUnlocked` (export) | 445 | Czy odblokowany Metadata Scanner |
| `unlockProbability` (export) | 450 | Odblokowuje Metadata Scanner |
| `isFragmentMetadataScanned` (export) | 457 | Czy metadane skanowane |
| `scanFragmentMetadata` (export) | 462 | Skanuje metadane fragmentu |
| `isDecryptorUnlocked` (export) | 474 | Czy odblokowany Decryptor |
| `unlockDecryptor` (export) | 479 | Odblokowuje Decryptor |
| `isFragmentDecrypted` (export) | 485 | Czy fragment odszyfrowany |
| `decryptFragment` (export) | 490 | Odszyfrowuje fragment |
| `getCategoryColor` (export) | 515 | Kolor kategorii |
| `getProbabilityLabel` (export) | 523 | Etykieta prawdopodobieństwa (PRAWDOPODOBNE / NIEPRAWDOPODOBNE) |

## src/systems/tutorial.js

| Funkcja | Linia | Opis |
|---|---|---|
| `resetTutorialProgress` | 12 | Reset postępu |
| `startTutorialSession` (export) | 32 | Start tutorialu |
| `resetTutorialSession` (export) | 47 | Wyjście z tutorialu |
| `noteTutorialCommand` (export) | 60 | Rejestruje komendę w tutorialu |
| `noteTutorialScan` (export) | 76 | Rejestruje skan |
| `maybeLogTutorialRecovery` | 91 | Pokazuje podpowiedź po błędzie |
| `getTutorialRecoveryHint` | 108 | Treść podpowiedzi |
| `recordTutorialProgress` | 237 | Aktualizuje postęp kroku |
| `tickTutorial` (export) | 275 | Tick tutorialu (przejścia kroków) |
| `updateTutorialPanel` (export) | 381 | Odświeża panel tutorialu |
| `advanceTutorialStep` | 409 | Przejście do kroku |
| `completeTutorial` | 420 | Zakończenie tutorialu |
| `isMainTerminalUnlocked` | 429 | Czy terminal główny odblokowany (w tutorialu) |
| `getTutorialStepContent` | 437 | Treść kroku |

## src/systems/mission.js

| Funkcja | Linia | Opis |
|---|---|---|
| `updateMissionText` (export) | 8 | Tekst misji w HUD (faza 0/1/2, meta) |
| `getTutorialMissionText` | 36 | Tekst misji w tutorialu |
| `completeMainHack` (export) | 122 | Zakończenie hacka terminala głównego |
| `handleMainHackFailure` (export) | 154 | Porażka hacka |
| `win` (export) | 166 | Wygrana piętra/runu |
| `killPlayer` (export) | 240 | Śmierć gracza (`resolveRunFailure`) |
| `resetOverlays` (export) | 253 | Reset nakładek |
| `showSystemResetWarning` | 263 | Ostrzeżenie o resecie systemu |
| `resetSecuritySystems` | 272 | Reset alarmów i kamer |

## src/systems/audio.js

| Funkcja | Linia | Opis |
|---|---|---|
| `primeAudioSettings` (export) | 47 | Odczyt preferencji audio przed startem |
| `initAudio` (export) | 60 | Inicjalizacja odtwarzaczy |
| `updateAudio` (export) | 85 | Tick: wybór trybu muzyki |
| `stopAudio` (export) | 102 | Zatrzymuje muzykę |
| `resetAudio` (export) | 112 | Reset przy starcie runu |
| `toggleMusicEnabled` (export) | 121 | Przełącza muzykę |
| `setMusicEnabled` (export) | 125 | Ustawia muzykę |
| `setIntroAudioActive` (export) | 145 | Aktywuje intro |
| `createAudioPools` | 167 | Pule odtwarzaczy per tryb |
| `resolveTargetMode` | 182 | Wybór trybu (menu, ambient, compromised, terminal) |
| `transitionToMode` | 206 | Płynne przejście między trybami |
| `pickRandomTrack` | 272 | Losowy utwór z trybu |
| `playTrack` | 286 | Odtwarza utwór |
| `fadeTrack` | 293 | Fade głośności |
| `safeVolume` | 327 | Bezpieczna głośność |
| `stopAllTracks` | 335 | Zatrzymuje wszystkie utwory |
| `ensureIntroTrackEndHandler` | 353 | Obsługa końca intro |
| `resetIntroTrackLooping` | 371 | Reset pętli intro |
| `persistAudioPreference` | 381 | Zapis preferencji (`gp_audio_enabled`) |
| `readStoredAudioPreference` | 389 | Odczyt preferencji |
| `emitAudioState` | 405 | Wysyła zdarzenie `gp:audio-state` |
| `registerAudioBridge` | 413 | Nasłuchuje zdarzeń intro |

## src/systems/ui.js

| Funkcja | Linia | Opis |
|---|---|---|
| `playDecryptSfx` | 53 | Dźwięk deszyfrowania |
| `bindUI` (export) | 70 | Zbiera referencje DOM do `G.dom` |
| `clearLog` (export) | 165 | Czyści log |
| `syncMainHackLoading` (export) | 173 | Ekran ładowania hacka |
| `hideMainHackLoading` (export) | 180 | Ukrywa ekran ładowania |
| `refreshHUD` (export) | 194 | Odświeża HUD (HP, BW, alarm, kredyty) |
| `rebuildList` (export) | 242 | Buduje listę celów |
| `isTileKnown` | 322 | Czy kafel odkryty |
| `log` (export) | 326 | Dodaje wpis do logu |
| `floatMsg` (export) | 339 | Unoszący się komunikat nad postacią |
| `syncZoneLabel` (export) | 371 | Etykieta sektora i piętra |
| `getCanvasTopOffset` (export) | 375 | Offset canvasu |
| `refreshMusicToggle` (export) | 379 | Przycisk muzyki |
| `bindMusicToggleButton` | 388 | Podpina przycisk muzyki |
| `updateMusicButtonState` | 400 | Stan przycisku muzyki |
| `refreshQuickHackStock` | 411 | Stan zapasów quickhacków |
| `syncVignette` | 429 | Winieta przy alarmie |
| `showHackUpgradesPanel` / `hideHackUpgradesPanel` / `updateHackUpgradesPanel` | 437 / 445 / 450 (export) | Panel ulepszeń hacków |
| `renderHub` | 479 | Renderuje hub (plan, rekrutacja) |
| `renderRunBoard` | 501 | Tablica runów |
| `renderRecruitmentBoard` | 537 | Tablica kontaktów i załogi |
| `switchHubTab` (export) | 590 | Przełącza zakładkę huba |
| `selectRunUI` (export) | 596 | Wybór runu z UI |
| `startRecruitmentMissionUI` (export) | 606 | Start misji rekrutacyjnej z UI |
| `hireContactUI` (export) | 612 | Zatrudnienie z UI |
| `rejectContactUI` (export) | 618 | Odrzucenie z UI |
| `upgradeHackUI` (export) | 624 | Ulepszenie hacka z UI |
| `_idToSeed` / `_garbleText` / `_animateDecryptReveal` / `_animateMetadataReveal` | 641 / 652 / 658 / 706 | Efekty animacji tablicy danych |
| `renderDataBoard` (export) | 743 | Renderuje tablicę danych (`window.RENDER_DATA_BOARD`) |
| `_populateCategoryFilter` / `_renderFragmentList` / `_renderBoardCards` / `_createBoardCard` | 761 / 787 / 840 / 876 | Listy i karty fragmentów |
| `_ensureBoardDragListeners` | 957 | Przeciąganie kart |
| `_renderConnections` | 991 | Rysuje połączenia (SVG) |
| `_renderDetail` | 1052 | Szczegóły fragmentu |
| `_renderParanoia` / `_applyParanoiaTierToBoard` | 1307 / 1319 | Poziom paranoi |
| `_renderLullabyOverlay` / `_startLullabyMessages` | 1348 / 1370 | Overlay komunikatów (efekt paranoi) |
| `_renderCounter` / `_selectFragment` | 1395 / 1404 | Licznik i wybór fragmentu |

## src/systems/menuTerminal.js (terminal w menu startowym)

Moduł ~1900 linii. Obsługuje komendy: `help`, `runs`, `run`, `crew`, `contacts`, `loadout`, `market`, `buy`, `equip`, `upgrade`, `operator`, `df`, `ssh`, `ls`, `cd`, `cat`, `intel`, `status`, `whoami`, `history`, `clear`, `trace`, `ghost`, `mirror`, `listen`.

| Funkcja | Linia | Opis |
|---|---|---|
| `setWalletCredits` / `getWalletCredits` | 54 / 82 | Saldo kredytów w terminalu menu |
| `getEls` / `appendLine` / `sep` / `section` | 115 / 124 / 134 / 138 | Wyjście terminala menu |
| `delay` / `appendSeq` | 142 / 146 | Sekwencje animowanych linii |
| `normalizeToken` / `parseListIndex` / `resolveIdFromList` / `parseSlot` / `resolveOperatorId` | 155 / 159 / 165 / 178 / 186 | Parsowanie argumentów |
| `probLabel` / `formatQuickHackOwnedStatus` | 199 / 206 | Etykiety |
| `refreshStatusLine` / `syncMenuTerminalStatus` (export) | 218 / 1886 | Pasek statusu |
| `printBootBanner` | 238 | Baner startowy |
| `preambleConnect` / `preambleScan` / `preambleDecrypt` / `preambleRunStart` | 248 / 255 / 259 / 267 | Animacje wstępne |
| `pushHistory` | 276 | Historia komend |
| `commandOk` / `commandWarn` / `commandErr` | 284 / 288 / 292 | Wyjście kolorowane |
| `renderHelpCrew` / `renderHelpRuns` / `renderHelpMarketplace` / `renderHelpLoadout` / `renderHelpDf` | 296 / 303 / 312 / 326 / 334 | Sekcje pomocy |
| `cmdHelp` | 345 | `help <temat>` |
| `getIntelEnabledRuns` / `printIntelHostsList` / `cmdHosts` | 422 / 455 / 473 | Lista hostów wywiadu |
| `resolveRunByIdOrIndex` / `resolveRunByHost` / `getSshAutocompleteHosts` | 477 / 487 / 505 | Rozwiązywanie hostów |
| `formatLsTimestamp` / `formatLsEntryLine` / `getLsEntrySize` / `toLsBlocks` / `parseLsArgs` | 531 / 541 / 549 / 556 / 560 | Formatowanie `ls` |
| `getIntelPathSuggestions` / `resolveIntelShellAutocomplete` | 599 / 637 | Autouzupełnianie w shellu wywiadu |
| `getIntelRun` / `ensureIntelShellActive` | 691 / 699 | Stan shella wywiadu |
| `cmdIntel` / `cmdSsh` / `cmdLs` / `cmdCd` / `cmdPwd` / `cmdCat` / `cmdExit` | 708 / 798 / 828 / 876 / 899 / 907 / 939 | Komendy shella wywiadu |
| `cmdWhoami` / `cmdHistory` / `cmdClear` / `cmdStatus` | 950 / 958 / 968 / 973 | Komendy ogólne |
| `cmdRuns` / `cmdRun` | 986 / 1035 | Zarządzanie runami |
| `cmdCrew` / `cmdContacts` / `cmdOperator` | 1088 / 1111 / 1416 | Załoga i kontakty |
| `cmdLoadout` / `cmdMarket` / `cmdBuy` / `cmdEquip` / `cmdUpgrade` | 1126 / 1159 / 1251 / 1342 / 1395 | Loadout i sklep |
| `cmdDf` | 1440 | Fragmenty danych (`df list` itd.) |
| `cmdGhost` / `cmdOverride` / `cmdTrace` / `cmdMirror` / `cmdListen` | 1618 / 1626 / 1638 / 1648 / 1653 | Easter eggi i komendy specjalne |
| `resolveAutocomplete` | 1760 | Autouzupełnianie |
| `handleCommand` | 1790 | Główny dispatch komend |
| `bindInput` | 1819 | Podpina wejście |
| `initMenuTerminal` (export) | 1863 | Inicjalizacja z callbackami `onStateMutated` i `onRequestRunStart` |
| `focusMenuTerminalInput` (export) | 1880 | Fokus wejścia |
| `listMenuTerminalCatalog` (export) | 1890 | Katalog do innych widoków |

## src/systems/input.js / quickhacks.js — uwagi

- `input.js` eksportuje tylko `bindInput`.
- Nazwy w `quickhacks.js` opisano w tabeli powyżej.

---

## Wejścia i pliki pomocnicze (bez JS)

| Plik | Rola |
|---|---|
| `index.html` | Główna strona gry (canvas, HUD, menu, overlaye). Zawiera też wbudowany skrypt „NEXUS NODE” (fałszywy shell, `gp_recovery_terminal_state`). |
| `mvp.html` | Minimalna wersja (HUD + canvas), ładuje `src/main.js`. |
| `terminal.html` | Samodzielny ekran terminala „NEXUS NODE :: RECOVERY MODE”. |
| `network_breach.html` | Oznaczony jako DEPRECATED. |
| `mvp copy.html` | Kopia robocza `mvp.html` (do ustalenia, czy potrzebna). |
| `gp.html` | Pusty plik. |
| `styles/main.css` | Style całej gry. |
| `assets/` | Muzyka (`assets/music`), SFX (`assets/sfx`), grafika (`player.png`, `city_map.png`). |

## Uwagi do indeksu

- Brak testów, brak systemu budowania (moduły ES, serwowane statycznie).
- Pliki źródłowe są w UTF-8 (polskie znaki w tekstach UI i komunikatach).
- `src/systems/overlays.js`, `src/utils/helpers.js` są puste.
- `src/systems/terminalRuntime.js` i `src/systems/menuTerminal.js` to dwa różne terminale: realtime (w trakcie runu) i menu (między runami).
