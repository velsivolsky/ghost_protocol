# Indeks funkcji — Ghost Protocol

Stan: gałąź `main`, commit `d62fb56` (PR #2 „wskazowka_hasla” scalony). Zakres: deklaracje najwyższego poziomu (`function`, `class`, `const ... => `) w `src/`, plus funkcje skryptu wbudowanego w `index.html`. Funkcje zagnieżdżone i handlery inline pominięte.

Numery linii są zweryfikowane skryptem względem `d62fb56`. Po zmianach w kodzie trzeba je odświeżyć. Zmiany w `index.html` od `fd666f6` dotyczą tylko treści intro i szeptów (sekcja na końcu).

Legenda: **Eksport** = `export` z modułu.

## Mapa modułów

| Moduł | Rola | Importuje z |
|---|---|---|
| `src/core/balance.js` | Parametry balansu trace i breach | — |
| `src/core/constants.js` | Stałe: rozmiar kafla, mapy, typy kafli, dystanse | — |
| `src/core/game.js` | Orkiestracja: boot, menu startowe, start runu, pętla gry, tutorial | `core/constants.js`, `core/persistence.js`, `core/state.js`, `debug/debugBootstrap.js`, `entities/camera.js`, `entities/distraction.js`, `entities/drone.js`, `entities/guard.js`, `entities/technician.js`, `systems/audio.js`, `systems/dataFragments.js`, `systems/hacking.js`, `systems/input.js`, `systems/menuTerminal.js`, `systems/mission.js`, `systems/networkBreach.js`, `systems/quickhacks.js`, `systems/recruitment.js`, `systems/render.js`, `systems/renderWebGL.js`, `systems/runIntel.js`, `systems/terminalRuntime.js`, `systems/tutorial.js`, `systems/ui.js`, `systems/update.js`, `systems/visibility.js`, `world/generator.js` |
| `src/core/persistence.js` | Zapis/odczyt stanu huba (localStorage: gp_hub_state) | `core/state.js` |
| `src/core/state.js` | Globalny stan G, inicjalizacja fal i pięter, ulepszenia hacków | — |
| `src/debug/debugBootstrap.js` | Flagi debug (start z kredytami, kontaktami, shardami) | — |
| `src/entities/camera.js` | Kamera (stożek widzenia, stan wykrycia) | — |
| `src/entities/distraction.js` | Dystrakcja (szkic, pusta logika) | — |
| `src/entities/drone.js` | Dron (patrol, przejęcie) | `core/constants.js`, `core/state.js`, `systems/mission.js`, `systems/ui.js`, `utils/math.js` |
| `src/entities/guard.js` | Strażnik: patrol, stożek, wykrycie, alarm | `core/constants.js`, `core/state.js`, `systems/mission.js`, `systems/ui.js`, `utils/los.js`, `utils/math.js`, `world/map.js`, `world/pathing.js` |
| `src/entities/player.js` | Gracz: tworzenie encji | — |
| `src/entities/technician.js` | Technik: wezwanie do kamer, animacja, wykrywanie | `core/constants.js`, `core/state.js`, `systems/ui.js`, `utils/los.js`, `utils/math.js`, `world/map.js`, `world/pathing.js` |
| `src/main.js` | Punkt wejścia, wywołuje boot() | `core/game.js` |
| `src/systems/audio.js` | Muzyka (pule utworów, fade, intro), preferencje audio | `core/constants.js`, `core/state.js` |
| `src/systems/dataFragments.js` | Fragmenty danych: tablica, połączenia, dekrypcja, metadane | `core/state.js` |
| `src/systems/hacking.js` | Menu kontekstowe celów, hacki urządzeń (kamery, strażnicy, drony) | `core/constants.js`, `core/state.js`, `systems/mission.js`, `systems/quickhacks.js`, `systems/ui.js`, `utils/math.js` |
| `src/systems/input.js` | Obsługa klawiatury i myszy na canvasie, podpowiedzi hover | `core/constants.js`, `core/state.js`, `systems/hacking.js`, `systems/render.js`, `systems/terminalRuntime.js`, `systems/ui.js` |
| `src/systems/menuTerminal.js` | Terminal w menu startowym (help, runs, crew, market, ssh do intel) | `core/persistence.js`, `core/state.js`, `systems/dataFragments.js`, `systems/networkBreach.js`, `systems/quickhacks.js`, `systems/recruitment.js`, `systems/runIntel.js` |
| `src/systems/mission.js` | Fazy misji, wygrana/przegrana, tekst misji | `core/constants.js`, `core/state.js`, `systems/recruitment.js`, `systems/runIntel.js`, `systems/ui.js` |
| `src/systems/networkBreach.js` | Główna gra wieloetapowa (breach terminala głównego) | `core/state.js`, `systems/dataFragments.js`, `systems/mission.js`, `systems/recruitment.js`, `systems/traceSystem.js` |
| `src/systems/overlays.js` | Pusty plik (placeholder) | — |
| `src/systems/quickhacks.js` | Quickhacki: okno czasowe, sloty, sklep | `core/constants.js`, `core/state.js`, `systems/terminalRuntime.js`, `systems/ui.js`, `utils/math.js` |
| `src/systems/recruitment.js` | Hub: runy, kontakty, załoga (operatorzy), wyniki runów | `core/persistence.js`, `core/state.js`, `systems/runIntel.js` |
| `src/systems/render.js` | Rysowanie canvasu: kafle, mgła, stożki widzenia, urządzenia | `core/constants.js`, `systems/renderWebGL.js`, `utils/los.js` |
| `src/systems/renderWebGL.js` | Renderer WebGL raycast (atlasy tekstur, bufory kolumn) | — |
| `src/systems/runIntel.js` | Generator proceduralnych plików wywiadu (intel) per run | `core/state.js` |
| `src/systems/terminalCommands.js` | Rejestr komend terminala i koszty heat/bw | `core/state.js`, `systems/networkBreach.js` |
| `src/systems/terminalParser.js` | Parsowanie i autouzupełnianie komend | `systems/terminalCommands.js` |
| `src/systems/terminalRuntime.js` | Realtime terminal (overlay): komendy, cele, heat, podpowiedzi | `core/constants.js`, `core/state.js`, `systems/audio.js`, `systems/mission.js`, `systems/networkBreach.js`, `systems/quickhacks.js`, `systems/render.js`, `systems/terminalCommands.js`, `systems/terminalParser.js`, `systems/traceSystem.js`, `systems/tutorial.js`, `systems/ui.js`, `utils/math.js` |
| `src/systems/traceSystem.js` | System śladu (trace): wartość, progi, kontrmiary | `core/balance.js`, `core/state.js`, `systems/dataFragments.js`, `systems/recruitment.js`, `utils/math.js` |
| `src/systems/tutorial.js` | Kroki tutorialu i podpowiedzi naprawcze | `core/state.js`, `systems/mission.js`, `systems/terminalRuntime.js`, `systems/ui.js` |
| `src/systems/ui.js` | HUD, log, lista celów, panele huba, tablica danych | `core/constants.js`, `core/state.js`, `systems/audio.js`, `systems/dataFragments.js`, `systems/recruitment.js` |
| `src/systems/update.js` | Główna pętla logiki (update(dt)), ruch gracza, wykrycie, spawn | `core/constants.js`, `core/state.js`, `entities/camera.js`, `entities/distraction.js`, `entities/drone.js`, `entities/guard.js`, `entities/technician.js`, `systems/audio.js`, `systems/hacking.js`, `systems/mission.js`, `systems/networkBreach.js`, `systems/quickhacks.js`, `systems/recruitment.js`, `systems/terminalRuntime.js`, `systems/traceSystem.js`, `systems/tutorial.js`, `systems/ui.js`, `systems/visibility.js`, `utils/los.js`, `utils/math.js`, `world/map.js` |
| `src/systems/visibility.js` | Widoczność i mgła wojny (raycast) | `core/constants.js`, `core/state.js` |
| `src/utils/helpers.js` | Pusty plik (placeholder) | — |
| `src/utils/los.js` | Linia widzenia (line of sight) | — |
| `src/utils/math.js` | Helpery matematyczne (dst, clamp) | — |
| `src/world/floors/generator.js` | Szkic generatora pięter (placeholder) | — |
| `src/world/generator.js` | Generacja map wielopiętrowych, tutorialu, ścieżek, schodów | `core/constants.js`, `core/state.js` |
| `src/world/map.js` | Kolizje ruchu na mapie | `core/constants.js` |
| `src/world/pathing.js` | Pathfinding (następny krok) | `core/constants.js`, `world/map.js` |

## Funkcje per plik

### src/core/game.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `initWallAtlas` | 77 |  | Inicjalizuje atlas ścian |
| `initFloorAtlas` | 97 |  | Inicjalizuje atlas podłóg |
| `initGuardSprite` | 117 |  | Inicjalizuje sprite strażnika |
| `initTerminalSheet` | 137 |  | Inicjalizuje arkusz terminali |
| `initCeilingAtlas` | 157 |  | Inicjalizuje atlas sufitów |
| `initCamSprite` | 177 |  | Inicjalizuje sprite kamery |
| `initLightPanelSprite` | 197 |  | Inicjalizuje sprite panelu świetlnego |
| `initTechnicSprite` | 217 |  | Inicjalizuje sprite technika |
| `initLampSprite` | 237 |  | Inicjalizuje sprite lampy |
| `initVentSprite` | 257 |  | Inicjalizuje sprite wentylacji |
| `initDoorSprite` | 277 |  | Inicjalizuje sprite drzwi |
| `initElevatorSprite` | 297 |  | Inicjalizuje sprite windy |
| `initSafeVentSprite` | 317 |  | Inicjalizuje sprite bezpiecznej wentylacji |
| `initNeonPanelSprite` | 337 |  | Inicjalizuje sprite neonowego panelu |
| `playMainMenuClickSfx` | 357 |  | Odtwarza dźwięk kliknięcia w menu |
| `bindMainMenuClickSfx` | 374 |  | Podpina dźwięk kliknięcia do przycisków menu (raz) |
| `getGlobalWalletCredits` | 412 |  | Zwraca saldo kredytów z huba |
| `setGlobalWalletCredits` | 433 |  | Ustawia saldo kredytów w hubie (zaokrąglone, ≥0) |
| `applyDebugBootstrap` | 457 |  | Nadpisuje kredyty/kontakty/shardy wg `DEBUG_BOOTSTRAP` |
| `renderStartMenu` | 485 |  | Renderuje ekran startowy (operatorzy, runy, rynek) |
| `renderHackMarket` | 639 |  | Renderuje rynek quickhacków i akcji breach z slotami |
| `buyQuickHackFromMenu` | 763 |  | Kup quickhack z menu |
| `equipQuickHackFromMenu` | 777 |  | Załóż quickhack w slot loadoutu |
| `buyBreachActionFromMenu` | 789 |  | Kup akcję breach z menu |
| `equipBreachActionFromMenu` | 803 |  | Załóż akcję breach w slot |
| `buyMetadataScannerFromMenu` | 814 |  | Kup Metadata Scanner (koszt 2000) |
| `buyDecryptorFromMenu` | 834 |  | Kup Decryptor v1 (koszt 2500) |
| `getAllRunsForPlan` | 853 |  | Łączy aktywne runy i runy z kontaktów (rekrutacja) w jedną listę |
| `getRunDifficulty` | 886 |  | Etykieta trudności runu (recruit / hardcore / hard / …) |
| `renderPlanMapAndList` | 894 |  | Renderuje mapę i listę runów w zakładce plan |
| `getRunNetworkName` | 937 |  | Deterministyczna nazwa sieci hosta dla runu |
| `renderPlanRunDetail` | 944 |  | Szczegóły wybranego runu i przycisk infiltracji |
| `renderIntelHostPicker` | 997 |  | Lista hostów do wyboru w panelu wywiadu |
| `renderIntelPanel` | 1050 |  | Renderuje panel wywiadu (drzewo plików, nagłówek) |
| `renderIntelFile` | 1183 |  | Pokazuje zawartość wybranego pliku wywiadu |
| `bindIntelMarkButtons` | 1201 |  | Podpina przyciski oznaczeń (verified / suspicious / clear) |
| `updateIntelFileStatus` | 1232 |  | Aktualizuje status pliku (odczytany, plik/katalog) |
| `updateIntelMarkButtons` | 1258 |  | Podświetla aktywne oznaczenie pliku |
| `getIntelReadMap` | 1272 |  | Mapa przeczytanych plików runu |
| `getIntelMarkMap` | 1281 |  | Mapa oznaczeń użytkownika dla runu |
| `openIntelForRun` | 1290 |  | Otwiera panel wywiadu dla runu |
| `hashString` | 1307 |  | Hash FNV-1a (ziarno do generacji) |
| `pickFromSeed` | 1318 |  | Deterministyczny wybór elementu z listy po ziarnie |
| `buildOperatorPortrait` | 1322 |  | Generuje proceduralny portret operatora (SVG/canvas) |
| `switchStartMenuTab` | 1389 |  | Przełącza zakładkę menu (plan, recruit, market, terminal, instructions) |
| `hideMainMenu` | 1457 |  | Ukrywa menu główne |
| `showMainMenu` | 1466 |  | Pokazuje menu główne |
| `openMainMenuForRunSelection` | 1484 |  | Otwiera menu z wyborem runu (używane przez `RESTART`/`NEXT`) |
| `startTerminalStream` | 1493 |  | Animacja strumienia tekstu przy starcie runu |
| `startSelectedRun` | 1531 |  | Startuje wybrany run z planu |
| `startSelectedRunFromMap` | 1557 |  | Alias `startSelectedRun` dla widoku mapy |
| `startTutorialRun` | 1561 |  | Startuje mapę tutorialu |
| `createTutorialDevices` | 1623 |  | Tworzy urządzenia (kamery, strażnicy, drony) na mapie tutorialu |
| `boot` | 1668 | tak | Inicjalizacja gry: UI, stan huba, audio, terminale, pętla, menu |
| `startRun` | 1750 | tak | Buduje mapę pięter, spawnuje encje i resetuje stan dla nowego runu |
| `startLoop` | 1824 |  | Pętla `requestAnimationFrame`: `update` → `updateVisibility` → `render` |
| `updateAmbientBg` | 1852 |  | Włącza overlay tła przy wysokim alarmie (>85) |
| `resize` | 1862 |  | Dopasowuje rozmiar canvasu do okna |

### src/core/persistence.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `clone` | 5 |  | Bezpieczna kopia głęboka przez JSON |
| `saveHubState` | 13 | tak | Zapisuje hub do `localStorage` (`gp_hub_state`) |
| `loadHubState` | 43 | tak | Wczytuje hub z `localStorage` |

### src/core/state.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createTerminalRuntimeState` | 1 |  | Domyślny stan realtime terminala (heat, cele, kolejka) |
| `createTraceRuntimeState` | 68 |  | Domyślny stan trace (wartość, prędkości, maska) |
| `createTutorialState` | 85 |  | Domyślny stan tutorialu i postępu |
| `createRunWallTint` | 98 |  | Losowy odcień ścian dla runu |
| `initWaveState` | 336 | tak | Ustawia stan fali: gracz, załoga, loadout, piętra |
| `initFloorState` | 420 | tak | Ustawia stan konkretnego piętra (mapa, urządzenia, widoczność) |
| `byType` | 494 | tak | Filtruje `G.devices` po typie (`cam`, `guard`, `drone`, `tech`, …) |
| `upgradeHack` | 498 | tak | Ulepsza poziom quickhacka za koszt |

### src/entities/camera.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createCamera` | 1 | tak | Tworzy kamerę |

### src/entities/distraction.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createDistraction` | 1 | tak | Tworzy punkt odwracający uwagę |
| `tickDistraction` | 22 | tak | Tik dystrakcji (szkic, pusta logika) |

### src/entities/drone.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createDrone` | 7 | tak | Tworzy drona |
| `tickDrone` | 29 | tak | Tik drona |

### src/entities/guard.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `generatePatrolWaypoints` | 10 |  | Generuje punkty patrolu strażnika |
| `createGuard` | 40 | tak | Tworzy strażnika |
| `tickGuard` | 73 | tak | Tik strażnika (patrol, wykrycie, alarm) |
| `isPlayerHiddenFromGuard` | 254 |  | Czy gracz ukryty przed strażnikiem |
| `moveWithPath` | 262 |  | Ruch po ścieżce |
| `canOccupyNpc` | 304 |  | Czy NPC może stanąć na kaflu |

### src/entities/player.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createPlayer` | 1 | tak | Tworzy gracza |

### src/entities/technician.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createTechnician` | 23 | tak | Tworzy technika |
| `updateTechAnim` | 51 | tak | Aktualizuje animację technika |
| `getTechAnimState` | 79 |  | Stan animacji technika |
| `tickTechnician` | 100 | tak | Tik technika (wezwanie do kamer) |
| `moveToward` | 241 |  | Ruch technika w stronę celu |
| `canOccupyNpc` | 279 |  | Czy technik może stanąć na kaflu |
| `updateSpotting` | 293 |  | Wykrywanie gracza przez technika |
| `isPlayerHiddenFromTech` | 332 |  | Czy gracz ukryty przed technikiem |

### src/systems/audio.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `primeAudioSettings` | 65 | tak | Wczytuje ustawienia audio przy starcie |
| `getAudioMixSettings` | 81 | tak | Zwraca aktualne ustawienia miksu |
| `applyAudioMixSettings` | 89 | tak | Stosuje miks głośności do kanałów |
| `initAudio` | 112 | tak | Inicjalizuje system audio |
| `updateAudio` | 141 | tak | Aktualizuje muzykę i dźwięki w tiku |
| `stopAudio` | 158 | tak | Zatrzymuje całe audio |
| `resetAudio` | 170 | tak | Resetuje stan audio |
| `toggleMusicEnabled` | 179 | tak | Przełącza muzykę on/off |
| `setMusicEnabled` | 183 | tak | Ustawia muzykę on/off |
| `setIntroAudioActive` | 203 | tak | Ustawia aktywność muzyki intra |
| `createAudioPools` | 225 |  | Pule odtwarzaczy per tryb |
| `resolveTargetMode` | 240 |  | Wybór trybu (menu, ambient, compromised, terminal) |
| `transitionToMode` | 264 |  | Płynne przejście między trybami |
| `pickRandomTrack` | 330 |  | Losowy utwór z trybu |
| `playTrack` | 344 |  | Odtwarza utwór |
| `fadeTrack` | 351 |  | Fade głośności |
| `safeVolume` | 385 |  | Bezpieczna głośność |
| `clamp01` | 393 |  | Ogranicza wartość do zakresu 0–1 |
| `stopAllTracks` | 401 |  | Zatrzymuje wszystkie utwory |
| `ensureIntroTrackEndHandler` | 419 |  | Obsługa końca intro |
| `resetIntroTrackLooping` | 437 |  | Reset pętli intro |
| `persistAudioPreference` | 447 |  | Zapis preferencji (`gp_audio_enabled`) |
| `persistVolumeLevel` | 455 |  | Zapisuje poziom głośności |
| `readStoredAudioPreference` | 463 |  | Odczyt preferencji |
| `readStoredVolumeLevel` | 479 |  | Odczytuje zapisany poziom głośności |
| `emitAudioState` | 496 |  | Wysyła zdarzenie `gp:audio-state` |
| `registerAudioBridge` | 504 |  | Nasłuchuje zdarzeń intro |
| `tickFootsteps` | 527 | tak | Odtwarza kroki gracza i wrogów |
| `ensurePlayerFootsteps` | 617 |  | Tworzy kanał kroków gracza |
| `ensureEnemyFootstepChannel` | 630 |  | Tworzy kanał kroków wrogów |
| `createSpatialChannel` | 648 |  | Tworzy kanał dźwięku przestrzennego (panning, dystans) |
| `ensureSfxAudioContext` | 698 |  | Tworzy lub wznawia kontekst audio SFX |
| `applyChannelMix` | 714 |  | Stosuje głośność do kanału |
| `setLoopPlayback` | 731 |  | Ustawia zapętlenie odtwarzania |
| `stopAllFootsteps` | 751 |  | Zatrzymuje wszystkie kroki |
| `applyMusicDuck` | 765 |  | Obniża głośność muzyki (ducking) |
| `shortestAudiblePathTiles` | 779 |  | Ścieżka kafli do źródła dźwięku (propagacja) |
| `isSoundPassableTile` | 853 |  | Czy dźwięk przechodzi przez kafel |

### src/systems/dataFragments.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `ensureDataFragmentState` | 236 | tak | Inicjalizuje stan tablicy fragmentów |
| `saveDataFragments` | 264 | tak | Zapisuje fragmenty do localStorage |
| `loadDataFragments` | 274 | tak | Wczytuje fragmenty z localStorage |
| `maybeGrantDataFragment` | 307 | tak | Losowo przyznaje fragment po zebraniu |
| `getCollectedFragments` | 341 | tak | Lista zebranych fragmentów |
| `getFragmentById` | 347 | tak | Fragment po id |
| `getTotalFragmentCount` | 351 | tak | Liczba fragmentów |
| `ensureDebugDataShards` | 355 | tak | Dodaje fragmenty debug |
| `assignFragmentCategory` | 378 | tak | Przypisuje kategorię fragmentu |
| `setFragmentBoardPos` | 384 | tak | Ustawia pozycję fragmentu na tablicy |
| `setFragmentNote` | 390 | tak | Ustawia notatkę do fragmentu |
| `addFragmentConnection` | 400 | tak | Dodaje połączenie między fragmentami |
| `removeFragmentConnection` | 411 | tak | Usuwa połączenie między fragmentami |
| `getConnectionsFor` | 419 | tak | Połączenia danego fragmentu |
| `getAllConnections` | 424 | tak | Wszystkie połączenia na tablicy |
| `isProbabilityUnlocked` | 445 | tak | Czy odblokowano metadane prawdopodobieństwa |
| `unlockProbability` | 450 | tak | Odblokowuje prawdopodobieństwo |
| `isFragmentMetadataScanned` | 457 | tak | Czy metadane fragmentu są przeskanowane |
| `scanFragmentMetadata` | 462 | tak | Skanuje metadane fragmentu |
| `isDecryptorUnlocked` | 474 | tak | Czy odblokowano Decryptor |
| `unlockDecryptor` | 479 | tak | Odblokowuje Decryptor |
| `isFragmentDecrypted` | 485 | tak | Czy fragment odszyfrowany |
| `decryptFragment` | 490 | tak | Odszyfrowuje fragment |
| `getCategoryColor` | 515 | tak | Kolor kategorii fragmentu |
| `getProbabilityLabel` | 523 | tak | Etykieta prawdopodobieństwa |
| `getParanoiaPressure` | 543 | tak | Pasywny nacisk trace z fragmentów o wysokiej paranoi |

### src/systems/hacking.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `playHackSfx` | 24 |  | Dźwięk hacka |
| `closeCtx` | 45 | tak | Zamyka menu kontekstowe celu |
| `addCtxBtn` | 52 |  | Dodaje przycisk do menu kontekstowego |
| `addCtxSep` | 64 |  | Dodaje separator |
| `showCtx` | 70 | tak | Pokazuje menu kontekstowe celu |
| `handleCanvasClick` | 214 | tak | Obsługa kliknięcia na canvas (wybór celu) |
| `announceTerminalOverlayFlow` | 268 |  | Podpowiedź o przepływie w terminalu |
| `getTerminalFlowHint` | 281 |  | Tekst podpowiedzi dla typu celu |
| `hackCam` | 320 |  | Hack kamery (koszt BW 15) |
| `loopCam` | 339 |  | Pętla wideo kamery (BW 8) |
| `revealCamCone` | 366 |  | Pokazuje stożek kamery po hacku |
| `overloadGuard` | 384 | tak | Przeciąża strażnika |
| `blindGuard` | 398 |  | Oślepienie strażnika (BW 15) |
| `redirectGuard` | 419 |  | Przekierowanie strażnika (BW 10) |
| `hijackDrone` | 438 | tak | Przejmuje drona |
| `killDrone` | 453 |  | Zniszczenie drona (BW 20) |
| `hackSideTerm` | 467 |  | Hack terminala pobocznego (BW 20) |
| `renderTerminalOptions` | 490 |  | Opcje menu dla terminala |
| `buildTerminalOptions` | 525 |  | Buduje listę opcji terminala |
| `disableNearestCamera` | 620 |  | Wyłącza najbliższą kamerę |
| `redirectNearestGuard` | 638 |  | Przekierowuje najbliższego strażnika |
| `revealLocalMap` | 661 |  | Odsłania lokalną mapę piętra |
| `restoreBandwidth` | 672 |  | Przywraca BW |
| `extractCryptoCredits` | 681 |  | Wyciąga kredyty z terminala |
| `disableTechnicians` | 696 |  | Wyłącza techników (BW 12) |
| `eliminateTechnician` | 709 |  | Eliminuje technika (BW 8) |
| `disableNearestDrone` | 724 |  | Wyłącza najbliższego drona |
| `renderDoorControlMenu` | 742 |  | Menu sterowania drzwiami |
| `toggleDoor` | 787 |  | Otwiera/zamyka drzwi (BW 4) |
| `requestTechnician` | 798 |  | Wysyła technika do kamery |
| `blindSector` | 821 |  | Oślepia sektor (BW 5) |
| `falseAlarm` | 838 |  | Fałszywy alarm (BW 10) |
| `suppressAlert` | 861 |  | Tłumi alarm (BW 15) |
| `raiseCameraInteractionAlert` | 871 |  | Podnosi alarm przy interakcji z kamerą |

### src/systems/input.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `bindInput` | 15 | tak | Podpina klawiaturę i mysz |
| `interactWithNearestDoor` | 96 |  | Otwiera lub zamyka najbliższe drzwi |

### src/systems/menuTerminal.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `getWalletCredits` | 54 |  | Saldo kredytów (terminal menu) |
| `setWalletCredits` | 82 |  | Ustawia saldo kredytów (terminal menu) |
| `getEls` | 115 |  | Pobiera elementy DOM terminala |
| `appendLine` | 124 |  | Dopisuje linię do wyjścia terminala |
| `sep` | 134 |  | Separator w wyjściu |
| `section` | 138 |  | Nagłówek sekcji w wyjściu |
| `delay` | 142 |  | Pauza (animacja wyjścia) |
| `appendSeq` | 146 |  | Dopisuje sekwencję linii z opóźnieniem |
| `normalizeToken` | 155 |  | Normalizuje token komendy |
| `parseListIndex` | 159 |  | Parsuje indeks z listy |
| `resolveIdFromList` | 165 |  | Rozwiązuje id z listy po indeksie lub nazwie |
| `parseSlot` | 178 |  | Parsuje numer slotu |
| `resolveOperatorId` | 186 |  | Rozwiązuje id operatora |
| `probLabel` | 199 |  | Etykieta prawdopodobieństwa |
| `formatQuickHackOwnedStatus` | 206 |  | Status posiadania quickhacka |
| `refreshStatusLine` | 218 |  | Odświeża pasek statusu terminala |
| `printBootBanner` | 238 |  | Baner startowy |
| `preambleConnect` | 248 |  | Preambuła komendy connect |
| `preambleScan` | 255 |  | Preambuła komendy scan |
| `preambleDecrypt` | 259 |  | Preambuła komendy decrypt |
| `preambleRunStart` | 267 |  | Preambuła startu runu |
| `pushHistory` | 276 |  | Historia komend |
| `commandOk` | 284 |  | Wypisuje komunikat OK |
| `commandWarn` | 288 |  | Wypisuje ostrzeżenie |
| `commandErr` | 292 |  | Wypisuje błąd |
| `renderHelpCrew` | 296 |  | Pomoc: sekcja załogi |
| `renderHelpRuns` | 303 |  | Pomoc: sekcja runów |
| `renderHelpMarketplace` | 312 |  | Pomoc: sekcja rynku |
| `renderHelpLoadout` | 326 |  | Pomoc: sekcja loadoutu |
| `renderHelpDf` | 334 |  | Pomoc: sekcja tablicy danych |
| `cmdHelp` | 345 |  | `help <temat>` |
| `getIntelEnabledRuns` | 422 |  | Runy z dostępnym wywiadem |
| `printIntelHostsList` | 455 |  | Wypisuje listę hostów wywiadu |
| `cmdHosts` | 473 |  | Komenda hosts |
| `resolveRunByIdOrIndex` | 477 |  | Znajduje run po id lub indeksie |
| `resolveRunByHost` | 487 |  | Znajduje run po nazwie hosta |
| `getSshAutocompleteHosts` | 505 |  | Podpowiedzi hostów dla ssh |
| `formatLsTimestamp` | 531 |  | Formatuje znacznik czasu dla ls |
| `formatLsEntryLine` | 541 |  | Formatuje wiersz ls |
| `getLsEntrySize` | 549 |  | Rozmiar wpisu ls |
| `toLsBlocks` | 556 |  | Przelicza rozmiar na bloki ls |
| `parseLsArgs` | 560 |  | Parsuje argumenty ls |
| `getIntelPathSuggestions` | 599 |  | Podpowiedzi ścieżek w wywiadzie |
| `resolveIntelShellAutocomplete` | 637 |  | Autouzupełnianie w shellu wywiadu |
| `getIntelRun` | 691 |  | Run powiązany z sesją wywiadu |
| `ensureIntelShellActive` | 699 |  | Zapewnia aktywną sesję shella wywiadu |
| `cmdIntel` | 708 |  | Komenda intel |
| `cmdSsh` | 798 |  | Komenda ssh (wejście do wywiadu hosta) |
| `cmdLs` | 828 |  | Komenda ls w shellu wywiadu |
| `cmdCd` | 876 |  | Komenda cd w shellu wywiadu |
| `cmdPwd` | 899 |  | Komenda pwd |
| `cmdCat` | 907 |  | Komenda cat w shellu wywiadu |
| `cmdExit` | 939 |  | Komenda exit (wyjście z shella) |
| `cmdWhoami` | 950 |  | Komenda whoami |
| `cmdHistory` | 958 |  | Komenda history |
| `cmdClear` | 968 |  | Komenda clear |
| `cmdStatus` | 973 |  | Komenda status |
| `cmdRuns` | 986 |  | Komenda runs (lista runów) |
| `cmdRun` | 1035 |  | Komenda run (start runu) |
| `cmdCrew` | 1088 |  | Komenda crew (załoga) |
| `cmdContacts` | 1111 |  | Komenda contacts |
| `cmdLoadout` | 1126 |  | Komenda loadout |
| `cmdMarket` | 1159 |  | Komenda market |
| `cmdBuy` | 1251 |  | Komenda buy |
| `cmdEquip` | 1342 |  | Komenda equip |
| `cmdUpgrade` | 1395 |  | Komenda upgrade |
| `cmdOperator` | 1416 |  | Komenda operator |
| `cmdDf` | 1440 |  | Fragmenty danych (`df list` itd.) |
| `cmdGhost` | 1618 |  | Komenda ghost (ocena ghost) |
| `cmdOverride` | 1626 |  | Komenda override |
| `cmdTrace` | 1638 |  | Komenda trace |
| `cmdMirror` | 1648 |  | Komenda mirror |
| `cmdListen` | 1653 |  | Komenda listen (dźwięk) |
| `resolveAutocomplete` | 1760 |  | Autouzupełnianie |
| `handleCommand` | 1790 |  | Główny dispatch komend |
| `bindInput` | 1819 |  | Podpina wejście |
| `initMenuTerminal` | 1863 | tak | Inicjalizuje terminal w menu startowym |
| `focusMenuTerminalInput` | 1880 | tak | Ustawia fokus na polu terminala menu |
| `syncMenuTerminalStatus` | 1886 | tak | Synchronizuje status terminala menu |
| `listMenuTerminalCatalog` | 1890 | tak | Wypisuje katalog komend terminala menu |

### src/systems/mission.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `updateMissionText` | 7 | tak | Aktualizuje tekst misji |
| `getTutorialMissionText` | 35 |  | Tekst misji w tutorialu |
| `completeMainHack` | 121 | tak | Obsługuje udane zhakowanie terminala głównego |
| `handleMainHackFailure` | 149 | tak | Obsługuje porażkę hacku terminala głównego |
| `win` | 161 | tak | Wygrana runu: historia runu i kredyty |
| `killPlayer` | 251 | tak | Śmierć gracza (porażka runu) |
| `resetOverlays` | 264 | tak | Resetuje nakładki |
| `showSystemResetWarning` | 274 |  | Ostrzeżenie o resecie systemu |
| `resetSecuritySystems` | 283 |  | Reset alarmów i kamer |

### src/systems/networkBreach.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `ensureCatalogState` | 59 |  | Inicjalizuje katalog akcji breach |
| `createDefaultMainBreachState` | 79 |  | Domyślny stan breach |
| `ensureMainBreachState` | 128 |  | Gwarantuje istnienie stanu breach |
| `terminalState` | 135 |  | Skrót do `G.terminalRuntime` |
| `logBreachLine` | 139 |  | Log linii breach |
| `setTerminalContext` | 146 |  | Ustawia kontekst terminala |
| `setMainHackStep` | 153 |  | Ustawia krok hacka terminala głównego |
| `unlockedShardCount` | 160 |  | Liczba odzyskanych shardów |
| `getBreachActionDefinitions` | 168 | tak | Definicje akcji breach |
| `buyBreachAction` | 173 | tak | Kupno akcji breach |
| `equipBreachActionInSlot` | 192 | tak | Założenie akcji breach w slot |
| `initNetworkBreachBridge` | 215 | tak | Podpina mostek breach do terminala |
| `resetNetworkBreachState` | 219 | tak | Resetuje stan breach |
| `launchNetworkBreach` | 234 | tak | Startuje minigame breach |
| `handleUploadCreds` | 254 | tak | Komenda upload_creds (wgrywa dane logowania) |
| `handleBruteAuth` | 274 | tak | Komenda brute_auth |
| `activateICEBattle` | 297 |  | Aktywuje walkę z ICE |
| `handleUseBreachAction` | 335 | tak | Użycie akcji breach (use_breach) |
| `handleCoreFinisher` | 485 | tak | Komenda core (finalny hack) |
| `checkICEPhaseTransition` | 510 |  | Sprawdza przejście fazy ICE |
| `triggerICECounterattack` | 522 |  | Kontratak ICE |
| `prepareMainNodeFilesystem` | 587 |  | Buduje system plików węzła głównego |
| `resolveAbsPath` | 626 |  | Rozwiązuje ścieżkę bezwzględną w FS |
| `getFSNode` | 635 |  | Zwraca węzeł FS po ścieżce |
| `handleFilesystemLs` | 655 | tak | Komenda fs_ls |
| `handleFilesystemCd` | 678 | tak | Komenda fs_cd |
| `handleFilesystemCat` | 694 | tak | Komenda fs_cat |
| `handleFilesystemScp` | 738 | tak | Komenda fs_scp (kopiowanie plików) |
| `handleFilesystemTransferFunds` | 776 | tak | Komenda transfer_funds |
| `handleDisconnectExfil` | 789 | tak | Rozłączenie i ekstrakcja danych |
| `handleAbortBreach` | 859 | tak | Przerwanie breach |
| `tickNetworkBreach` | 886 | tak | Tik minigame breach |
| `failNetworkBreach` | 965 | tak | Porażka breach |
| `noteMainBreachShardAvailable` | 998 | tak | Oznacza dostępność shardu hasła |

### src/systems/quickhacks.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `grantQuickHack` | 71 | tak | Przyznaje quickhack |
| `getQuickHackDefinitions` | 84 | tak | Lista definicji quickhacków |
| `getQuickHackDefinition` | 88 | tak | Definicja quickhacka po id |
| `getEquippedQuickHackIds` | 92 | tak | Id założonych quickhacków |
| `buyQuickHackCatalogItem` | 102 | tak | Kupno quickhacka z katalogu |
| `equipQuickHackInSlot` | 125 | tak | Założenie quickhacka w slot |
| `startQuickHackWindow` | 155 | tak | Start okna czasowego quickhacka |
| `tickQuickHackWindow` | 171 | tak | Tik okna czasowego |
| `getTimeScale` | 194 | tak | Skala czasu w oknie (zwolnienie) |
| `resetQuickHackState` | 198 | tak | Resetuje stan quickhacków |
| `useQuickHack` | 212 | tak | Użycie quickhacka |
| `getQuickHackHeatCost` | 310 |  | Koszt heat (np. ddos = 24) |
| `triggerNeuralOverload` | 332 |  | Efekt neural: blackout 9 s |
| `resolveQuickHackTarget` | 367 |  | Wybór celu quickhacka |
| `bindQuickHackUIEvents` | 384 |  | Podpięcie zdarzeń UI |
| `showQuickHackUI` | 405 |  | Pokaż panel wyboru |
| `renderQuickHackTimer` | 421 |  | Pasek czasu okna |
| `renderQuickHackChoices` | 435 |  | Lista wyboru quickhacków |
| `hideQuickHackUI` | 472 |  | Ukryj panel |

### src/systems/recruitment.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `randInt` | 46 |  | Losowa liczba całkowita |
| `randFloat` | 50 |  | Losowa liczba zmiennoprzecinkowa |
| `pick` | 54 |  | Losuje element z tablicy |
| `createStarterCrewMember` | 58 |  | Startowy operator (tier skid / operator) |
| `ensureStarterCrew` | 73 |  | Gwarantuje startową załogę |
| `tierFromWave` | 83 |  | Tier kontaktu wg fali i notoryczności |
| `ensureHubState` | 94 | tak | Inicjalizuje stan huba |
| `createRunOffer` | 229 |  | Tworzy ofertę runu (typ, cel, zagrożenie, piętra, zysk) |
| `getCurrentRunOffer` | 261 | tak | Aktualna oferta runu |
| `getActiveRunOffers` | 266 | tak | Aktywne oferty runów |
| `setCurrentRunOffer` | 271 | tak | Ustawia ofertę runu |
| `autoSelectRunForWave` | 283 | tak | Auto-wybór runu dla fali |
| `rotateRunBoardAfterRun` | 296 | tak | Rotacja tablicy runów po runie |
| `createContact` | 312 |  | Tworzy kontakt (rekrutowalny operator) |
| `maybeGrantContactFromMainTerminal` | 357 | tak | Przyznaje kontakt z terminala głównego |
| `getContacts` | 374 | tak | Lista kontaktów |
| `ensureDebugContacts` | 379 | tak | Dodaje kontakty debug |
| `getCrew` | 392 | tak | Lista załogi |
| `getSelectedCrewMember` | 397 | tak | Wybrany operator |
| `setSelectedCrewMember` | 413 | tak | Ustawia wybranego operatora |
| `markRunStarted` | 426 | tak | Oznacza run jako rozpoczęty |
| `resolveRunFailure` | 443 | tak | Rozliczenie porażki runu |
| `resolveRunSuccess` | 473 | tak | Rozliczenie sukcesu runu |
| `startRecruitmentMission` | 487 | tak | Start misji rekrutacyjnej |
| `rejectContact` | 517 | tak | Odrzuca kontakt |
| `hireContact` | 529 | tak | Zatrudnia kontakt |
| `processRunOutcome` | 560 | tak | Przetwarza wynik runu |
| `getActiveOperatorBuffs` | 600 | tak | Aktywne bufory operatorów |

### src/systems/render.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `_normalizeWallQuality` | 186 |  | Normalizuje jakość renderu ścian |
| `_getWallAtlasTargetSize` | 193 |  | Docelowy rozmiar atlasu ścian |
| `_getWallPerfSettings` | 199 |  | Ustawienia wydajności ścian |
| `_getFloorPerfSettings` | 215 |  | Ustawienia wydajności podłóg |
| `cycleWallRenderQuality` | 244 | tak | Przełącza jakość renderu ścian |
| `setWallRenderQuality` | 252 | tak | Ustawia jakość renderu ścian |
| `isSolid` | 260 |  | Czy kafel jest bryłą (blokuje widok) |
| `worldToFloorScreen` | 276 |  | Przelicza punkt świata na ekran (podłoga) |
| `_raycastWallDistance` | 285 |  | Dystans raycasta do ściany |
| `_raycastWallDistanceToPoint` | 336 |  | Dystans raycasta do punktu |
| `_getLampLightingBoost` | 347 |  | Wzmocnienie oświetlenia od lamp |
| `_getDoorHash` | 365 |  | Hash drzwi (wariant tekstury) |
| `buildPanelMap` | 375 |  | Buduje mapę paneli ściennych |
| `initRenderer` | 390 | tak | Inicjalizuje renderer canvas 2D |
| `patchTileFlat` | 393 | tak | Łata kafel w płaskim buforze |
| `renderFrame` | 400 | tak | Rysuje klatkę (raycast, sufit, podłoga, ściany, sprite'y, HUD) |
| `_ensurePreparedWallAtlas` | 772 |  | Przygotowuje atlas ścian |
| `_wallVCrop` | 836 |  | Wycinek pionowy tekstury ściany |
| `_drawWallAtlasColumns` | 854 |  | Rysuje kolumny ścian z atlasu |
| `_drawElevatorSheetColumns` | 912 |  | Rysuje kolumny windy z arkusza |
| `_drawDoorSheetColumns` | 972 |  | Rysuje kolumny drzwi z arkusza |
| `_drawNeonSheetColumns` | 1028 |  | Rysuje kolumny neonów z arkusza |
| `_isTerminalWallTile` | 1103 |  | Czy kafel to ściana terminala |
| `_drawTerminalSheetColumns` | 1112 |  | Rysuje kolumny terminala z arkusza |
| `_isFloorRenderableTile` | 1170 |  | Czy kafel ma być rysowany jako podłoga |
| `_hashFloorVariant` | 1183 |  | Hash wariantu podłogi |
| `_ensureFloorAtlasPixels` | 1188 |  | Przygotowuje piksele atlasu podłóg |
| `_ensureCeilingAtlasPixels` | 1224 |  | Przygotowuje piksele atlasu sufitów |
| `_getCeilingTileIndex` | 1260 |  | Indeks kafla sufitu |
| `_drawCeilingTile` | 1265 |  | Rysuje kafel sufitu |
| `_projectCeilPt` | 1296 |  | Rzutuje punkt sufitu na ekran |
| `_projectWorldPt` | 1300 |  | Rzutuje punkt świata na ekran |
| `_drawTexTriangle` | 1310 |  | Rysuje teksturowany trójkąt |
| `_drawCeilingSpriteDevices` | 1331 |  | Rysuje urządzenia na suficie |
| `_ensureFloorCache` | 1564 |  | Cache podłogi |
| `_drawTexturedFloor` | 1591 |  | Rysuje teksturowaną podłogę |
| `_cleanupLightPulses` | 1705 |  | Usuwa wygasłe pulsy światła |
| `_lampPulseFactor` | 1710 |  | Współczynnik pulsu lampy |
| `_drawLightingOverlay` | 1752 |  | Rysuje nakładkę oświetlenia |
| `_drawCameraFOVCones` | 1851 |  | Rysuje stożki widzenia kamer |
| `_buildNeonWallMap` | 1969 |  | Buduje mapę neonowych ścian |
| `_drawWallTextures` | 1984 |  | Rysuje tekstury ścian |
| `_findTerminalByPos` | 2042 |  | Znajduje terminal po pozycji |
| `_getConsoleStateForTile` | 2052 |  | Stan konsoli dla kafla |
| `_leftFace` | 2078 |  | Lewa ściana kafla (kierunek) |
| `_rightFace` | 2082 |  | Prawa ściana kafla (kierunek) |
| `_oppositeFace` | 2086 |  | Przeciwna ściana kafla |
| `_faceOffset` | 2090 |  | Przesunięcie ściany kafla |
| `_tileAtFlat` | 2100 |  | Kafel z płaskiego bufora |
| `_isPassableAtFlat` | 2107 |  | Czy kafel z bufora jest przechodni |
| `_getTerminalFrontFace` | 2112 |  | Front terminala (ściana frontowa) |
| `_getConsoleFaceColumn` | 2147 |  | Kolumna ściany konsoli |
| `_getConsoleTileRect` | 2155 |  | Prostokąt konsoli w arkuszu |
| `_drawTerminalSheetTile` | 2165 |  | Rysuje kafel terminala z arkusza |
| `_texDoor` | 2194 |  | Tekstura drzwi (proceduralna) |
| `_texMainTerminal` | 2221 |  | Tekstura głównego terminala |
| `_texSideTerminal` | 2264 |  | Tekstura pobocznego terminala |
| `_texWallPanel` | 2295 |  | Tekstura panelu ściennego |
| `_drawSprites` | 2334 |  | Rysuje sprite'y encji |
| `_getGuardSpriteState` | 2427 |  | Stan animacji strażnika |
| `_getGuardSpriteRow` | 2434 |  | Wiersz arkusza strażnika |
| `_getGuardSpriteFrame` | 2452 |  | Klatka animacji strażnika |
| `_drawGuardSpriteSheet` | 2473 |  | Rysuje sprite strażnika |
| `_getTechnicianSpriteState` | 2521 |  | Stan animacji technika |
| `_getTechnicianSpriteRow` | 2528 |  | Wiersz arkusza technika |
| `_getTechnicianSpriteClip` | 2543 |  | Klip animacji technika |
| `_drawTechnicianSpriteSheet` | 2560 |  | Rysuje sprite technika |
| `_drawDevSprite` | 2611 |  | Rysuje sprite urządzenia |
| `_drawTileSprite` | 2641 |  | Rysuje sprite kafla |
| `_drawElevatorTileSprite` | 2701 |  | Rysuje sprite windy |
| `_drawSafeVentTileSprite` | 2758 |  | Rysuje sprite bezpiecznej wentylacji |
| `_drawHideSpotFogOverlay` | 2799 |  | Nakładka mgły w miejscu ukrycia |
| `_drawHideSpotVignette` | 2849 |  | Winieta miejsca ukrycia |
| `_spriteColour` | 2866 |  | Kolor sprite'a |
| `drawMinimap` | 2890 | tak | Rysuje minimapę |
| `_minimapLampInfluence` | 3035 |  | Wpływ lamp na minimapę |
| `_drawHUD` | 3057 |  | Rysuje HUD na canvasie |

### src/systems/renderWebGL.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `createShader` | 67 |  | Kompiluje shader WebGL |
| `createProgram` | 79 |  | Linkuje program WebGL |
| `ensureCanvas` | 401 |  | Tworzy lub aktualizuje canvas WebGL |
| `configureTexture` | 427 |  | Konfiguruje parametry tekstury |
| `uploadFallbackTexture` | 435 |  | Wgrywa teksturę zastępczą |
| `initWebGLRenderer` | 450 | tak | Inicjalizuje renderer WebGL |
| `resizeWebGLRenderer` | 569 | tak | Zmienia rozmiar renderera WebGL |
| `ensureColumnBuffers` | 581 |  | Tworzy bufory kolumn |
| `updateMapTexture` | 593 |  | Aktualizuje teksturę mapy |
| `updateWallAtlasTexture` | 621 |  | Aktualizuje atlas ścian |
| `updateFloorAtlasTexture` | 648 |  | Aktualizuje atlas podłóg |
| `updateCeilingAtlasTexture` | 678 |  | Aktualizuje atlas sufitów |
| `updateDecalAtlasTexture` | 708 |  | Aktualizuje atlas dekali |
| `renderRaycastWebGL` | 757 | tak | Rysuje scenę raycast przez WebGL |
| `clearWebGLRenderer` | 920 | tak | Czyści renderer WebGL |

### src/systems/runIntel.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `hashString` | 199 |  | Hash FNV-1a |
| `createRng` | 211 |  | Generator liczb (ziarno) |
| `pick` | 220 |  | Losuje element z tablicy |
| `pickWeighted` | 228 |  | Losuje element z wagami |
| `clamp` | 250 |  | Ograniczenie wartości |
| `toSingleLine` | 254 |  | Spłaszcza tekst do jednej linii |
| `ensureIntelState` | 261 |  | Inicjalizuje stan wywiadu w hubie |
| `normalizeRunRecord` | 271 |  | Normalizuje rekord runu |
| `defaultIntelHost` | 332 |  | Domyślna nazwa hosta |
| `getDisinfoIntensity` | 340 |  | Poziom dezinformacji (z bezpieczeństwa i zagrożenia) |
| `deriveRunState` | 354 |  | Stan runu (typ, bezpieczeństwo, trace) |
| `pickTruthLevel` | 394 |  | Losuje prawdziwość: true / distorted / fake |
| `pickSource` | 447 |  | Losuje źródło informacji |
| `pickLengthMode` | 526 |  | Losuje długość wpisu |
| `pickTrigger` | 568 |  | Losuje wyzwalacz |
| `pickObservation` | 579 |  | Losuje obserwację |
| `pickImplication` | 603 |  | Losuje wniosek |
| `mutateForTruth` | 617 |  | Zniekształca wpis wg prawdziwości |
| `buildOperationalSentence` | 649 |  | Składa zdanie operacyjne |
| `renderEntryBySource` | 653 |  | Renderuje wpis wg źródła |
| `generateIntelEntry` | 746 |  | Generuje pojedynczy wpis |
| `generateIntelBatch` | 771 |  | Generuje partię wpisów |
| `buildRunBriefing` | 780 |  | Tworzy plik briefingu |
| `buildEntryNodesFile` | 800 |  | Tworzy plik węzłów wejściowych |
| `buildRiskModelCsv` | 820 |  | Tworzy plik CSV modelu ryzyka |
| `buildHeatTraceJson` | 833 |  | Tworzy plik JSON heat/trace |
| `makeIntelTree` | 856 |  | Buduje drzewo katalogów i plików runu |
| `ensureRunIntelForRun` | 1004 | tak | Generuje wywiad dla runu (jeśli brak) |
| `getRunIntel` | 1018 | tak | Zwraca wywiad runu |
| `openRunIntelSession` | 1027 | tak | Otwiera sesję shella wywiadu |
| `splitPath` | 1039 |  | Dzieli ścieżkę |
| `normalizeIntelPath` | 1044 | tak | Normalizuje ścieżkę w wywiadzie |
| `listRunIntelDir` | 1068 | tak | Listuje katalog wywiadu |
| `changeRunIntelDir` | 1095 | tak | Zmienia katalog w wywiadzie |
| `readRunIntelFile` | 1104 | tak | Czyta plik wywiadu |
| `getRunIntelSummary` | 1143 | tak | Podsumowanie wywiadu |
| `setRunIntelMark` | 1180 | tak | Ustawia oznaczenie pliku (verified/suspicious/clear) |
| `getRunIntelMark` | 1210 | tak | Odczytuje oznaczenie pliku |
| `pruneRunIntelCache` | 1224 | tak | Czyści cache wywiadu |

### src/systems/terminalCommands.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `getCommandDef` | 641 | tak | Definicja komendy po id |
| `listCommandPhrases` | 645 | tak | Lista fraz komend (autouzupełnianie) |

### src/systems/terminalParser.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `normalizeInput` | 3 |  | Normalizuje tekst wejścia |
| `startsWithTokens` | 7 |  | Sprawdza prefiks tokenów |
| `parseTerminalCommand` | 21 | tak | Parsuje komendę terminala |
| `autocompleteTerminalCommand` | 65 | tak | Autouzupełnianie komend |

### src/systems/terminalRuntime.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `initTerminalRuntime` | 205 | tak | Inicjalizuje realtime terminal |
| `resetTerminalRuntime` | 235 | tak | Resetuje realtime terminal |
| `isTerminalOverlayOpen` | 282 | tak | Czy overlay terminala jest otwarty |
| `toggleTerminalOverlay` | 286 | tak | Przełącza overlay terminala |
| `closeTerminalOverlay` | 314 | tak | Zamyka overlay terminala |
| `autocompleteTerminalInput` | 330 | tak | Autouzupełnianie wejścia terminala |
| `executeTerminalInput` | 342 | tak | Wykonuje komendę z wejścia |
| `tickTerminalRuntime` | 371 | tak | Tik terminala (kolejka, cooldown, heat) |
| `tickTerminalScriptQueue` | 408 |  | Wykonuje kolejne linie skryptu |
| `queueTerminalScript` | 422 |  | Dodaje skrypt do kolejki |
| `noteMainHackChannelProgress` | 439 | tak | Postęp kanału hacku terminala głównego |
| `syncTerminalOverlay` | 467 | tak | Synchronizuje widok overlaya |
| `queueTerminalCommand` | 537 |  | Kolejkuje komendę (blokada przy cooldownie) |
| `resolveCommandExecution` | 641 |  | Wykonuje komendę po opóźnieniu i ewentualnym scramblu |
| `resolveTargetAlias` | 1064 |  | Rozwiązuje alias celu (`cam_0`, `#1`, …) |
| `runConnect` | 1089 |  | `connect <cel>` — połączenie z celem |
| `runDisconnect` | 1140 |  | `disconnect` |
| `runScanLocal` | 1159 |  | `scan local` |
| `runScanNetwork` | 1186 |  | `scan network` |
| `runDownloadMap` | 1201 |  | `download map` na terminalu pobocznym |
| `runDownloadHack` | 1218 |  | `download hack` |
| `runTransferCredits` | 1232 |  | `transfer credits` |
| `runDumpCreds` | 1248 |  | `dump creds` |
| `runBreachFirewall` | 1296 |  | `breach firewall` |
| `requireSideTerminalTarget` | 1319 |  | Walidacja, że cel to terminal poboczny |
| `markSideTerminalConsumed` | 1352 |  | Oznacza terminal jako wykorzystany |
| `runInject` | 1363 |  | `inject` (wstrzyknięcie payloadu) |
| `runScp` | 1399 |  | `scp` (kopiowanie danych) |
| `runSource` | 1428 |  | `source` (wczytanie skryptu) |
| `runFeedBlind` | 1470 |  | `feed blind` na kamerze |
| `runFeedLoop` | 1482 |  | `feed loop` na kamerze |
| `runFeedShowCone` | 1498 |  | Komenda feed_show_cone |
| `runElevatorUnlock` | 1509 |  | `elevator unlock` |
| `runElevatorMove` | 1513 |  | Ruch windy (up/down) |
| `runBreach` | 1529 |  | `breach <cel>` |
| `runDeploy` | 1565 |  | `deploy worm` |
| `runOverride` | 1601 |  | `override` |
| `runSetFriendly` | 1625 |  | `set friendly` |
| `runUnlock` | 1648 |  | `unlock` (drzwi, winda) |
| `runOpen` | 1685 |  | Komenda open (drzwi) |
| `runClose` | 1689 |  | Komenda close (drzwi) |
| `runDoorState` | 1693 |  | Stan drzwi |
| `runReroute` | 1727 |  | `reroute` |
| `runDisable` | 1738 |  | `disable` |
| `runDistractionCommand` | 1758 |  | Komendy dystrakcji (`lights cut`, `junction overload`) |
| `registerTimedHack` | 1869 |  | Rejestruje hack z czasem trwania |
| `resolveConnectedTarget` | 1878 |  | Aktualnie połączony cel |
| `findTargetById` | 1886 |  | Znajdź cel po id |
| `enumerateHackTargets` | 1892 |  | Lista celów (lokalnych lub całej sieci) |
| `getElevatorTargets` | 2011 |  | Piętra dostępne windą |
| `pushTarget` | 2041 |  | Dodaje cel do listy z limitem odległości |
| `handleTerminalInputKeyDown` | 2048 |  | Obsługa klawiszy w wejściu terminala |
| `isGameOptionsMenuOpen` | 2130 |  | Czy menu opcji jest otwarte |
| `runGameOptions` | 2134 |  | Otwiera menu opcji w terminalu |
| `runGameOptionsSave` | 2151 |  | Zapisuje opcje |
| `runGameOptionsCancel` | 2176 |  | Anuluje zmiany opcji |
| `moveGameOptionsSelection` | 2186 |  | Przesuwa zaznaczenie w opcjach |
| `adjustGameOptionsSelection` | 2197 |  | Zmienia wartość zaznaczonej opcji |
| `toggleGameOptionsSelection` | 2220 |  | Przełącza zaznaczoną opcję |
| `renderGameOptionsPanel` | 2232 |  | Renderuje panel opcji |
| `selectionMark` | 2268 |  | Znacznik zaznaczenia w panelu |
| `toVolumeStep` | 2272 |  | Przelicza głośność na krok suwaka |
| `clampVolumeStep` | 2276 |  | Ogranicza krok suwaka |
| `formatVolumeSlider` | 2280 |  | Formatuje suwak głośności |
| `normalizeRenderQualitySetting` | 2285 |  | Normalizuje ustawienie jakości renderu |
| `mapRenderQualityToInternal` | 2292 |  | Mapuje jakość renderu na wartość wewnętrzną |
| `runHelp` | 2299 |  | `help [temat]` |
| `runTutorial` | 2433 |  | `tutorial` — instrukcja terminala |
| `runClear` | 2465 |  | `clear` |
| `emitTutorialIntro` | 2482 |  | Wiadomość powitalna terminala |
| `pushConnectedHelp` | 2488 |  | Pomoc dla połączonego celu |
| `pushConnectedCommandHint` | 2529 |  | Podpowiedź komend dla celu |
| `updateScanHighlights` | 2564 |  | Aktualizuje podświetlenia skanu |
| `syncTerminalHints` | 2577 |  | Podpowiedź wpisywanego tekstu |
| `autocompleteInputValue` | 2590 |  | Logika autouzupełniania |
| `autocompleteCommandByToken` | 2649 |  | Autouzupełnianie komendy po tokenach |
| `getAutocompletePhraseTokens` | 2710 |  | Lista fraz do autouzupełniania |
| `getAutocompleteTargetIds` | 2726 |  | Lista id celów do autouzupełniania |
| `parseConnectInlineChain` | 2731 |  | Parsuje łańcuch `connect ... -> akcja` |
| `normalizeInlineSegment` | 2783 |  | Normalizuje segment łańcucha |
| `resolveCameraInlineAction` | 2804 |  | Akcja kamery w łańcuchu |
| `resolveInlineActionFromTail` | 2824 |  | Akcja z końcówki łańcucha |
| `getTerminalPrompt` | 2841 |  | Prompt terminala (zależny od celu) |
| `findNearbyStair` | 2851 |  | Najbliższe schody |
| `dispatchTechnicianToCamera` | 2875 |  | Wysyła technika do kamery |
| `longestCommonPrefix` | 2895 |  | Wspólny prefiks (autouzupełnianie) |
| `pushTerminalLine` | 2917 |  | Dodaje linię do wyjścia terminala |
| `syncTerminalOutputDom` | 2936 |  | Renderuje wyjście do DOM |
| `formatScanLine` | 2995 |  | Formatuje linię wyniku skanu |
| `getScanLineClass` | 3009 |  | Klasa CSS linii skanu |
| `isMainTerminalAccessUnlocked` | 3021 |  | Czy terminal główny jest odblokowany |
| `getMainAuthProgress` | 3025 |  | Postęp zbierania shardów hasła |
| `getRecoveredShardsOrdered` | 3031 |  | Odzyskane shardy w kolejności |
| `clearMovementKeys` | 3039 |  | Czyści klawisze ruchu przy otwarciu terminala |
| `escapeHtml` | 3054 |  | Escape HTML |
| `addTerminalHeat` | 3063 | tak | Dodaje heat terminala |
| `getTerminalHeatPenaltyMs` | 3091 | tak | Kara czasowa za heat |
| `getCommandHeatCost` | 3105 |  | Koszt heat komendy |
| `getCommandBwCost` | 3109 |  | Koszt BW komendy |
| `getTerminalHeatStateLabel` | 3113 |  | Etykieta stanu heat (NORMAL / OVERHEAT / …) |
| `updateTerminalHeatState` | 3128 |  | Aktualizacja heat (decay, overheat, crash) |
| `runAutoConnectGuard` | 3171 |  | Automatyczne połączenie ze strażnikiem |
| `ensureTerminalDirectives` | 3188 |  | Inicjalizacja dyrektyw systemowych |
| `emitTerminalDirectiveBootLine` | 3244 |  | Linia startowa dyrektyw |
| `pushCommandTelemetryLine` | 3269 |  | Telemetria po komendzie |
| `trackMetaObjectiveProgress` | 3289 |  | Postęp celu meta |
| `applyAICounterreaction` | 3327 |  | Reakcja AI systemu na komendy (kontrmiary) |
| `runQuickHackOnTarget` | 3406 |  | Quickhack wykonany z terminala |
| `openDetectionTerminal` | 3469 | tak | Otwiera terminal detekcji |
| `closeDetectionTerminal` | 3516 | tak | Zamyka terminal detekcji |
| `listRewards` | 3533 |  | Lista nagród (`rewards/`) |

### src/systems/traceSystem.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `addTrace` | 7 | tak | Dodaje wartość trace |
| `softenTrace` | 22 | tak | Zmniejsza trace (kontrmiara) |
| `activateTraceMask` | 30 | tak | Aktywuje maskę trace |
| `activateGhostWindow` | 38 | tak | Aktywuje okno ghost (ochrona przed trace) |
| `tickTraceSystem` | 46 | tak | Tik systemu trace |
| `applyCountermeasureTier` | 113 |  | Stosuje kontrmiarę dla danego progu (1–4) |

### src/systems/tutorial.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `resetTutorialProgress` | 12 |  | Reset postępu |
| `startTutorialSession` | 32 | tak | Start sesji tutorialu |
| `resetTutorialSession` | 47 | tak | Reset sesji tutorialu |
| `noteTutorialCommand` | 60 | tak | Odnotowuje komendę w tutorialu |
| `noteTutorialScan` | 76 | tak | Odnotowuje skan w tutorialu |
| `maybeLogTutorialRecovery` | 91 |  | Pokazuje podpowiedź po błędzie |
| `getTutorialRecoveryHint` | 108 |  | Treść podpowiedzi |
| `recordTutorialProgress` | 234 |  | Aktualizuje postęp kroku |
| `tickTutorial` | 272 | tak | Tik tutorialu (kroki i podpowiedzi) |
| `updateTutorialPanel` | 377 | tak | Aktualizuje panel tutorialu |
| `advanceTutorialStep` | 405 |  | Przejście do kroku |
| `completeTutorial` | 416 |  | Zakończenie tutorialu |
| `isMainTerminalUnlocked` | 425 |  | Czy terminal główny odblokowany (w tutorialu) |
| `getTutorialStepContent` | 433 |  | Treść kroku |

### src/systems/ui.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `playDecryptSfx` | 53 |  | Dźwięk deszyfrowania |
| `bindUI` | 70 | tak | Podpina przyciski i elementy UI |
| `clearLog` | 166 | tak | Czyści log HUD |
| `syncMainHackLoading` | 174 | tak | Synchronizuje pasek ładowania hacku głównego |
| `hideMainHackLoading` | 181 | tak | Ukrywa pasek ładowania hacku głównego |
| `_asciiBar` | 195 |  | Rysuje pasek ASCII |
| `refreshHUD` | 201 | tak | Odświeża HUD |
| `rebuildList` | 255 | tak | Przebudowuje listę celów |
| `isTileKnown` | 339 |  | Czy kafel odkryty |
| `log` | 343 | tak | Dopisuje wpis do logu |
| `floatMsg` | 356 | tak | Pływający komunikat nad postacią |
| `syncZoneLabel` | 388 | tak | Synchronizuje etykietę strefy |
| `getCanvasTopOffset` | 392 | tak | Przesunięcie canvasu od góry |
| `refreshMusicToggle` | 396 | tak | Odświeża przełącznik muzyki |
| `bindMusicToggleButton` | 405 |  | Podpina przycisk muzyki |
| `updateMusicButtonState` | 417 |  | Stan przycisku muzyki |
| `_getMaxGuardTimer` | 428 |  | Maksymalny czas alarmu strażnika |
| `refreshQuickHackStock` | 435 |  | Stan zapasów quickhacków |
| `syncVignette` | 464 |  | Winieta przy alarmie |
| `showHackUpgradesPanel` | 472 | tak | Pokazuje panel ulepszeń hacków |
| `hideHackUpgradesPanel` | 480 | tak | Ukrywa panel ulepszeń hacków |
| `updateHackUpgradesPanel` | 485 | tak | Aktualizuje panel ulepszeń hacków |
| `renderHub` | 514 |  | Renderuje hub (plan, rekrutacja) |
| `renderRunBoard` | 537 |  | Tablica runów |
| `renderRecruitmentBoard` | 573 |  | Tablica kontaktów i załogi |
| `renderRunHistory` | 626 |  | Renderuje historię runów |
| `switchHubTab` | 647 | tak | Przełącza zakładkę huba |
| `selectRunUI` | 653 | tak | Wybiera run w UI |
| `startRecruitmentMissionUI` | 663 | tak | Start misji rekrutacyjnej z UI |
| `hireContactUI` | 669 | tak | Zatrudnia kontakt z UI |
| `rejectContactUI` | 675 | tak | Odrzuca kontakt z UI |
| `upgradeHackUI` | 681 | tak | Ulepsza hack z UI |
| `_idToSeed` | 698 |  | Zamienia id na ziarno |
| `_garbleText` | 704 |  | Zniekształca tekst (efekt szyfrowania) |
| `_animateDecryptReveal` | 715 |  | Animacja odszyfrowania fragmentu |
| `_animateMetadataReveal` | 763 |  | Animacja odsłonięcia metadanych |
| `renderDataBoard` | 800 | tak | Renderuje tablicę danych |
| `_populateCategoryFilter` | 818 |  | Wypełnia filtr kategorii |
| `_renderFragmentList` | 844 |  | Renderuje listę fragmentów |
| `_renderBoardCards` | 897 |  | Renderuje karty tablicy |
| `_createBoardCard` | 933 |  | Tworzy kartę fragmentu |
| `_ensureBoardDragListeners` | 1014 |  | Przeciąganie kart |
| `_renderConnections` | 1048 |  | Rysuje połączenia (SVG) |
| `_renderDetail` | 1109 |  | Szczegóły fragmentu |
| `_renderParanoia` | 1364 |  | Renderuje wskaźnik paranoi |
| `_applyParanoiaTierToBoard` | 1376 |  | Stosuje poziom paranoi do tablicy |
| `_renderLullabyOverlay` | 1405 |  | Renderuje nakładkę kołysanki |
| `_startLullabyMessages` | 1427 |  | Start komunikatów kołysanki |
| `_renderCounter` | 1452 |  | Renderuje licznik |
| `_selectFragment` | 1461 |  | Zaznacza fragment na tablicy |

### src/systems/update.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `spawnEntities` | 31 | tak | Spawnuje encje na piętrze |
| `getSpawnRooms` | 73 |  | Wybiera pokoje spawnu (bez wejścia) |
| `update` | 93 | tak | Główna pętla logiki (tik) |
| `checkDeadGuardDiscovery` | 261 |  | Wykrycie martwego strażnika przez innych |
| `canWatcherSeeBody` | 281 |  | Czy strażnik widzi ciało |
| `canCameraSeeBody` | 302 |  | Czy kamera widzi ciało |
| `updatePlayerMovement` | 333 |  | Ruch gracza z WASD (z kolizjami) |
| `canOccupy` | 394 |  | Czy gracz zmieści się na danej pozycji |
| `collidesWithWallBuffer` | 425 |  | Kolizja z buforem ściany |
| `collidesWithClosedDoor` | 453 |  | Kolizja z zamkniętymi drzwiami |
| `checkExfiltration` | 482 |  | Sprawdza ekstrakcję przy wejściu (faza 2) |
| `checkStairTransition` | 511 |  | Przejście schodami między piętrami |
| `findEntryTile` | 566 |  | Pozycja wejścia na piętro |
| `resolveSafeSpawnPoint` | 586 |  | Bezpieczny punkt startowy na piętrze |
| `isSpawnPointSafe` | 602 |  | Czy punkt nie koliduje z przeszkodami |
| `findNearestSafeSpawnTile` | 610 |  | Najbliższy bezpieczny kafel |
| `updateCameras` | 636 |  | Aktualizacja widzenia kamer i alarmów |
| `triggerGuardInvestigation` | 678 |  | Wysłanie strażnika na miejsce gracza |
| `triggerGuardInvestigationAt` | 682 | tak | Wysłanie strażnika na współrzędne |
| `isPlayerHiddenFrom` | 708 |  | Czy gracz jest ukryty przed obserwatorem |

### src/systems/visibility.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `updateVisibility` | 4 | tak | Aktualizuje widoczność i mgłę wojny |
| `castRay` | 32 |  | Promień widoczności (raycast) |
| `markVisibleTile` | 61 |  | Oznacza kafel jako widoczny |

### src/utils/los.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `lineOfSight` | 1 | tak | Linia widzenia między dwoma punktami |

### src/utils/math.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `dst` | 1 | tak | Odległość euklidesowa |
| `clamp` | 5 | tak | Ogranicza wartość do przedziału |

### src/world/floors/generator.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `generateFloors` | 4 |  | Szkic generatora pięter (placeholder) |
| `generateSingleFloor` | 19 |  | Szkic generacji pojedynczego piętra (placeholder) |

### src/world/generator.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `generateMultiFloorMap` | 5 | tak | Generuje mapę wielopiętrową dla runu |
| `generateMap` | 67 | tak | Generuje mapę jednego piętra (pokoje, korytarze, urządzenia) |
| `generateTutorialMap` | 338 | tak | Buduje mapę tutorialu |
| `placeCeilingLamps` | 592 |  | Rozmieszcza lampy sufitowe |
| `assignRunAccessPlan` | 650 |  | Przydziela plan dostępu (wejścia, terminale, shardy) dla runu |
| `generatePassphrase` | 700 |  | Generuje hasło terminala głównego |
| `splitPassphrase` | 707 |  | Dzieli hasło na shardy do terminali pobocznych |
| `makeNetworkName` | 720 |  | Tworzy nazwę sieci hosta |
| `pick` | 727 |  | Losuje element z tablicy (helper) |
| `buildWallVariants` | 731 |  | Buduje warianty ścian dla renderera |
| `placeDebugMainTerminal` | 737 |  | Stawia główny terminal w trybie debug |
| `addPillarsInLargeRooms` | 761 |  | Dodaje filary w dużych pokojach |
| `addCorporatePartitions` | 797 |  | Dodaje przegrody biurowe |
| `paintPartitionLine` | 851 |  | Maluje linię przegrody na mapie |
| `canPlaceRoom` | 894 |  | Sprawdza, czy pokój mieści się na mapie |
| `pickRoomProfile` | 910 |  | Losuje profil pokoju |
| `addDistractionNodes` | 924 |  | Dodaje punkty odwracające uwagę |
| `ensureCriticalPaths` | 1003 |  | Zapewnia ścieżki krytyczne między punktami |
| `findAdjacentWallTile` | 1020 |  | Szuka sąsiedniej ściany dla kafla |
| `hasPath` | 1047 |  | Sprawdza istnienie ścieżki między punktami (BFS) |
| `carveRoute` | 1099 |  | Wykopuje trasę korytarza |
| `placeStairTile` | 1118 |  | Stawia kafel schodów |
| `isValidStairPlacement` | 1153 |  | Sprawdza poprawność miejsca schodów |

### src/world/map.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `canWalk` | 3 | tak | Sprawdza, czy kafel jest przechodni |

### src/world/pathing.js

| Funkcja | Linia | Eksport | Opis |
|---|---|---|---|
| `findNextStep` | 4 | tak | Zwraca następny krok ścieżki (pathfinding) |

## Skrypt wbudowany w `index.html` (tryb „NEXUS NODE”)

Osobny, samodzielny terminal intro w `index.html` (od linii ~1044). Nie jest modułem ES. Zawiera wirtualny system plików (`FS`, `FILES`), wskazówki hasła, szepty i efekty niepokoju.

| Funkcja | Linia | Opis |
|---|---|---|
| `readPersisted` | 1244 | Odczyt stanu terminala z localStorage (klucz `gp_recovery_terminal_state`) |
| `savePersisted` | 1253 | Zapis stanu terminala do localStorage |
| `t` | 1289 | Tłumaczenie tekstu wg aktualnego języka |
| `addPasswordFailureHint` | 1293 | Dodaje podpowiedź po nieudanym haśle |
| `syncAudioButton` | 1304 | Synchronizuje przycisk audio z ustawieniem |
| `emitIntroAudioStart` | 1314 | Zdarzenie `gp:intro-audio-start` (start muzyki intro) |
| `emitIntroAudioStop` | 1318 | Zdarzenie zatrzymania muzyki intro |
| `emitAudioRequestState` | 1322 | Prosi silnik audio o stan |
| `emitSetAudioEnabled` | 1326 | Ustawia audio przez zdarzenie |
| `trackTimer` | 1332 | Rejestruje timer do późniejszego czyszczenia |
| `clearTrackedTimers` | 1336 | Czyści wszystkie zarejestrowane timery |
| `canTriggerBlackout` | 1341 | Czy można wywołać efekt blackout |
| `glitchify` | 1351 | Zniekształca tekst (efekt glitch) |
| `showThreatBanner` | 1363 | Pokazuje baner zagrożenia |
| `scrambleRandomLine` | 1371 | Losowo psuje jedną linię na ekranie |
| `anxietyPulse` | 1384 | Pojedynczy impuls efektu niepokoju |
| `scheduleAnxietyPulse` | 1424 | Planuje kolejny impuls niepokoju |
| `startAnxietyGlitches` | 1434 | Uruchamia efekty niepokoju |
| `stopAnxietyGlitches` | 1448 | Zatrzymuje efekty niepokoju |
| `addLine` | 1468 | Dodaje linię do wyjścia terminala |
| `addTransientLine` | 1477 | Dodaje tymczasową linię (znika po TTL) |
| `normalizePath` | 1486 | Normalizuje ścieżkę w wirtualnym FS |
| `updatePrompt` | 1507 | Odświeża prompt terminala |
| `applyLanguage` | 1511 | Stosuje wybrany język interfejsu |
| `listDir` | 1517 | Komenda `ls` w wirtualnym systemie plików |
| `changeDir` | 1541 | Komenda `cd` |
| `catFile` | 1559 | Komenda `cat` (wczytuje plik z FILES) |
| `clearTerminal` | 1578 | Czyści ekran terminala |
| `persistSession` | 1582 | Zapisuje sesję terminala |
| `clearSession` | 1592 | Czyści zapisaną sesję |
| `startBackgroundLogs` | 1600 | Uruchamia tło logów (efekt ambientowy) |
| `stopBackgroundLogs` | 1610 | Zatrzymuje tło logów |
| `finalizeLogin` | 1617 | Kończy logowanie (odblokowanie shella) |
| `requestConfirmation` | 1650 | Prosi o potwierdzenie akcji |
| `runConfirmation` | 1656 | Wykonuje lub anuluje potwierdzoną akcję |
| `tabComplete` | 1670 | Autouzupełnianie w terminalu intro |
| `scheduleWatcherWhisper` | 1711 | Losowy szept „widzę…” po komendach gracza (z prawdopodobieństwem 40%) |
| `execute` | 1722 | Wykonuje wpisaną komendę (dispatch) |
| `sleep` | 1837 | Pauza Promise (ms) |
| `bootIntro` | 1841 | Sekwencja startowa intro |
| `powerOnIntro` | 1856 | Animacja włączenia zasilania |

## Uwagi

- `src/systems/overlays.js` i `src/utils/helpers.js` są puste (0 linii).
- `src/systems/terminalRuntime.js` i `src/systems/menuTerminal.js` to dwa różne terminale: realtime (w trakcie runu) i menu (między runami).
- Pliki tekstowe UTF-8, polskie znaki w komunikatach UI.

