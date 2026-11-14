# Ghost Protocol — przegląd gry

Stan na gałąź `main` (commit `c74067e`). Opis oparty na kodzie w `src/`.

## Cel gry
- Gracz wciela się w operatora (ghost), który infiltruje sieć i wykrada dane, nie dając się wykryć.
- Run = misja na 2–3 piętrach. Warunki: zhakować terminal główny (wymaga zebrania shardów hasła z terminali pobocznych), a potem wrócić do wejścia (ekstrakcja).
- Porażka: śmierć gracza lub przekroczenie trace/alarmu.

## Mechaniki
- **Ruch i stealth**: WASD, kafle, mgła wojny, cienie i miejsca ukrycia (`visibility.js`, `guard.js`, `technician.js`).
- **Przeciwnicy**: kamery (`camera.js`), strażnicy z patrolem i stożkiem widzenia (`guard.js`), technicy wzywani do kamer (`technician.js`), drony (`drone.js`).
- **Hackowanie świata**: kliknięcie celu otwiera menu kontekstowe (`hacking.js`). Akcje zużywają BW (bandwidth), np. oślep kamerę, przeciąż strażnika, przejmij drona, otwórz drzwi.
- **Realtime terminal** (TAB): komendy `connect`, `scan`, `unlock`, `inject`, `deploy worm` itd. działają w czasie rzeczywistym, z kolejką, cooldownem i paskiem heat (`terminalRuntime.js`, `terminalCommands.js`).
- **Trace**: rosnący ślad z progami 25/50/75/100 i kontrmiarami (`traceSystem.js`, `balance.js`).
- **Breach terminala głównego**: wieloetapowy minigame (crack ICE, probe lock, inject bypass, upload creds/payload) z CPU/RAM i black ICE (`networkBreach.js`).
- **Quickhacki**: okno czasowe z zwolnionym czasem, sloty loadoutu, koszt heat (`quickhacks.js`).
- **Tutorial**: kroki prowadzące przez terminal i świat (`tutorial.js`, `generator.js::generateTutorialMap`).

## Hub (meta-progresja między runami)
- **Runy**: oferty misji z typem, zagrożeniem, zyskiem i siecią hosta (`recruitment.js`).
- **Załoga i kontakty**: operatorzy o tierach (skid, operator, ghost); kontakty z terminala głównego i misji rekrutacyjnych (`recruitment.js`).
- **Wywiad (intel)**: proceduralne pliki o hostach runu, część prawdziwa, część zniekształcona lub fałszywa. Przeglądane w shellu `ssh`/`ls`/`cat` w menu (`runIntel.js`, `menuTerminal.js`).
- **Rynek**: quickhacki, akcje breach, Metadata Scanner (2000), Decryptor (2500) (`game.js`, `networkBreach.js`).
- **Tablica danych**: fragmenty danych z kategoriami, połączeniami, metadanymi i dekrypcją; rośnie poziom paranoi (`dataFragments.js`, `ui.js`).
- **Zapis**: `localStorage` (`gp_hub_state`, `gp_data_fragments`, `gp_audio_enabled`).

## Stan implementacji
- Działa: ruch, stealth, strażnicy, kamery, drony, technicy, realtime terminal, trace, breach, quickhacki, hub z runami i rekrutacją, tablica danych, muzyka, tutorial.
- Szkice / niedokończone: `world/floors/generator.js` (placeholder), `entities/distraction.js::tickDistraction` (pusta logika), `src/systems/overlays.js` i `src/utils/helpers.js` (puste pliki), `network_breach.html` (oznaczony jako DEPRECATED).
- Brak: testów, systemu budowania, README (ten dokument i `docs/FUNCTION_INDEX.md` wypełniają tę lukę).

## Główne moduły
| Moduł | Rola |
|---|---|
| `src/core/game.js` | Boot, menu startowe, start runu, pętla gry |
| `src/core/state.js` | Globalny stan `G` |
| `src/systems/update.js` | Logika każdej klatki |
| `src/systems/render.js` | Rysowanie canvasu |
| `src/systems/terminalRuntime.js` | Realtime terminal |
| `src/systems/menuTerminal.js` | Terminal menu (między runami) |
| `src/systems/recruitment.js` | Hub: runy, kontakty, załoga |
| `src/systems/runIntel.js` | Generator wywiadu |
| `src/world/generator.js` | Generacja map |
