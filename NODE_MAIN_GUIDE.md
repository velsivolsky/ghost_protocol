# NODE_MAIN — Podręcznik operatora

> Główny węzeł korporacyjny. Trzy etapy: **AUTH → walka z ICE → eksfiltracja skarbca.**  
> Każdy etap ma własne ryzyka. Brak pośpiechu w exfilu = brak łupu.

---

## Wymagania wstępne

| Wymaganie | Szczegóły |
|---|---|
| **Shard z terminali bocznych** | Zbierz przynajmniej jeden shard, żeby użyć bezpiecznego auth. Opcjonalne, ale mocno zalecane. |
| **BW (Bandwidth)** | ICE drenuje BW atakami. Maksymalne BW maleje z każdą falą (−5/wave, min 50). Zarządzaj tym zasobem. |
| **Loadout breachowy** | Wejdź do menu Huba i załaduj 4 akcje do slotów przed runem. |
| **Trace < 100** | Trace = 100 w trakcie walki → natychmiastowy fail. |

---

## AUTH — wejście do węzła

Podejdź do płytki głównego terminala i wciśnij `E`. Terminal przechodzi w kontekst `main_breach` — normalne komendy są zablokowane.

### Opcja A — bezpieczna (zalecana)
```
upload creds
```
Wymaga sharda z terminali bocznych. Koszt: **+12 trace**. ICE startuje ze **100 HP**.

### Opcja B — brute force (ryzykowna)
```
brute auth
```
*(aliasy: `brute force`, `inject bypass`)*

Nie potrzeba sharda. Koszt: **+30 trace, +25 alert**. ICE startuje wzmocniony ze **120 HP**.

---

## Walka z ICE

ICE Guardian v4.2.1 odpala co-ataki na timerze. Zbij HP do ≤ 20, potem użyj `core`.

### Fazy ICE

| Próg HP | Faza | Zachowanie ICE |
|---|---|---|
| 100–51 | **STANDARD** | Co-ataki co ~7s. Losowo: trace (+8–12) lub drenaż BW. |
| ≤ 50 | **SHIELDED** | Aktywuje 3 warstwy tarczy. Trace spike +12–18 za każdy atak. |
| ≤ 25 | **BERSERKER** | Ataki co 4s. Trace mnożony ×2. Telegrafowane lockouty. |

---

### Okno ataku (+50% damage)

Po **każdym** co-ataku ICE terminal wyświetla:

```
[ICE] WINDOW OPEN — 2s (+50% damage).
```

Przez 2 sekundy twoje akcje ofensywne zadają **+50% obrażeń** (mnożnik nakłada się przed tarczą). Przetrzymanie `use overload` na okno jest zawsze wydajniejsze niż spam.

> `use jammer` blokuje co-atak całkowicie — ale też **nie otwiera okna**. Kalkuluj.

---

### Faza SHIELDED — warstwowa tarcza

Tarcza ma **3 niezależne warstwy**. `shred` usuwa **1 losową warstwę** za użyciem — potrzeba 3 użyć by całkowicie zdjąć.

| Warstwa | Efekt gdy aktywna |
|---|---|
| **ARMOR** | Twoje obrażenia ×0.30 |
| **DRAIN** | Każda akcja gracza kosztuje +4 BW extra |
| **REFLECT** | 30% zadanych obrażeń wraca jako +trace |

Warstwy się kumulują. `crack` w tarcze ARMOR+REFLECT zadaje zredukowane obrażenia **i** dodaje trace. Czasem lepiej poczekać na `shred` zamiast bić w pełną tarczę.

---

### Faza BERSERKER — telegrafowany lockout

ICE ogłasza lockout z wyprzedzeniem:

```
[ICE] INITIATING LOCKOUT SEQUENCE — 2s. Cel: crack, overload. Uzyj SANDBOX by zablokowac!
```

Masz **2 sekundy** by użyć `sandbox`. Zdążysz — lockout anulowany. Nie zdążysz — 2 akcje z loadoutu zablokowane na 5s.

---

## Akcje breachowe

### Ofensywne

| Komenda | Efekt | BW | Cooldown |
|---|---|---|---|
| `use crack` | 8 dmg (base) | 10 | 2.5s |
| `use worm` | 12 dmg + DOT (4 dmg ×2 co 3s) | 12 | 3s |
| `use overload` | 22 dmg (base) | 24 | 8s |
| `core` | Finisher — wymaga HP ≤ 20 | 18 | — |
| `ba 1–4` | Użyj akcji z slotu loadoutu | — | per akcja |

*Wartości dmg są **przed** modyfikatorami okna (+50%) i tarczy (×0.30).*

### Defensywne / utilitarne

| Komenda | Efekt |
|---|---|
| `use suppress` | Ładuje 2 ładunki: następne 2 ataki ICE −8 trace każdy |
| `use jammer` | Blokuje następny atak ICE całkowicie (bez okna) |
| `use shred` | Usuwa 1 losową warstwę tarczy |
| `use sandbox` | Gotowy do anulowania następnego telegrafowanego lockoutu |
| `use cacheburst` | +15 BW (cooldown: **12s**, nie spamuj) |

---

## BW — presja zasobu

BW to ograniczony zasób z wieloma wektorami drenażu:

- **Ataki ICE STANDARD** — co-atak może odebrać 8–12 BW
- **Warstwa DRAIN** — +4 BW do każdej akcji gracza gdy aktywna
- **Degradacja wave** — max BW = `100 − (wave−1) × 5`, minimum 50. Wave 3 = 90 max, wave 6 = 75 max
- **Kara za bezczynność** — brak akcji przez **>8 sekund** → ICE aktywnie drenuje −5 BW/s. Graj aktywnie

`cacheburst` przywraca +15 BW ale ma **12s cooldown** — nie ratuje w środku combo.

---

## Eksfiltracja skarbca (45s)

Po zabciu ICE (`core`) vault się otwiera. Natychmiast startuje **Vault Integrity Timer: 45 sekund**.

```
[VAULT] VAULT INTEGRITY: 45s do lockdownu — pospieszcie sie!
```

### Timer — co się dzieje

| Czas | Zdarzenie |
|---|---|
| −20s | Ostrzeżenie w terminalu |
| −10s | Finalne ostrzeżenie |
| 0s | **VAULT LOCKDOWN** — pliki wymazane, `scp` zablokowane |
| Po lockdownie | `transfer funds` **wciąż działa** — kredyty zawsze bezpieczne |

**Dylemat**: Czytasz każdy plik przez `cat` żeby wiedzieć co bierzesz — albo `scp` wszystko w ciemno i uciekasz?

### Nawigacja

```
ls vault/intel      — lista plików do eksfiltracji
ls                  — lista bieżącego katalogu
cd vault/intel      — wejście do katalogu intel
cat <plik>          — odczyt zawartości pliku
```

### Struktura

```
/
├── sys/            — logi systemowe (flavor)
├── vault/
│   ├── intel/      — pliki do scp (data fragments, kontakty)
│   └── wallet.enc  — kredyty
└── ops/            — pliki operacyjne (flavor)
```

### Eksfiltracja

```
scp <plik>          — eksfiltruj plik z vault/intel
transfer funds      — przelej kredyty z wallet.enc
```

Każdy plik można eksfiltrować tylko raz. Łup nie jest przyznawany do czasu `disconnect`.

---

## Disconnect i Ghost Rating

```
disconnect
```
*(alias: `dc`)*

Aplikuje cały zebrany łup i wychodzi z kontekstu breach. Na podstawie finalnego poziomu trace przyznawany jest **Ghost Rating**:

| Trace końcowy | Rating | Bonus |
|---|---|---|
| ≤ 25 | **GHOST** | +40% do kredytów z `transfer funds` |
| 26–60 | **CLEAN** | Standardowo |
| 61–99 | **HOT** | Standardowo (hook pod przyszłe zdarzenia) |

> Rating naliczany jest **tylko do kredytów** — nagrody plikowe (fragmenty, kontakty) są niezmienione.

---

## Stany failure

| Przyczyna | Skutek |
|---|---|
| Trace ≥ 100 podczas walki | Natychmiastowy fail — cały łup przepada |
| Vault timer = 0 | Pliki wymazane — kredyty wciąż dostępne |
| `abort breach` | Bezpieczne wyjście (tylko przed otwarciem vaultu). Brak łupu. Breach można powtórzyć. |
| `disconnect` bez `scp` | Plik nie eksfiltrowany = nie przyznany |

---

## Szybkie odwołanie

```
═══ AUTH ═══════════════════════════════════════════════════
upload creds        bezpieczny auth (wymaga shard) → ICE 100 HP
brute auth          ryzykowny auth (+30 trace)     → ICE 120 HP

═══ ICE BATTLE ═════════════════════════════════════════════
ba 1 / 2 / 3 / 4    akcje z loadoutu
use crack           8 dmg    / 2.5s cd
use worm            12 dmg+DOT / 3s cd
use overload        22 dmg   / 8s cd   ← czekaj na WINDOW
use shred           usuń 1 warstwę tarczy (3× by wyczyścić)
use sandbox         anuluj lockout w oknie 2s
use suppress        osłab 2 następne ataki ICE
use jammer          zablokuj 1 atak ICE (bez okna!)
use cacheburst      +15 BW / 12s cd
core                finisher (HP ≤ 20)

═══ VAULT (45s) ════════════════════════════════════════════
ls vault/intel      lista plików
cat <plik>          odczyt (kosztuje czas)
scp <plik>          eksfiltracja pliku
transfer funds      eksfiltracja kredytów (bezpieczne po lockdownie)

═══ UCIECZKA ═══════════════════════════════════════════════
disconnect          aplikuj łup + Ghost Rating i wyjdź
abort breach        anuluj bez łupu (tylko przed vaultem)

═══ GHOST RATING ════════════════════════════════════════════
trace ≤ 25  → GHOST  (+40% kredytów)
trace 26–60 → CLEAN  (standard)
trace 61–99 → HOT    (standard)
```


---

## 1. Prerequisites

| Requirement | Detail |
|---|---|
| **Side Terminals** | Hack 1+ side terminals to recover a credential shard (optional but recommended) |
| **BW (Bandwidth)** | ICE attacks drain BW. Max BW degrades per wave (-5/wave, min 50). Top up via `cacheburst` |
| **Breach Action Loadout** | Equip 4 actions in the hub menu before the run (slots 1–4) |
| **Trace < 100** | Trace reaching 100 = instant breach failure |

---

## 2. Connecting

Walk to the main terminal tile and press `E` (or activate via HUD) to enter the breach terminal context. All normal commands are blocked except `disconnect`, `game_options`.

---

## 3. Authentication

### Option A — Upload Credentials (Safe)
```
upload creds
```
- Requires a credential shard recovered from a side terminal.
- Low trace cost (+12 trace).
- Recommended path. ICE spawns at **100 HP**.

### Option B — Brute Auth (Risky)
```
brute auth
```  
*(aliases: `brute force`, `inject bypass`)*

- No shard required.
- Costs **+30 trace** and **+25 alert**.
- ICE Guardian spawns **reinforced at 120 HP**.

---

## 4. ICE Battle

After authentication, ICE Guardian v4.2.1 spawns and fires counterattacks on a timer. Reduce HP to ≤ 20, then use `core` to finish.

### ICE Phases

| HP Threshold | Phase | Effect |
|---|---|---|
| 100–51 | STANDARD | Random trace (+8–12) or BW drain. Attack interval: 6s |
| ≤ 50 | SHIELDED | Activates 3 independent shield layers (see below). Trace spikes +12–18 |
| ≤ 25 | BERSERKER | Attack interval drops to 4s. Trace ×2. Telegraphed lockouts |

### Attack Window

After **every ICE counterattack** fires, a **2-second window** opens (`[ICE] WINDOW OPEN — 2s`). Damage dealt during this window is **+50%**. Holding `use overload` for the window is always more efficient than spamming.

### SHIELDED Phase — Layered Shield

The shield has **3 independent layers**. Each `shred` removes 1 random layer. The shield is fully down only after 3 uses.

| Layer | Effect while active |
|---|---|
| **ARMOR** | All damage ×0.30 |
| **DRAIN** | Each player action costs +4 BW extra |
| **REFLECT** | 30% of applied damage is added to your trace |

Layers stack — hitting an ARMOR+REFLECT shield with `crack` will do reduced damage AND add trace. Sometimes it's better to eat 1–2 layers and play around the rest.

### BERSERKER Phase — Telegraphed Lockout

Instead of instant lockouts, ICE announces: `[ICE] INITIATING LOCKOUT SEQUENCE — 2s`. You have **2 seconds** to use `sandbox` to cancel it. Miss the window and 2 loadout actions are locked for 5s.

---

## 5. Breach Action Reference

### Combat Actions

| Command | Syntax | Effect | BW Cost | Cooldown |
|---|---|---|---|---|
| `use` | `use crack` | Direct damage (8 dmg base) | 10 BW | 2.5s |
| `use` | `use worm` | Damage + DoT (12 dmg + 4×2 over 6s) | 12 BW | 3s |
| `use` | `use overload` | High damage (22 dmg base) | 24 BW | 8s |
| `ba` | `ba 1` | Use action in loadout slot 1 | — | per action |
| `core` | `core` | ICE Finisher (requires HP ≤ 20) | 18 BW | — |

*All damage values are **before** attack window (+50%) and shield (×0.30) modifiers.*

### Utility Actions

| Command | Effect |
|---|---|
| `use suppress` | Reduces next 2 ICE attacks by ~8 trace |
| `use jammer` | Blocks next ICE attack entirely (no attack window opens) |
| `use shred` | Removes 1 random shield layer (use 3× to fully clear) |
| `use sandbox` | Cancels incoming telegraphed lockout within 2s window |
| `use cacheburst` | Restores +15 BW (**cooldown: 12s**) |

### BW Pressure

- **Max BW degrades per wave**: -5 BW max per wave (min 50). Wave 1 = 100, Wave 3 = 90, etc.
- **DRAIN shield**: +4 BW extra per action while active.
- **Idle penalty**: If you take no action for **>8 seconds**, ICE actively drains -5 BW/s. Act constantly or manage BW carefully.
- `cacheburst` has a **12s cooldown** — can't be spammed.

---

## 6. Filesystem Exfiltration

After `core` kills the ICE Guardian, the vault unlocks. A **45-second Vault Integrity countdown** begins immediately.

### Vault Timer

- At **20s** remaining: warning logged.
- At **10s** remaining: final warning.
- At **0s**: vault lockdown — **all files purged**, intel and contact rewards lost.
- **Credits (`wallet.enc`) are always safe** — `transfer funds` works even after lockdown.

**Decision pressure**: Do you `cat` every file to know what you're grabbing, or `scp` everything blind and run?

### Navigation

```
ls              — list current directory
ls vault/intel  — list exfil-ready files
cd vault/intel  — change to intel directory
cat <filename>  — read file contents
```

### Filesystem Structure

```
/
├── sys/          — system logs (flavor text)
├── vault/
│   ├── intel/    — exfiltrable files (data fragments, contacts)
│   └── wallet.enc — credits vault
└── ops/          — mission ops files (flavor text)
```

### Exfiltrating Files

```
scp <filename>      — exfiltrate a file from vault/intel
transfer funds      — transfer credits from wallet.enc
```

- Each file can only be exfiltrated once.
- **Loot is not granted until you exfiltrate it.** Disconnecting without SCP = no reward.
- Credits scale with wave number (≈ 150 + wave × 60).

---

## 7. Disconnect & Ghost Rating

```
disconnect
```
*(alias: `dc`)*

- **Applies all exfiltrated loot** (credits, contact, data fragment).
- Non-exfiltrated rewards are permanently lost.
- Awards a **Ghost Rating** based on your final trace level.

### Ghost Rating

| Final Trace | Rating | Credit Bonus |
|---|---|---|
| ≤ 25 | **GHOST** | +40% credits |
| 26–60 | **CLEAN** | Standard |
| 61–99 | **HOT** | Standard (may trigger post-exfil events) |

Ghost Rating is applied to `transfer funds` credits only — file rewards are unaffected.

---

## 8. Failure States

| Cause | Effect |
|---|---|
| Trace reaches 100 during ICE battle | `failNetworkBreach()` — all pending loot lost, breach marked failed |
| Vault timer reaches 0 | Files purged — credits still transferable |
| `abort breach` | Safely exits (only works before vault opens). No loot. Breach can be re-attempted. |
| Disconnect without SCP | Loot not collected = not granted |

---

## 9. Quick Reference

```
-- AUTH --
upload creds            safe auth (needs shard) → ICE 100 HP
brute auth              risky auth (+30 trace)  → ICE 120 HP

-- ICE BATTLE --
ba 1 / ba 2 / ba 3 / ba 4   use loadout actions by slot
use crack               8 dmg / 2.5s cd
use overload            22 dmg / 8s cd  ← hold for WINDOW (+50%)
use shred               remove 1 shield layer (3× to clear)
use sandbox             cancel BERSERKER lockout in 2s window
core                    finisher (HP ≤ 20)

-- VAULT (45s timer) --
ls vault/intel          list exfiltrable files
cat <file>              read file (costs time)
scp <file>              exfiltrate file
transfer funds          exfiltrate credits (safe even after lockdown)

-- ESCAPE --
disconnect              apply loot + Ghost Rating & exit
abort breach            cancel (no loot, pre-vault only)

-- GHOST RATING --
trace ≤ 25 → GHOST (+40% credits)
trace 26–60 → CLEAN
trace 61–99 → HOT
```

