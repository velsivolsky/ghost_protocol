# Ghost Protocol — przegląd gry (dla agentów)

Stan: gałąź `main`, commit `fd666f6`. Opis oparty na kodzie w `src/`. Szczegóły funkcji: `docs/FUNCTION_INDEX.md`.

## Cel gry
- Gracz wciela się w operatora (ghost), który infiltruje sieć i wykrada dane, nie dając się wykryć.
- Run = misja na 2–3 piętrach. Warunek wygranej: zhakować terminal główny (wymaga zebrania shardów hasła z terminali pobocznych), a potem wrócić do wejścia (ekstrakcja).
- Porażka: śmierć gracza lub przekroczenie trace/alarmu.

## Mechaniki
- **Ruch i stealth**: WASD, kafle, mgła wojny, cienie i miejsca ukrycia (`visibility.js`, `guard.js`, `technician.js`).
- **Przeciwnicy**: kamery (`camera.js`), strażnicy z patrolem i stożkiem widzenia (`guard.js`), technicy wzywani do kamer (`technician.js`), drony (`drone.js`).
- **Hackowanie świata**: kliknięcie celu otwiera menu kontekstowe (`hacking.js`). Akcje zużywają BW (bandwidth), np. oślep kamerę, przeciąż strażnika, przejmij drona.
- **Realtime terminal** (TAB): komendy działają w czasie rzeczywistym, z kolejką, cooldownem i paskiem heat (`terminalRuntime.js`, `terminalCommands.js` — rejestr i koszty, `terminalParser.js` — parsowanie). Przykłady id: `connect`, `scan_local`, `scan_network`, `inject`, `open`, `close`, `elevator_up`, `elevator_down`, `feed_show_cone`, `game_options`.
- **Trace**: rosnący ślad z progami `TRACE_TIERS` = 25/50/75/100 i kontrmiarami (`traceSystem.js`, `core/balance.js`).
- **Nacisk paranoi**: pasywny wzrost trace z fragmentów danych o wysokiej paranoi (`dataFragments.js::getParanoiaPressure`, `update.js`).
- **Breach terminala głównego**: wieloetapowy minigame z CPU/RAM i black ICE (`networkBreach.js`, `BREACH_BALANCE` w `core/balance.js`). Komendy: `brute_auth`, `upload_creds`, `use_breach`, `core`, `fs_ls`, `fs_cd`, `fs_cat`, `fs_scp`, `transfer_funds`, `abort_breach`.
- **Quickhacki**: okno czasowe ze zwolnionym czasem, sloty loadoutu, koszt heat (`quickhacks.js`).
- **Winda (elevator)**: mechanika zmieniana w ostatnich commitach (`8ad037e`). Dotyka `update.js`, `generator.js`, `tutorial.js`, `render.js`.
- **Martwe skrzynki (dead drops)**: kafel generowany na mapie, gdy hub ma `pendingDeadDrop` (`world/generator.js`); zbierany po podejściu gracza (`update.js`, stan w `core/state.js`).
- **Ryzyko paniki operatora**: każdy operator ma `panicRisk` (wyższe dla tieru `skid`). Gdy alarm > 70, co 60 s może porzucić run (opis w komentarzu i `getActiveOperatorBuffs` w `systems/recruitment.js`).
- **Ochrona przed przypadkowym wejściem**: skróty klawiszowe nie działają, gdy gracz pisze w polu tekstowym (`input.js`, commit `fd666f6`).
- **Tutorial**: kroki prowadzące przez terminal i świat (`tutorial.js`, `world/generator.js::generateTutorialMap`).

## Hub (meta-progresja między runami)
- **Runy**: oferty misji z typem, zagrożeniem, zyskiem i siecią hosta (`recruitment.js`, widok planu w `game.js`).
- **Załoga i kontakty**: operatorzy o tierach (skid, operator, ghost); kontakty z terminala głównego i misji rekrutacyjnych (`recruitment.js`).
- **Wywiad (intel)**: proceduralne pliki o hostach runu, część prawdziwa, część zniekształcona lub fałszywa. Przeglądane w shellu `ssh`/`ls`/`cat` w menu (`runIntel.js`, `menuTerminal.js`).
- **Rynek**: quickhacki, akcje breach, Metadata Scanner (2000), Decryptor (2500) (`game.js`, `networkBreach.js`).
- **Tablica danych**: fragmenty danych z kategoriami, połączeniami, metadanymi i dekrypcją (`dataFragments.js` — logika, `ui.js` — widok).
- **Historia runów**: po wygranej zapisywana (data, fala, typ, kredyty, alarm, trace, side hacki) w `mission.js::win` i `ui.js::renderRunHistory`.
- **Zapis**: `localStorage` (`gp_hub_state`, `gp_data_fragments`, `gp_audio_enabled`) — `persistence.js`, `dataFragments.js`, `audio.js`.

## Gdzie zmieniać mechaniki
| Co zmieniasz | Pliki | Uwagi |
|---|---|---|
| Progi i kary trace | `core/balance.js` (`TRACE_TIERS`, `TRACE_BALANCE`), `traceSystem.js` | Kontrmiary w `softenTrace`, maska w `activateTraceMask` |
| Koszty i balans breach | `core/balance.js` (`BREACH_BALANCE`), `networkBreach.js` | Nowa komenda breach: `networkBreach.js` + rejestr w `terminalCommands.js` |
| Nowa komenda terminala (realtime) | `terminalCommands.js` (rejestr), `terminalRuntime.js` (handler), `terminalParser.js` | Koszty heat/bw w rejestrze |
| Quickhacki | `quickhacks.js` (definicje, sloty, okno), `hacking.js` (użycie w świecie) | |
| Strażnicy i wykrywanie | `entities/guard.js`, `visibility.js`, `update.js` | `isPlayerHiddenFromGuard` |
| Technicy i kamery | `entities/technician.js`, `entities/camera.js`, `hacking.js` (`revealCamCone`) | |
| Drony | `entities/drone.js`, `hacking.js::hijackDrone` | |
| Generacja map i pięter | `world/generator.js`, `core/state.js` (`initFloorState`) | Dead drop i plan dostępu w `generateMultiFloorMap` |
| Hub, runy, rekrutacja, panika | `recruitment.js`, `ui.js`, `game.js` | Wynik runu: `processRunOutcome`, `resolveRunSuccess` |
| Fragmenty danych i paranoia | `dataFragments.js`, `ui.js` (`_renderParanoia`) | |
| Intel | `runIntel.js` (generacja), `menuTerminal.js` (shell) | |
| Tutorial | `tutorial.js`, `world/generator.js::generateTutorialMap` | |
| Audio | `audio.js` | |
| Renderowanie | `render.js` (canvas 2D), `renderWebGL.js` (WebGL) | |
| Wejście | `input.js` | |

## Stan implementacji
- Działa: ruch, stealth, strażnicy, kamery, drony, technicy, realtime terminal, trace, breach, quickhacki, hub z runami i rekrutacją, tablica danych, muzyka, tutorial, historia runów.
- Szkice / niedokończone: `world/floors/generator.js` (placeholder), `entities/distraction.js::tickDistraction` (pusta logika), `src/systems/overlays.js` i `src/utils/helpers.js` (puste pliki, 0 linii), `network_breach.html` (oznaczony jako DEPRECATED).
