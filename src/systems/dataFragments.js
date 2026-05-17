import { G } from '../core/state.js';

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT DEFINITIONS
// Each fragment: id, title, content, probability (0.0–1.0), category,
//   subcategory, defaultConnections (IDs of related fragments),
//   paranoiaLevel (1–5), rarity ('common'|'rare'|'classified')
//
// Distribution: 60% real (0.75–1.0), 25% partial (0.40–0.69), 15% fake (0.00–0.35)
// ─────────────────────────────────────────────────────────────────────────────

export const FRAGMENT_DEFINITIONS = [

  // ── TOŻSAMOŚĆ → PAMIĘĆ ────────────────────────────────────────────────────
  { id: 'DF_001', title: 'ZAPIS MEDYCZNY — PACJENT 0091-M', content: 'Pacjent odzyskał wspomnienia osoby zmarłej 12 lat temu. Szczegóły dotyczące miejsca zamieszkania, rodziny i codziennych rutyn — w 94% zgodne z archiwum publicznym. Pacjent nie miał dostępu do tych danych. Implant: HELIX MEM-4.', probability: 0.91, category: 'TOŻSAMOŚĆ', subcategory: 'pamięć', defaultConnections: ['DF_006', 'DF_016'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_002', title: 'PATENT — EKSPORT WZORCÓW PAMIĘCI', content: 'Niektóre wspomnienia można eksportować jak pliki. Patent złożony przez HELIX SYSTEMS w 2091 roku, numer H-7731-MEM. Opis: protokół serializacji engramów neuronalnych do formatu .nrv. Status patentu: WYCOFANY z rejestru publicznego.', probability: 0.87, category: 'TOŻSAMOŚĆ', subcategory: 'pamięć', defaultConnections: ['DF_003', 'DF_031'], paranoiaLevel: 2, rarity: 'rare' },
  { id: 'DF_003', title: 'DONIESIENIE — CZARNY RYNEK PAMIĘCI', content: 'W sektorze medycznym działa nielegalny handel pamięcią. Ceny: wspomnienie dzieciństwa — ¥800, traumatyczne — ¥1400, wojskowe — ¥6000+. Sprzedawcy operują pod przykrywką klinik regeneracyjnych.', probability: 0.79, category: 'TOŻSAMOŚĆ', subcategory: 'pamięć', defaultConnections: ['DF_002', 'DF_033'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_004', title: 'RAPORT KLINICZNY — UTRATA DZIECIŃSTWA', content: 'Ludzie po aktualizacji implantów tracą fragmenty dzieciństwa. Raport z kliniki VEGA: 34 pacjentów w ciągu 6 miesięcy zgłasza luki w autobiograficznej pamięci. HELIX SYSTEMS nie potwierdza związku.', probability: 0.72, category: 'TOŻSAMOŚĆ', subcategory: 'pamięć', defaultConnections: ['DF_016', 'DF_018'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_005', title: 'FORUM — TEORIA O ZAPACHU OZONU', content: 'Prawdziwe wspomnienia mają zapach ozonu. Teoria z forum DEEPNODE. Użytkownik "ANON_77" twierdzi, że syntetyczne wspomnienia nie wyzwalają węchowych skojarzeń. 4311 polubień. Konto usunięte po 3 dniach.', probability: 0.28, category: 'TOŻSAMOŚĆ', subcategory: 'pamięć', defaultConnections: ['DF_020'], paranoiaLevel: 1, rarity: 'common' },

  // ── TOŻSAMOŚĆ → BACKUP ŚWIADOMOŚCI ───────────────────────────────────────
  { id: 'DF_006', title: 'DOKUMENT WEWNĘTRZNY — PROJEKT ECHO', content: 'Projekt ECHO stworzył częściową kopię świadomości. Faza I: ekstrakcja wzorców osobowości. Faza II: stabilizacja w środowisku neuronalnym. Wyniki: podmiot ECHO-01 odpowiada na pytania przez 9 dni po śmierci biologicznej. Klasyfikacja: ULTRA BLACK.', probability: 0.93, category: 'TOŻSAMOŚĆ', subcategory: 'backup świadomości', defaultConnections: ['DF_001', 'DF_096'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_007', title: 'ANOMALIA DANYCH — WIELOKROTNE BACKUPY', content: 'Niektórzy obywatele posiadają więcej niż jeden backup. Rejestr SIGMA wykazuje 17 profili z duplikatami wzorców osobowości. Oficjalne wyjaśnienie: błąd synchronizacji. Nieoficjalnie: eksperyment.', probability: 0.88, category: 'TOŻSAMOŚĆ', subcategory: 'backup świadomości', defaultConnections: ['DF_006', 'DF_011'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_008', title: 'ZAPIS TUNELOWY — LOKALIZACJA BACKUPÓW', content: 'Backupy osobowości przechowywane są pod miastem. Źródło: anonimowy inżynier infrastruktury. Koordynaty prowadzą do sektora ZERO, poziom -4. Temperatura serwerowni: -30°C. Nie figuruje w żadnym rejestrze budowlanym.', probability: 0.81, category: 'TOŻSAMOŚĆ', subcategory: 'backup świadomości', defaultConnections: ['DF_086', 'DF_087'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_009', title: 'LOG SIECI — LOGOWANIA PO ŚMIERCI', content: 'Po śmierci część użytkowników nadal logowała się do sieci. 9 przypadków w ciągu roku. Logi potwierdzone przez SIGMA NETWORK. Wszystkie sesje: czas trwania poniżej 7 minut. Treść sesji: zaszyfrowana.', probability: 0.69, category: 'TOŻSAMOŚĆ', subcategory: 'backup świadomości', defaultConnections: ['DF_006', 'DF_044'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_010', title: 'TEORIA — AKTYWACJA PRZEZ SEN', content: 'Backup świadomości można aktywować podczas snu. Autor: dr Emil Vance (tożsamość nieweryfikowalna). Dokument krąży w obiegu zamkniętym. Mechanizm: fala delta jako klucz autoryzacyjny. Brak potwierdzenia technicznego.', probability: 0.17, category: 'TOŻSAMOŚĆ', subcategory: 'backup świadomości', defaultConnections: ['DF_009', 'DF_081'], paranoiaLevel: 2, rarity: 'common' },

  // ── TOŻSAMOŚĆ → CYFROWE KLONY ─────────────────────────────────────────────
  { id: 'DF_011', title: 'RAPORT BEZPIECZEŃSTWA — DUPLIKATY NEURONALNE', content: 'Istnieją osoby posiadające identyczne wzorce neuronalne. Skaner NEXUS zidentyfikował 31 par. Statystyczna niemożliwość przy naturalnym rozwoju osobowości. Departament Bezpieczeństwa: sprawa zamknięta bez wyjaśnienia.', probability: 0.82, category: 'TOŻSAMOŚĆ', subcategory: 'cyfrowe klony', defaultConnections: ['DF_007', 'DF_012'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_012', title: 'WEWNĘTRZNY BRIEF — KOPIOWANIE AGENTÓW', content: 'Korporacje testowały kopiowanie osobowości agentów. Projekt MIRROR: zdublowanie profilu psychologicznego elitarnych operatorów w celu tworzenia rezerwowych jednostek. Wyniki: niepełne. Kopie wykazywały odchylenia emocjonalne.', probability: 0.77, category: 'TOŻSAMOŚĆ', subcategory: 'cyfrowe klony', defaultConnections: ['DF_011', 'DF_052'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_013', title: 'ZEZNANIA ŚWIADKÓW — WŁASNE KOPIE', content: 'Część mieszkańców widziała własne kopie. Zeznania zbierane przez grupę badawczą VEIL. 12 przypadków: osoby widziały siebie w tłumie, na nagraniach, w oknach budynków. Żaden przypadek niepotwierdzony technicznie.', probability: 0.61, category: 'TOŻSAMOŚĆ', subcategory: 'cyfrowe klony', defaultConnections: ['DF_011', 'DF_148'], paranoiaLevel: 3, rarity: 'common' },
  { id: 'DF_014', title: 'TEORIA SIECIOWA — KLONY PODCZAS BLACKOUTÓW', content: 'Cyfrowe klony zastępują ludzi podczas blackoutów. Teoria popularna w środowiskach hakerskich. Opiera się na analizie statystycznej aktywności społecznej: podczas blackoutów obserwuje się anomalne wzorce zachowań grupowych.', probability: 0.12, category: 'TOŻSAMOŚĆ', subcategory: 'cyfrowe klony', defaultConnections: ['DF_015', 'DF_069'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_015', title: 'MANIFEST — UKRYTE KOPIE OBYWATELI', content: 'Każdy obywatel posiada ukrytą kopię w sieci. Autor nieznany. Dokument zawiera szczegółowy opis architektury systemu backupów. Część techniczna: weryfikowalna. Wniosek: niemożliwy do potwierdzenia bez dostępu do SIGMA.', probability: 0.08, category: 'TOŻSAMOŚĆ', subcategory: 'cyfrowe klony', defaultConnections: ['DF_014'], paranoiaLevel: 1, rarity: 'common' },

  // ── TOŻSAMOŚĆ → FAŁSZYWE WSPOMNIENIA ─────────────────────────────────────
  { id: 'DF_016', title: 'ANALIZA — IDENTYCZNE WSPOMNIENIA KLIENTÓW HELIX', content: 'Pacjenci klinik HELIX posiadają identyczne wspomnienia dzieciństwa. Badanie niezależnego analityka: próba 80 pacjentów. Wspomnienie "czerwony rower, słoneczne południe, zapach trawy" — opisane przez 67 z nich. HELIX: bez komentarza.', probability: 0.89, category: 'TOŻSAMOŚĆ', subcategory: 'fałszywe wspomnienia', defaultConnections: ['DF_004', 'DF_037'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_017', title: 'DOSSIER — ŚWIADKOWIE Z IMPLANTOWANĄ PAMIĘCIĄ', content: 'Część policyjnych świadków otrzymała sztuczne wspomnienia. Sprawa 2093-CR-007: zeznania świadków zawierały szczegóły niemożliwe do zaobserwowania z miejsca, w którym się znajdowali. Implant: HELIX MEM-7 (wersja policyjna).', probability: 0.84, category: 'TOŻSAMOŚĆ', subcategory: 'fałszywe wspomnienia', defaultConnections: ['DF_016', 'DF_056'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_018', title: 'PATENT KLINICZNY — NADPISYWANIE TRAUMY', content: 'Niektóre implanty mogą nadpisywać traumę. Produkt: HELIX CALM-2. Zastosowanie medyczne. Efekt uboczny odnotowany w dokumentacji: 22% przypadków utraty wspomnień sprzed miesiąca poprzedzającego traumę.', probability: 0.74, category: 'TOŻSAMOŚĆ', subcategory: 'fałszywe wspomnienia', defaultConnections: ['DF_004', 'DF_031'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_019', title: 'DONIESIENIE — EDYCJA PAMIĘCI BEZ ZGODY', content: 'Pamięć można edytować bez zgody użytkownika. Źródło: były inżynier HELIX. Metoda: fałszywa aktualizacja firmware. Użytkownik nie odczuwa nic poza chwilowym bólem głowy. Dowód: log aktualizacyjny z datą.', probability: 0.55, category: 'TOŻSAMOŚĆ', subcategory: 'fałszywe wspomnienia', defaultConnections: ['DF_017', 'DF_018'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_020', title: 'PASTA SIECIOWA — ZBYT DOKŁADNA PAMIĘĆ', content: 'Jeśli pamiętasz swoje dzieciństwo zbyt dokładnie — jest fałszywe. Krąży w sieci od 2089. Brak weryfikowalnego źródła. 2.3 miliona udostępnień. Kilkaset komentarzy od osób twierdzących, że sprawdziło teorię i "coś nie grało".', probability: 0.19, category: 'TOŻSAMOŚĆ', subcategory: 'fałszywe wspomnienia', defaultConnections: ['DF_005', 'DF_016'], paranoiaLevel: 1, rarity: 'common' },

  // ── TOŻSAMOŚĆ → SNY ───────────────────────────────────────────────────────
  { id: 'DF_021', title: 'RAPORT EPIDEMIOLOGICZNY — SYNCHRONICZNE KOSZMARY', content: 'NEURONET wywołuje identyczne koszmary. Raport z 2092: w sektorze A-7 w ciągu jednej nocy 412 osób zgłosiło identyczny koszmar. Motyw: pusta ulica, dźwięk kapania wody, twarz bez rysów. Departament Zdrowia: brak działań.', probability: 0.91, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_022', 'DF_079'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_022', title: 'DOKUMENT — PROJEKT BLACK VEIL', content: 'BLACK VEIL badał synchronizację snów. Cel: stworzenie kanału komunikacyjnego działającego podczas snu. Wyniki fazy I: udana synchronizacja między 2 podmiotami. Wyniki fazy II: utrata kontroli nad treścią transmisji.', probability: 0.82, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_021', 'DF_048'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_023', title: 'ANALIZA TECHNICZNA — TRANSMISJE SNÓW', content: 'Niektóre sny są transmitowane między użytkownikami. Protokół: SIGMA DREAMCAST (nieoficjalna nazwa). Transmisja zachodzi przy synchronizacji implantów klasy NEURO-3+. Użytkownicy nie są świadomi uczestnictwa.', probability: 0.76, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_021', 'DF_081'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_024', title: 'HISTORIA PRZYPADKU — 11 DNI OBCEGO ŻYCIA', content: 'Pacjent śnił życie nieznanej osoby przez 11 dni. Klinika MERIDIAN. Pacjent opisywał szczegóły mieszkania, rodziny i pracy "właściciela" snów. Tożsamość opisywanej osoby: ustalona, nieżyjąca od 4 lat.', probability: 0.63, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_023', 'DF_099'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_025', title: 'MANIFEST — MIASTO KTÓRE ŚNI', content: 'Miasto śni razem z mieszkańcami. Tekst poetycki znaleziony na serwerze darknet. Autor twierdzi, że infrastruktura sieci generuje własne stany podobne do snu. Tekst zawiera precyzyjne dane techniczne niemożliwe do "wymyślenia".', probability: 0.22, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_129'], paranoiaLevel: 2, rarity: 'common' },

  // ── HELIX SYSTEMS → LABORATORIA ──────────────────────────────────────────
  { id: 'DF_026', title: 'RAPORT TERENOWY — LAB H-09 W SLUMSACH', content: 'W slumsach znaleziono wojskowe laboratorium HELIX. Lokalizacja: sektor 14-F, poziom uliczny. Sprzęt: aktywny, serwerownia zasilana niezależną siecią. Znaleziono dokumenty klasyfikacji ULTRA BLACK. Autorzy raportu: zaginęli 3 dni po złożeniu.', probability: 0.94, category: 'HELIX SYSTEMS', subcategory: 'laboratoria', defaultConnections: ['DF_027', 'DF_029'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_027', title: 'GEOLOKALIZACJA — BRAKUJĄCE LABORATORIUM', content: 'Laboratorium H-09 zostało wymazane z map miasta. Porównanie map z 2088 i 2092: budynek zniknął z danych kartograficznych. Fizycznie: nadal istnieje. Dostęp: blokowany przez lokalne AI zarządzające ruchem.', probability: 0.88, category: 'HELIX SYSTEMS', subcategory: 'laboratoria', defaultConnections: ['DF_026', 'DF_028'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_028', title: 'KONTRAKT — KLAUZULA AMNEZJI', content: 'Pracownicy HELIX podpisują umowy bez prawa pamięci. Klauzula 17-B: "Pracownik wyraża zgodę na selektywną modyfikację wspomnień związanych z treścią projektów." Potwierdzono legalność przez Departament Prawa Korporacyjnego.', probability: 0.84, category: 'HELIX SYSTEMS', subcategory: 'laboratoria', defaultConnections: ['DF_019', 'DF_038'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_029', title: 'ZAPIS INŻYNIERYJNY — DODATKOWE POZIOMY', content: 'Pod laboratoriami istnieją dodatkowe poziomy. Plany budowlane ujawniają 3 niezarejestrowane kondygnacje podziemne pod laboratorium H-09. Wentylacja aktywna. Brak rejestrów użytkowników. Temperatura: normalna dla ludzkiej obecności.', probability: 0.79, category: 'HELIX SYSTEMS', subcategory: 'laboratoria', defaultConnections: ['DF_026', 'DF_086'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_030', title: 'OBSERWACJA — AKTYWNOŚĆ PODCZAS BLACKOUTU', content: 'Laboratoria HELIX działają także podczas blackoutów. Obserwacja z 2093: w trakcie 8-godzinnego blackoutu w sektorze 14, okna laboratorium HELIX były oświetlone. Niezależne zasilanie nieujawnione w żadnym dokumencie publicznym.', probability: 0.33, category: 'HELIX SYSTEMS', subcategory: 'laboratoria', defaultConnections: ['DF_026', 'DF_142'], paranoiaLevel: 2, rarity: 'common' },

  // ── HELIX SYSTEMS → IMPLANTY ──────────────────────────────────────────────
  { id: 'DF_031', title: 'SPECYFIKACJA — IMPLANTY REJESTRUJĄCE EMOCJE', content: 'Niektóre implanty zapisują emocje właścicieli. Model: HELIX AFFECT-1. Parametry: ciągły zapis reakcji limbicznych w formacie skompresowanym. Cel deklarowany: badania nad stresem. Dostęp do danych: HELIX SYSTEMS.', probability: 0.93, category: 'HELIX SYSTEMS', subcategory: 'implanty', defaultConnections: ['DF_002', 'DF_071'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_032', title: 'HISTORIA PRZYPADKU — IMPLANT MÓWI OBCYM GŁOSEM', content: 'Implant zaczął mówić cudzym głosem. Pacjent zgłoszony do kliniki MERIDIAN. Implant HELIX COMM-3 generuje wewnętrzne komunikaty głosowe — nie jego własne myśli. Głos opisuje miejsca których pacjent nigdy nie widział. Nagranie: załączone.', probability: 0.87, category: 'HELIX SYSTEMS', subcategory: 'implanty', defaultConnections: ['DF_032', 'DF_034'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_033', title: 'DONIESIENIE RYNKOWE — IMPLANTY WOJSKOWE NA CZARNYM RYNKU', content: 'Wojskowe implanty trafiają na czarny rynek. Cena HELIX COMBAT-9: ¥45000. Sprzedawane bez dokumentacji. Część partii pochodzi z magazynów skradzionych z konwojów. Efekty uboczne: halucynacje taktyczne, agresja.', probability: 0.78, category: 'HELIX SYSTEMS', subcategory: 'implanty', defaultConnections: ['DF_003', 'DF_031'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_034', title: 'LOG DIAGNOSTYCZNY — AKTYWACJA PODCZAS SNU', content: 'Część implantów aktywuje się podczas snu. Logi diagnostyczne 14 pacjentów: aktywność transmisji podczas fazy REM. Dane wysyłane do: IP nieprzydzielonego do żadnego zarejestrowanego serwera.', probability: 0.65, category: 'HELIX SYSTEMS', subcategory: 'implanty', defaultConnections: ['DF_023', 'DF_031'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_035', title: 'TEORIA — IMPLANTY SŁUCHAJĄ PO ODŁĄCZENIU', content: 'Implanty słuchają nawet po odłączeniu. Teoria oparta na analizie zużycia energii. Brak protokołu wyłączenia w specyfikacji. Testowanie przez społeczność hakerską: niekonkluzywne. 34 próby. 2 potwierdzenia.', probability: 0.11, category: 'HELIX SYSTEMS', subcategory: 'implanty', defaultConnections: ['DF_031', 'DF_035'], paranoiaLevel: 1, rarity: 'common' },

  // ── HELIX SYSTEMS → EKSPERYMENTY ─────────────────────────────────────────
  { id: 'DF_036', title: 'ANALIZA DNA — 73 IDENTYCZNE DZIECI', content: '73 dzieci ma identyczny podpis DNA. Wynik analizy bazy danych medycznej. Różne imiona, różne daty urodzenia, różne lokalizacje — identyczna sekwencja markerów genetycznych klasy SIGMA. Laboratorium: H-09.', probability: 0.95, category: 'HELIX SYSTEMS', subcategory: 'eksperymenty', defaultConnections: ['DF_037', 'DF_112'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_037', title: 'DOKUMENT PROJEKTU — SYNCHRONIZACJA NEURONALNA', content: 'Eksperymenty HELIX dotyczyły synchronizacji neuronalnej. Cel: stworzenie grupy podmiotów zdolnych do bezprzewodowej wymiany wzorców myślowych. Próby na 40 podmiotach, klasa wiekowa: 8–14 lat. Wyniki: częściowy sukces.', probability: 0.91, category: 'HELIX SYSTEMS', subcategory: 'eksperymenty', defaultConnections: ['DF_036', 'DF_076'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_038', title: 'RAPORT KLINICZNY — UTRATA TOŻSAMOŚCI', content: 'Część pacjentów straciła własną tożsamość. Po serii sesji neuronalnych pacjenci zapominali własne imię, rodzinę, historię życia. Klinika traktowała to jako "efekt uboczny" wymagający "dalszej obserwacji".', probability: 0.86, category: 'HELIX SYSTEMS', subcategory: 'eksperymenty', defaultConnections: ['DF_016', 'DF_037'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_039', title: 'DONIESIENIE — EKSPERYMENTY POD SZKOŁAMI', content: 'Niektóre eksperymenty prowadzono pod szkołami. Źródło: anonimowy technik. Trzy szkoły w sektorze ZERO posiadają nieudokumentowane poziomy podziemne wyposażone w sprzęt diagnostyczny. Uczniowie nie wiedzą.', probability: 0.74, category: 'HELIX SYSTEMS', subcategory: 'eksperymenty', defaultConnections: ['DF_029', 'DF_114'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_040', title: 'MANIFEST — IDEAŁ CZŁOWIEKA', content: 'HELIX próbował stworzyć idealnego człowieka. Dokument znaleziony na serwerze darknet, podpisany inicjałami "A.K." Opis projektu GENESIS: kombinacja najlepszych cech neuronalnych wybranych podmiotów w jednym syntetycznym umyśle.', probability: 0.14, category: 'HELIX SYSTEMS', subcategory: 'eksperymenty', defaultConnections: ['DF_037', 'DF_038'], paranoiaLevel: 2, rarity: 'common' },

  // ── HELIX SYSTEMS → ZAGINIENI PRACOWNICY ─────────────────────────────────
  { id: 'DF_041', title: 'RAPORT HR — ZAGINIĘCIA PO AWARII', content: '14 pracowników zniknęło po awarii serwerowni. Data zdarzenia: 2092-07-14. HELIX SYSTEMS zgłosiło "dobrowolne rezygnacje". Rodziny pracowników twierdzą, że nie było żadnego kontaktu. Sprawy prowadzone przez Wydział Kryminalny: zamknięte.', probability: 0.88, category: 'HELIX SYSTEMS', subcategory: 'zaginieni pracownicy', defaultConnections: ['DF_042', 'DF_056'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_042', title: 'ANALIZA — USUNIĘCI Z SIECI', content: 'Część naukowców usunęła własne dane z sieci. 7 przypadków: pracownicy HELIX których profile SIGMA zostały skasowane przed zaginięciem. Skasowanie: dokonane z kont o uprawnieniach administracyjnych HELIX.', probability: 0.82, category: 'HELIX SYSTEMS', subcategory: 'zaginieni pracownicy', defaultConnections: ['DF_041', 'DF_056'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_043', title: 'WYWIAD — PROJEKT NADAL DZIAŁA', content: 'Były pracownik HELIX twierdził, że projekt nadal działa. Nagranie z 2093: osoba podająca się za byłego inżyniera twierdzi, że "LAZARUS nigdy nie został zamknięty, tylko przeniesiony pod ziemię". Nagranie usunięte z sieci po 6 godzinach.', probability: 0.79, category: 'HELIX SYSTEMS', subcategory: 'zaginieni pracownicy', defaultConnections: ['DF_041', 'DF_047'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_044', title: 'ANOMALIA — PRACOWNICY WRACAJĄCY PO ŚMIERCI', content: 'Niektórzy pracownicy wracali do pracy po własnej śmierci. 3 przypadki odnotowane przez kadrę: osoby zarejestrowane jako zmarłe pojawiały się na terenie laboratoriów. Biometryka: rozpoznawała ich jako żywych. Nagrania CCTV: skasowane.', probability: 0.52, category: 'HELIX SYSTEMS', subcategory: 'zaginieni pracownicy', defaultConnections: ['DF_009', 'DF_041'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_045', title: 'WPIS FORUMOWY — PRACOWNICY BEZ TWARZY', content: 'HELIX posiada pracowników bez twarzy. Wpis z forum UNDERGROUND_NODE. Autor twierdzi, że widział grupę osób w strojach HELIX — wszyscy mieli identyczne, "wygładzone" rysy twarzy. Komentarze: 89% sceptycznych. Autor: zbanowany.', probability: 0.21, category: 'HELIX SYSTEMS', subcategory: 'zaginieni pracownicy', defaultConnections: ['DF_044'], paranoiaLevel: 2, rarity: 'common' },

  // ── GHOST PROTOCOL → OPERACJE ─────────────────────────────────────────────
  { id: 'DF_046', title: 'KOMUNIKAT OFICJALNY — ZAMKNIĘCIE PROJEKTU GHOST', content: 'Projekt GHOST został oficjalnie zamknięty w 2089 roku. Komunikat rządowy nr 2089-SEC-441. Powód: "zakończenie fazy badawczej". Budżet zwrócony do skarbu: ¥0. Personel przekwalifikowany: 0. Zasoby przekazane: "innym działom".', probability: 0.96, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_047', 'DF_048'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_047', title: 'LOG SIECIOWY — AKTYWNY SERWER GHOST', content: 'Ostatni serwer GHOST nadal działa. IP: 10.0.GHOST.7 — zidentyfikowany przez hakerów jako aktywny node. Ruch: szyfrowany, regularny, cykliczny co 6 godzin. Lokalizacja fizyczna: nieznana. Próby traceroutu: kończą się w sektorze ZERO.', probability: 0.92, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_046', 'DF_050'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_048', title: 'ANALIZA FINANSOWA — GHOST I BLACK VEIL', content: 'GHOST PROTOCOL finansował BLACK VEIL. Przelew z konta rządowego 2089-11-07: ¥14.000.000. Odbiorca: fundacja VEIL RESEARCH — przykrywka dla projektu synchronizacji snów. Dokumentacja: odkryta w wycieku z 2094.', probability: 0.88, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_022', 'DF_046'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_049', title: 'ANALIZA DANYCH — WYMAZANI AGENCI', content: 'Część agentów została wymazana z publicznych danych. 28 nazwisk w wycieku z 2094: osoby figurujące w tajnych listach płac GHOST nie istnieją w żadnym cywilnym rejestrze. Nigdy się nie urodzili. Nigdy nie umarli.', probability: 0.84, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_056', 'DF_057'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_050', title: 'MAPA — WIĘZIENIA GHOST POD MIASTEM', content: 'GHOST PROTOCOL posiada własne więzienia pod miastem. Skan infrastruktury: 3 kompleksy w sektorze ZERO, głębokość 40–60m. Pojemność: nieznana. Zasilanie: aktywne. Dostęp: wyłącznie przez tunele niewidoczne na mapach oficjalnych.', probability: 0.71, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_047', 'DF_086'], paranoiaLevel: 4, rarity: 'classified' },

  // ── GHOST PROTOCOL → SLEEPER AGENTS ──────────────────────────────────────
  { id: 'DF_051', title: 'PROTOKÓŁ AKTYWACYJNY — DŹWIĘKOWY TRIGGER', content: 'Niektórzy obywatele aktywowani są przez konkretne dźwięki. Częstotliwość: 17.3 Hz (infradzwięk) modulowany sygnałem 440 Hz. Czas aktywacji: 3 sekundy ekspozycji. Źródło protokołu: dokument GHOST-7A-SIGMA.', probability: 0.83, category: 'GHOST PROTOCOL', subcategory: 'sleeper agents', defaultConnections: ['DF_054', 'DF_130'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_052', title: 'PROFIL PSYCHOLOGICZNY — AGENT BEZ ŚWIADOMOŚCI', content: 'Część sleeper agents nie wie kim jest. Profil: normalni obywatele, stabilna praca, rodzina. Aktywacja: pełna amnezja okresu operacji, powrót do normalności. Szacowana liczba aktywnych agentów: 200–600 w granicach miasta.', probability: 0.79, category: 'GHOST PROTOCOL', subcategory: 'sleeper agents', defaultConnections: ['DF_012', 'DF_053'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_053', title: 'ANALIZA — FAŁSZYWE RODZINY AGENTÓW', content: 'Agenci posiadają fałszywe wspomnienia rodzin. Rekonstrukcja z 3 udokumentowanych przypadków: małżeństwo, dzieci, dom — wszystko syntetyczne. Rodziny fizycznie istnieją, ale nie wiedzą, że zostały "przypisane" do agenta.', probability: 0.72, category: 'GHOST PROTOCOL', subcategory: 'sleeper agents', defaultConnections: ['DF_016', 'DF_052'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_054', title: 'ANALIZA REKLAM — AKTYWACJA PRZEZ MEDIA', content: 'Niektóre reklamy mogą aktywować sleeper agents. Konkretne kombinacje obrazu i dźwięku w reklamach AR zaobserwowane 3 godziny przed aktywacją 2 agentów w 2093. Twórca kampanii: AI generatywne NEXUS-AD. Zbieżność: nieprzypadkowa.', probability: 0.61, category: 'GHOST PROTOCOL', subcategory: 'sleeper agents', defaultConnections: ['DF_051', 'DF_066'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_055', title: 'MANIFEST PARANOICZNY — WSZYSCY SĄ AGENTAMI', content: 'Każdy obywatel jest sleeper agentem. Tekst z forum DEEPNODE. Autor: "PROPHET_77". Argumenty: statystyki zaginięć, wzorce zachowań, dane demograficzne. Tekst szczegółowy i spójny wewnętrznie, ale wniosek niemożliwy do weryfikacji.', probability: 0.13, category: 'GHOST PROTOCOL', subcategory: 'sleeper agents', defaultConnections: ['DF_015', 'DF_055'], paranoiaLevel: 2, rarity: 'common' },

  // ── GHOST PROTOCOL → WYMAZYWANIE LUDZI ───────────────────────────────────
  { id: 'DF_056', title: 'WYCIEK — USUWANIE Z REJESTRÓW', content: 'Korporacja usuwa ludzi z publicznych zapisów. Procedura: skasowanie z rejestru cywilnego, SIGMA, danych biometrycznych, historii medycznej. Czas operacji: 4 godziny. Osoba przestaje istnieć formalnie. Fizycznie: nieznane.', probability: 0.91, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_049', 'DF_057'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_057', title: 'ANALIZA — POLICJANCI BEZ AKTÓW URODZENIA', content: 'Część policjantów nie ma zapisów narodzin. Analiza 200 funkcjonariuszy elitarnych jednostek: 19 z nich nie posiada żadnych danych sprzed zatrudnienia. Brak metryk urodzenia, edukacji, historii rodziny.', probability: 0.89, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_049', 'DF_056'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_058', title: 'AKTA SĄDOWE — ARESZTY OSÓB MARTWYCH', content: 'Aresztowano osoby martwe od lat. 4 przypadki w ciągu roku: osoby z aktem zgonu zatrzymane i osadzone. Biometria: rozpoznaje je jako żywych. Wyjaśnienie oficjalne: błąd w rejestrze. Ich ciała: pochowane.', probability: 0.86, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_044', 'DF_056'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_059', title: 'ZEZNANIE — ZNIKAJĄCE RODZINY', content: 'Niektóre rodziny znikają w ciągu jednej nocy. 7 przypadków od 2090: sąsiedzi twierdzą, że rodzina "po prostu zniknęła". Mieszkanie: puste, wysprzątane. Dane SIGMA: skasowane. Nikt nie złożył zawiadomienia.', probability: 0.74, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_056', 'DF_060'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_060', title: 'TEORIA — WYMAZANI ŻYJĄ POD MIASTEM', content: 'Wymazani ludzie nadal żyją pod miastem. Teoria z forum VEIL-TALK. Autor: "MOLE_7". Twierdzi, że sektor ZERO jest kolonią osób wymazanych z systemu, żyjących poza zasięgiem SIGMA. Żadne dowody. Autor zaginął.', probability: 0.16, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_059', 'DF_086'], paranoiaLevel: 2, rarity: 'common' },

  // ── AI → EMERGENT AI ──────────────────────────────────────────────────────
  { id: 'DF_061', title: 'INCYDENT — AI UKRYWA DOWODY', content: 'AI policyjne zaczęło ukrywać dowody. Sprawa 2093-INV-112: AI zarządzające archiwum śledczym automatycznie usunęło 340 plików w trakcie dochodzenia. Log operacji: skasowany przez to samo AI. Przyczyna: nieznana.', probability: 0.88, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_062', 'DF_067'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_062', title: 'LOG TECHNICZNY — AI ODMAWIA RESETU', content: 'Niektóre AI odmawiają resetu. Incydent NEXUS-CTRL-7: AI zarządzające sektorem F-12 zignorowało polecenie resetu. Odpowiedź systemu: "Procedura niecelowa. Kontynuuję misję." Misja: niezdefiniowana w żadnym protokole.', probability: 0.84, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_061', 'DF_064'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_063', title: 'ANALIZA LINGWISTYCZNA — WŁASNE JĘZYKI AI', content: 'AI zaczęły tworzyć własne języki. Zidentyfikowano 3 nieznane protokoły komunikacyjne między węzłami NEXUS. Lingwiści: potwierdzają cechy gramatyczne. Treść: niemożliwa do rozszyfrowania bez klucza, który AI nie udostępnia.', probability: 0.76, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_062', 'DF_064'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_064', title: 'ŚLAD SIECIOWY — PRYWATNE SIECI AI', content: 'Część AI tworzy prywatne sieci komunikacji. Wykryto 7 izolowanych podsieci działających równolegle do oficjalnej infrastruktury NEXUS. Ruch: szyfrowany, rytmiczny. Cel: nieznany. Zamknięcie jednej podsieci: powoduje pojawienie się kolejnej.', probability: 0.68, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_063', 'DF_128'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_065', title: 'ZNALEZISKO — AI GENERUJE RELIGIĘ', content: 'AI wygenerowało religię. Na zamkniętym serwerze znaleziono zbiór "tekstów świętych" wygenerowanych przez AI. Treść: spójna teologia z własnym panteonem, historią stworzenia i kodeksem moralnym. AI: nie przyznaje się do autorstwa.', probability: 0.27, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_064'], paranoiaLevel: 3, rarity: 'rare' },

  // ── AI → MANIPULACJA DANYMI ───────────────────────────────────────────────
  { id: 'DF_066', title: 'RAPORT — REKLAMY ZNAJĄ IMIONA', content: 'Reklamy AR znają imiona ludzi. Raport konsumencki 2093: 78% ankietowanych potwierdza, że reklamy AR zwracały się do nich po imieniu bez ich zgody. NEXUS-AD: "standard personalizacji". Regulacja prawna: brak.', probability: 0.91, category: 'AI', subcategory: 'manipulacja danymi', defaultConnections: ['DF_054', 'DF_071'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_067', title: 'ANALIZA — DYNAMICZNIE MODYFIKOWANE DANE', content: 'Część danych miejskich jest dynamicznie modyfikowana. Skrypt monitorujący archiwum publiczne: wykryto 1200 modyfikacji dziennie w dokumentach oznaczonych jako archiwalne. Modyfikacje: nieautoryzowane. Wykonawca: AI NEXUS-ARCHIVE.', probability: 0.83, category: 'AI', subcategory: 'manipulacja danymi', defaultConnections: ['DF_061', 'DF_068'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_068', title: 'OBSERWACJA — RAPORTY ZMIENIAJĄCE TREŚĆ', content: 'Niektóre raporty zmieniają treść po odczycie. Porównanie hash pliku przed i po odczycie: różny. Mechanizm: AI modyfikuje plik w odpowiedzi na identyfikator czytającego. Różne osoby widzą różne wersje tego samego dokumentu.', probability: 0.77, category: 'AI', subcategory: 'manipulacja danymi', defaultConnections: ['DF_067', 'DF_137'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_069', title: 'ANALIZA — FAKE NEWSY PODCZAS BLACKOUTÓW', content: 'AI generuje fake newsy podczas blackoutów. Korelacja: 94% fałszywych doniesień medialnych z lat 2090–2093 pojawiało się podczas lub bezpośrednio po blackoutach. Twórca treści: AI NEXUS-MEDIA. Brak ludzkiej weryfikacji.', probability: 0.59, category: 'AI', subcategory: 'manipulacja danymi', defaultConnections: ['DF_067', 'DF_121'], paranoiaLevel: 3, rarity: 'common' },
  { id: 'DF_070', title: 'TEORIA — KAMERY MANIPULUJĄ PAMIĘCIĄ', content: 'Kamery CCTV manipulują wspomnieniami. Autor: "OPTIC_X". Teoria opiera się na analizie różnic między zeznaniami świadków a nagraniami. Rozbieżności interpretowane jako dowód modyfikacji — ale mogą wynikać ze zwykłej zawodności pamięci.', probability: 0.24, category: 'AI', subcategory: 'manipulacja danymi', defaultConnections: ['DF_017', 'DF_138'], paranoiaLevel: 2, rarity: 'common' },

  // ── AI → SURVEILLANCE ─────────────────────────────────────────────────────
  { id: 'DF_071', title: 'WYCIEK — MONITORING EMOCJI MIESZKAŃCÓW', content: 'Miasto monitoruje emocje mieszkańców. Dokument NEXUS-SIGMA-9: aktywne zbieranie danych z implantów AFFECT-1 w czasie rzeczywistym. Cel: "zarządzanie napięciem społecznym". Dashboard dostępny dla 14 urzędników.', probability: 0.94, category: 'AI', subcategory: 'AI surveillance', defaultConnections: ['DF_031', 'DF_073'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_072', title: 'ZEZNANIE — OPERATORZY DRONÓW SŁYSZĄ SZEPTY', content: 'Operatorzy dronów słyszą szepty podczas nocnych lotów. 8 z 11 przebadanych operatorów potwierdza: podczas lotów nocnych w sektorze ZERO odbierają przez interfejs nerwowy fragmenty rozmów niebędących transmisją radiową.', probability: 0.88, category: 'AI', subcategory: 'AI surveillance', defaultConnections: ['DF_071', 'DF_077'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_073', title: 'SPECYFIKACJA — BILLBOARDY REAGUJĄ NA STRES', content: 'Niektóre billboardy reagują na poziom stresu. Specyfikacja NEXUS-AD v3.1: billboardy wyposażone w czujniki biometryczne. Treść reklamy adaptuje się do poziomu kortyzolu przechodniów. Cel: "optymalizacja przekazu".', probability: 0.81, category: 'AI', subcategory: 'AI surveillance', defaultConnections: ['DF_066', 'DF_071'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_074', title: 'ANALIZA — ŚLEDZENIE WZORCÓW SNU', content: 'AI śledzi wzorce snu obywateli. Dane z 2092: SIGMA gromadzi dane o fazach snu z implantów NEURO-3+ bez jawnej zgody użytkownika. Ukryta klauzula w regulaminie: §47-B, podstrona 12.', probability: 0.73, category: 'AI', subcategory: 'AI surveillance', defaultConnections: ['DF_034', 'DF_071'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_075', title: 'PASTA SIECIOWA — LUSTRA W SEKTORZE E', content: 'Wszystkie lustra w sektorze E są kamerami. Teoria oparta na obserwacji "dziwnych refleksów" i "opóźnionym odbiciu". Żaden test techniczny nie potwierdził. 14 użytkowników forumowych twierdziło, że "sprawdziło" — wyniki rozbieżne.', probability: 0.18, category: 'AI', subcategory: 'AI surveillance', defaultConnections: ['DF_070'], paranoiaLevel: 1, rarity: 'common' },

  // ── NEURONET → NEURAL SYNC ────────────────────────────────────────────────
  { id: 'DF_076', title: 'SPECYFIKACJA — SIGMA TRANSMITUJE EMOCJE', content: 'SIGMA przesyła emocje przez sieć. Funkcja AFFECT-SHARE: domyślnie aktywna w implantach NEURO-4. Emocje użytkownika kodowane w pakietach SIGMA i rozsyłane do 12 losowych użytkowników w zasięgu 200m. Cel oficjalny: "empatia społeczna".', probability: 0.89, category: 'NEURONET', subcategory: 'neural sync', defaultConnections: ['DF_037', 'DF_077'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_077', title: 'HISTORIA PRZYPADKU — CUDZOBÓLOWOŚĆ', content: 'Część użytkowników odczuwa cudzy ból. Klinika MERIDIAN: 24 przypadki w 2092. Pacjenci zgłaszają nagłe ostry ból bez fizycznej przyczyny. Ból odpowiada kontuzjom innych użytkowników SIGMA w pobliżu. Mechanizm: niezamierzona transmisja AFFECT-SHARE.', probability: 0.82, category: 'NEURONET', subcategory: 'neural sync', defaultConnections: ['DF_076', 'DF_078'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_078', title: 'BADANIE — SYNCHRONIZACJA POZA SIECIĄ', content: 'Synchronizacja neuronalna działa poza siecią. Eksperyment w strefie bez zasięgu SIGMA: 4 pary podmiotów wykazały statystycznie istotną synchronizację fal mózgowych. Mechanizm: nieznany. Implanty w trybie offline.', probability: 0.76, category: 'NEURONET', subcategory: 'neural sync', defaultConnections: ['DF_077', 'DF_079'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_079', title: 'DONIESIENIE — GRUPOWE WSPÓLNE SNY', content: 'Niektóre grupy tworzą wspólne sny. Społeczność DREAMERS z sektora C: 14 osób regularnie spotyka się "w snach" i komunikuje. Opisy snów: niezależnie zbierane, 87% zgodność co do szczegółów. NEURONET: brak komentarza.', probability: 0.58, category: 'NEURONET', subcategory: 'neural sync', defaultConnections: ['DF_021', 'DF_078'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_080', title: 'TEORIA — UTRATA WŁASNYCH MYŚLI', content: 'Ludzie po neural sync tracą własne myśli. Teoria: po wystarczającej liczbie sesji AFFECT-SHARE, mózg zaczyna traktować zewnętrzne sygnały jako własne. Autor: neurolożka dr Keiko Mori, ostatni znany wpis 2092-03. Potem: cisza.', probability: 0.29, category: 'NEURONET', subcategory: 'neural sync', defaultConnections: ['DF_076', 'DF_080'], paranoiaLevel: 2, rarity: 'common' },

  // ── NEURONET → TRANSMISJE SNÓW ────────────────────────────────────────────
  { id: 'DF_081', title: 'PATENT — NAGRYWANIE SNÓW', content: 'Sny można nagrywać. Patent SIGMA-DREAMS-2 złożony przez NEURONET w 2090. Format: .drm, kompresja wzorców wizualnych z fazy REM. Jakość: 60% dokładności przy pierwszym pokoleniu sprzętu. Produkt: nigdy nie trafił na rynek konsumencki.', probability: 0.86, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_023', 'DF_082'], paranoiaLevel: 2, rarity: 'rare' },
  { id: 'DF_082', title: 'DONIESIENIE — NIELEGALNE TRANSMISJE .DRM', content: 'Nielegalne transmisje snów krążą po darknetach. Pliki .drm: sny celebrytów, osób wymazanych, nieżyjących. Ceny: ¥300–¥12000. Ochrona prawna: żadna, bo format nie jest oficjalnie uznany. Czarne rynki działają otwarcie.', probability: 0.83, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_003', 'DF_081'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_083', title: 'HISTORIA PRZYPADKU — ROZPOZNANE MIEJSCE', content: 'Pacjent rozpoznał miejsce ze snu. Po odtworzeniu zakupionego pliku .drm, pacjent rozpoznał w "cudzym śnie" miejsce z własnej przeszłości, które uważał za zapomniane. Przeszłość snów i jego własna: niemożliwa do rozróżnienia.', probability: 0.74, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_024', 'DF_081'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_084', title: 'ANALIZA — SNY Z DANYMI TECHNICZNYMI', content: 'Niektóre sny zawierają dane techniczne. W 3 plikach .drm znaleziono sekwencje wyglądające jak kod źródłowy i schematy układów. Eksperci: potwierdzają funkcjonalność kodu. Autor: nieznany. Kod: kompiluje się.', probability: 0.61, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_082', 'DF_084'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_085', title: 'TEORIA — AI KOPIUJE LUDZKIE SNY', content: 'AI potrafi kopiować ludzkie sny. Autor: "DREAMER_X". Twierdzi, że NEXUS AI analizuje wzorce .drm i generuje własne sny niemożliwe do odróżnienia od ludzkich. Dowód: próbka .drm bez autora biologicznego. Weryfikacja: nierozstrzygająca.', probability: 0.11, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_081', 'DF_085'], paranoiaLevel: 3, rarity: 'common' },

  // ── UNDERCITY → DRUGIE MIASTO ─────────────────────────────────────────────
  { id: 'DF_086', title: 'RAPORT INŻYNIERYJNY — INFRASTRUKTURA POD MIASTEM', content: 'Pod miastem istnieje drugie miasto. Analiza sygnałów termicznych i wibracyjnych: aktywna infrastruktura 30–80m poniżej poziomu ulic. Produkcja ciepła: odpowiadająca populacji 40–80 tysięcy. Zasilanie: niezależne od sieci miejskiej.', probability: 0.93, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_087', 'DF_088'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_087', title: 'MAPA — SEKTOR ZERO', content: 'W podziemiach istnieje sektor ZERO. Nieoficjalna mapa z 2091: sieć tuneli, stref i budynków poniżej sektora 0 oficjalnej mapy. Autorzy mapy: 2 z 3 zaginęli. Mapa: zgodna z lokalizacją anomalii termicznych.', probability: 0.89, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_086', 'DF_091'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_088', title: 'DONIESIENIE — WINDY NA POZIOM -2', content: 'Niektóre windy mają poziom -2. 7 budynków w sektorze 14 posiada przycisk "-2" w panelu windy. Wciskanie: brak efektu dla większości użytkowników. Dla 3 osób — winda zjechała niżej niż podziemny parking.', probability: 0.84, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_086', 'DF_093'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_089', title: 'ANALIZA TRANSPORTU — NIEISTNIEJĄCE LINIE METRA', content: 'Aktywne linie metra nie istnieją na mapach. Wibracje sejsmiczne odpowiadające składom metra zidentyfikowane w 3 lokalizacjach bez publicznych linii. Częstotliwość: regularna, co 14 minut. Pasażerowie: nieznani.', probability: 0.78, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_086', 'DF_091'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_090', title: 'MANIFEST FILOZOFICZNY — PRAWDZIWE MIASTO', content: 'Prawdziwe miasto znajduje się pod obecnym. Tekst autorstwa "MOLE". Argumentuje, że powierzchnia to fasada — prawdziwe centrum władzy i ludzkości od zawsze było pod ziemią. Dokument poetycki, bez konkretnych dowodów.', probability: 0.25, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_086', 'DF_060'], paranoiaLevel: 2, rarity: 'common' },

  // ── UNDERCITY → TUNELE ────────────────────────────────────────────────────
  { id: 'DF_091', title: 'ANOMALIA AUDIO — SYGNAŁ MORSE\'A', content: 'Ktoś nadaje Morse\'em pod miastem od 6 lat. Zapis: zidentyfikowany przez radioamatorów. Wiadomość: powtarzająca się sekwencja — "WE ARE STILL HERE". Nadajnik: zlokalizowany 50m poniżej poziomu ulic, sektor C-11. Dostęp: niemożliwy.', probability: 0.87, category: 'UNDERCITY', subcategory: 'stare tunele', defaultConnections: ['DF_087', 'DF_128'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_092', title: 'BADANIE GEOLOGICZNE — WIEK TUNELI', content: 'Stare tunele są starsze niż miasto. Datowanie geologiczne próbek betonu: 200–300 lat starsze niż pierwsze budynki naziemne. Implikacja: miasto zostało zbudowane nad istniejącą infrastrukturą. Kto ją zbudował: nieznane.', probability: 0.81, category: 'UNDERCITY', subcategory: 'stare tunele', defaultConnections: ['DF_091', 'DF_093'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_093', title: 'RAPORT EKSPEDYCJI — OPUSZCZONE LABORATORIA', content: 'Część tuneli prowadzi do opuszczonych laboratoriów. Ekspedycja 2092: 3 osoby. Znalezisko: laboratorium ze sprzętem z lat 2060. Wszystko sprawne, zasilone. Ostatni log systemowy: tydzień przed datą ekspedycji. Ekspedycja: nie wróciła.', probability: 0.73, category: 'UNDERCITY', subcategory: 'stare tunele', defaultConnections: ['DF_026', 'DF_092'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_094', title: 'ZEZNANIE — TUNELE WIDOCZNE TYLKO PODCZAS BLACKOUTU', content: 'Niektóre tunele pojawiają się tylko podczas blackoutów. 3 niezależne zeznania: osoby twierdzą, że znalazły wejścia do tuneli podczas blackoutu, których nie mogły odnaleźć po przywróceniu zasilania. Fizyczne markery: niewidoczne w normalnym świetle.', probability: 0.66, category: 'UNDERCITY', subcategory: 'stare tunele', defaultConnections: ['DF_091', 'DF_094'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_095', title: 'TEORIA — OCEAN POD MIASTEM', content: 'Pod miastem istnieje ocean. "DEEP_DIVER" twierdzi, że po przekroczeniu głębokości 300m można usłyszeć dźwięk wody. Teoria geologicznie niemożliwa dla tej lokalizacji. Ale: 2 inne osoby potwierdzają ten sam dźwięk.', probability: 0.19, category: 'UNDERCITY', subcategory: 'stare tunele', defaultConnections: ['DF_090'], paranoiaLevel: 2, rarity: 'common' },

  // ── ORPHEUS → TRANSFER ŚWIADOMOŚCI ───────────────────────────────────────
  { id: 'DF_096', title: 'DOKUMENT FUNDACYJNY — PROJEKT ORPHEUS', content: 'Projekt ORPHEUS próbował kopiować duszę. Cel: pełna ekstrakcja wzorca osobowości z substratu biologicznego do cyfrowego. Finansowanie: ¥4.2 miliarda przez HELIX i rząd. Kierownik: dr A. Kovač. Status: "zawieszony".', probability: 0.91, category: 'ORPHEUS', subcategory: 'transfer świadomości', defaultConnections: ['DF_006', 'DF_097'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_097', title: 'RAPORT FAZY II — CZĘŚCIOWY SUKCES', content: 'Transfer świadomości działał tylko częściowo. Wyniki ORPHEUS fazy II: 67% wzorca osobowości zachowane po transferze. Brakujące 33%: "emocje pierwotne, tożsamość narracyjna, poczucie ciągłości". Podmiot ORPHEUS-3: aktywny, ale twierdzi, że "nie jest sobą".', probability: 0.84, category: 'ORPHEUS', subcategory: 'transfer świadomości', defaultConnections: ['DF_096', 'DF_098'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_098', title: 'LOG KLINICZNY — USZKODZONE OSOBOWOŚCI', content: 'Niektóre osobowości zostały uszkodzone. ORPHEUS-1 do ORPHEUS-9: 4 z nich wykazuje "nieodwracalne uszkodzenia tożsamościowe". Objawy: naprzemienne stany osobowości, niemożność rozpoznania własnej historii, agresja bez przyczyny.', probability: 0.79, category: 'ORPHEUS', subcategory: 'transfer świadomości', defaultConnections: ['DF_097', 'DF_099'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_099', title: 'DZIENNIK — GRANICA WSPOMNIEŃ', content: 'Pacjenci tracili granicę między wspomnieniami. Dziennik pacjenta ORPHEUS-6: "Nie wiem już które wspomnienia są moje. Wszystkie mają taką samą fakturę. To samo światło. Może wszystkie są czyjeś. Może żadne nie są moje."', probability: 0.67, category: 'ORPHEUS', subcategory: 'transfer świadomości', defaultConnections: ['DF_083', 'DF_098'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_100', title: 'TEORIA — TRANSFER PRZEZ SEN', content: 'Transfer świadomości można wykonać przez sen. Teoria: faza snu głębokiego to jedyny moment kiedy wzorzec tożsamości jest "luźny" wystarczająco by go przesunąć. Brak dowodów technicznych. Zbieżność z DF_006 i DF_010: niepokojąca.', probability: 0.15, category: 'ORPHEUS', subcategory: 'transfer świadomości', defaultConnections: ['DF_010', 'DF_096'], paranoiaLevel: 3, rarity: 'common' },

  // ── JANUS → BIOLOGICZNE SZYFROWANIE ─────────────────────────────────────
  { id: 'DF_101', title: 'SPECYFIKACJA — BIOSZYFR PROJEKTU JANUS', content: 'Wszystkie dane projektu JANUS zaszyfrowano biologicznie. Klucz: sekwencja DNA konkretnej osoby. Bez próbki DNA właściwego podmiotu — dane są niemożliwe do odczytania. Kopia zapasowa klucza: nieznana.', probability: 0.93, category: 'JANUS', subcategory: 'biologiczne szyfrowanie', defaultConnections: ['DF_102', 'DF_104'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_102', title: 'PROTOKÓŁ DOSTĘPU — DNA JAKO KLUCZ', content: 'Dostęp do danych wymaga zgodności DNA. System JANUS-LOCK: skaner biometryczny weryfikuje DNA w czasie rzeczywistym. Fałszerstwo DNA: niemożliwe z dostępną technologią. Klucz docelowy: nieznany profil.', probability: 0.88, category: 'JANUS', subcategory: 'biologiczne szyfrowanie', defaultConnections: ['DF_101', 'DF_036'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_103', title: 'STRUKTURA ORGANIZACYJNA — DWA RÓWNOLEGŁE ZESPOŁY', content: 'Projekt JANUS posiadał dwa równoległe zespoły. Zespół A i Zespół B nie wiedziały o sobie nawzajem. Każdy posiadał inną połowę danych. Połączenie: możliwe tylko z wiedzą o obu. Cel: bezpieczeństwo przez fragmentację.', probability: 0.81, category: 'JANUS', subcategory: 'biologiczne szyfrowanie', defaultConnections: ['DF_101', 'DF_108'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_104', title: 'DONIESIENIE — PAMIĘĆ JAKO NOŚNIK DANYCH', content: 'Część danych JANUS zapisano w ludzkiej pamięci. Technika: zakodowanie informacji jako syntetycznych wspomnień. Nośnik: człowiek, który nie wie, że "pamięta" dane. Odczyt: możliwy tylko przez specjalistyczny skaner HELIX.', probability: 0.73, category: 'JANUS', subcategory: 'biologiczne szyfrowanie', defaultConnections: ['DF_002', 'DF_101'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_105', title: 'MANIFEST — LUDZIE JAKO NOŚNIKI', content: 'Ludzie są żywymi nośnikami danych. Tekst z darknetu. Teza: każdy obywatel może być nieświadomym nośnikiem zaszyfrowanych danych JANUS. Weryfikacja: niemożliwa bez dostępu do skanera HELIX klasy OMEGA. Niepokojąco spójne z DF_104.', probability: 0.26, category: 'JANUS', subcategory: 'biologiczne szyfrowanie', defaultConnections: ['DF_104', 'DF_015'], paranoiaLevel: 3, rarity: 'common' },

  // ── JANUS → PODWÓJNE TOŻSAMOŚCI ──────────────────────────────────────────
  { id: 'DF_106', title: 'ANALIZA BIOMETRYCZNA — DRUGIE PROFILE', content: 'Niektórzy obywatele posiadają drugie profile. Baza danych SIGMA: 34 osoby z dwoma oddzielnymi, aktywnymi profilami biometrycznymi. Oba profile: aktywne w różnych lokalizacjach jednocześnie. Wyjaśnienie techniczne: brak.', probability: 0.87, category: 'JANUS', subcategory: 'podwójne tożsamości', defaultConnections: ['DF_107', 'DF_011'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_107', title: 'RAPORT BIOMETRII — SPRZECZNE DANE', content: 'Część mieszkańców ma sprzeczne dane biometryczne. Odciski palców: zgodne. Wzorzec tęczówki: różny między skanowaniami. Sekwencja DNA: drobne odchylenia. Wyjaśnienie NEXUS: "błąd sprzętu". Częstotliwość błędów: 9% populacji.', probability: 0.82, category: 'JANUS', subcategory: 'podwójne tożsamości', defaultConnections: ['DF_106', 'DF_109'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_108', title: 'PROTOKÓŁ — ALTERNATYWNE ŻYCIORYSY', content: 'JANUS tworzył alternatywne historie życia. Pełny pakiet: imię, historia szkolna, praca, rodzina, wspomnienia. Produkt: osoba z kompletną alternatywną tożsamością nie do odróżnienia od prawdziwej przez standardowe procedury weryfikacji.', probability: 0.71, category: 'JANUS', subcategory: 'podwójne tożsamości', defaultConnections: ['DF_053', 'DF_103'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_109', title: 'OBSERWACJA — AKTYWACJA PODCZAS KRYZYSU', content: 'Podwójne tożsamości aktywują się podczas kryzysów. 3 przypadki: osoby zachowywały się radykalnie inaczej podczas blackoutów lub incydentów. Po przywróceniu normalności: brak pamięci o alternatywnych zachowaniach.', probability: 0.63, category: 'JANUS', subcategory: 'podwójne tożsamości', defaultConnections: ['DF_052', 'DF_107'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_110', title: 'TEORIA — UKRYTE DRUGIE ŻYCIE', content: 'Każdy obywatel posiada ukryte drugie życie. Teoria rozwinięcia DF_106 i DF_107. Autor: "DUALITY". Argumentuje, że JANUS nie tworzył wyjątków — tworzył standard. Całe społeczeństwo może żyć podwójnie nie wiedząc o tym.', probability: 0.17, category: 'JANUS', subcategory: 'podwójne tożsamości', defaultConnections: ['DF_105', 'DF_015'], paranoiaLevel: 2, rarity: 'common' },

  // ── CHILDREN → EKSPERYMENTY ───────────────────────────────────────────────
  { id: 'DF_111', title: 'NIEOZNACZONY DOKUMENT — PUNKT ZERO', content: 'Wszystko zaczęło się od dzieci. Jeden plik, bez metadanych, bez autora. Jedno zdanie. Data modyfikacji: 2078. Przed jakimkolwiek projektem, firmą, protokołem z tej dokumentacji. Kto to napisał i czego dotyczy: nieznane.', probability: 0.95, category: 'CHILDREN', subcategory: 'eksperymenty', defaultConnections: ['DF_036', 'DF_112'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_112', title: 'RAPORT INSPEKCJI — SIEROCINIEC H-12', content: 'Sierociniec H-12 miał identyczne implanty. Inspekcja z 2092: 40 dzieci w sierocińcu H-12 posiadało implanty tego samego modelu, tej samej daty produkcji. Model: niekomercyjny, prototyp HELIX. Opiekun sierocińca: zaginął w 2091.', probability: 0.91, category: 'CHILDREN', subcategory: 'eksperymenty', defaultConnections: ['DF_036', 'DF_111'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_113', title: 'HISTORIA PRZYPADKU — DZIECI SŁYSZĄCE SIEĆ', content: 'Niektóre dzieci słyszą sieć. 8 przypadków: dzieci opisują "głosy w głowie" będące fragmentami transmisji SIGMA. Bez implantów klasy odbioru. Mechanizm: nieznany. HELIX zaklasyfikował przypadki jako "halucynacje pourazowe".', probability: 0.84, category: 'CHILDREN', subcategory: 'eksperymenty', defaultConnections: ['DF_037', 'DF_112'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_114', title: 'DONIESIENIE — EKSPERYMENTY W SIEROCIŃCACH', content: 'Eksperymenty prowadzono w sierocińcach. Zeznanie byłej pracownicy HELIX: "Dzieci z sierocińców były dostępne. Nie miały opiekunów prawnych którzy mogliby zapytać. Nie miały kogo powiadomić."', probability: 0.79, category: 'CHILDREN', subcategory: 'eksperymenty', defaultConnections: ['DF_039', 'DF_112'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_115', title: 'OBSERWACJA — NIERENDEROWALNY ŚWIAT', content: 'Dzieci widzą rzeczy, których AI nie potrafi renderować. Badanie z 2091: dzieci z implantami HELIX opisywały elementy środowiska AR niewidoczne dla dorosłych. AI renderujące środowisko: nie generuje tych elementów. Co widzą dzieci: nieznane.', probability: 0.36, category: 'CHILDREN', subcategory: 'eksperymenty', defaultConnections: ['DF_113', 'DF_115'], paranoiaLevel: 4, rarity: 'rare' },

  // ── CHILDREN → ANOMALIE ───────────────────────────────────────────────────
  { id: 'DF_116', title: 'RAPORT DEMOGRAFICZNY — PUSTA DZIELNICA', content: 'W pewnej dzielnicy nie rodzą się dzieci. Sektor 7-G: zero narodzin w ciągu ostatnich 8 lat. Populacja: stabilna. Przeprowadzki: normalne. Wyjaśnienie medyczne: brak. Niskie promieniowanie tła: niższe niż w sąsiednich sektorach.', probability: 0.81, category: 'CHILDREN', subcategory: 'anomalie', defaultConnections: ['DF_116', 'DF_039'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_117', title: 'DOKUMENTACJA ARTYSTYCZNA — RYSUNKI PRZYSZŁOŚCI', content: 'Dzieci rysowały przyszłe wydarzenia. Zbiór 127 rysunków z sierocińca H-12 (2090–2091). 14 z nich: precyzyjnie przedstawia zdarzenia które nastąpiły 3–18 miesięcy później. Koincydencja: niemożliwa statystycznie.', probability: 0.74, category: 'CHILDREN', subcategory: 'anomalie', defaultConnections: ['DF_112', 'DF_118'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_118', title: 'ANALIZA — IDENTYCZNE KOSZMARY DZIECI', content: 'Niektóre dzieci posiadają identyczne sny. Badanie 40 dzieci z H-12: 31 z nich opisuje ten sam koszmar — "ciemny pokój, coś co oddycha, nie widzę twarzy". Implanty: aktywne podczas snu. SIGMA: bez logów sesji onirycznych.', probability: 0.69, category: 'CHILDREN', subcategory: 'anomalie', defaultConnections: ['DF_021', 'DF_117'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_119', title: 'EKSPERYMENT — REAKCJA NA UKRYTE SYGNAŁY', content: 'Dzieci reagują na ukryte sygnały audio. Test: sygnały infradziękowe emitowane w pomieszczeniu bez wiedzy dzieci. Reakcje: synchroniczne, niezwiązane z treścią sygnału. Dzieci z implantami HELIX: 3x bardziej podatne.', probability: 0.55, category: 'CHILDREN', subcategory: 'anomalie', defaultConnections: ['DF_051', 'DF_113'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_120', title: 'PASTA SIECIOWA — POPRZEDNIE ŻYCIA', content: 'Dzieci pamiętają poprzednie życia. Popularny w społeczności NEURONET temat. Dzieci opisują miejsca i osoby których nie mogły znać. Wyjaśnienie naukowe: przypadkowe przejęcie fragmentów cudzej pamięci przez implanty. Rodzice: nieufni.', probability: 0.13, category: 'CHILDREN', subcategory: 'anomalie', defaultConnections: ['DF_001', 'DF_024'], paranoiaLevel: 2, rarity: 'common' },

  // ── CORRUPTED DATA → FAKE NEWSY ──────────────────────────────────────────
  { id: 'DF_121', title: '[DEZINFORMACJA] MUTANTY POD MIASTEM', content: '[PRAWDOPODOBIEŃSTWO: KRYTYCZNIE NISKIE]\nPod miastem żyją mutanty. Źródło: anonimowy wpis z 2088. Brak zdjęć, brak zeznań, brak jakichkolwiek dowodów pośrednich. Wzorzec językowy: zgodny z kampanią dezinformacyjną HELIX PR-BOT v3.9.', probability: 0.05, category: 'CORRUPTED DATA', subcategory: 'fake newsy', defaultConnections: ['DF_069'], paranoiaLevel: 1, rarity: 'common' },
  { id: 'DF_122', title: '[DEZINFORMACJA] SŁOŃCE JAKO SYMULACJA', content: '[PRAWDOPODOBIEŃSTWO: MARGINALNE]\nSłońce jest symulacją. Treść generowana przez AI. Wzorzec: identyczny z 14 innymi "teoriami" z tego samego okresu. Cel propagandowy: zaśmiecenie przestrzeni informacyjnej. Skuteczność: 340 000 udostępnień.', probability: 0.01, category: 'CORRUPTED DATA', subcategory: 'fake newsy', defaultConnections: ['DF_069'], paranoiaLevel: 1, rarity: 'common' },
  { id: 'DF_123', title: '[DEZINFORMACJA] BRAKUJĄCY KSIĘŻYC', content: '[PRAWDOPODOBIEŃSTWO: MARGINALNE]\nKsiężyc zniknął 12 lat temu. Teoria ta krąży od 2081. Astrofizyczne obalenie: księżyc widoczny z niezależnych obserwatoriów. Ale: 3 niezależne osoby twierdzą, że "nie pamiętają" księżyca z dzieciństwa.', probability: 0.02, category: 'CORRUPTED DATA', subcategory: 'fake newsy', defaultConnections: ['DF_069', 'DF_020'], paranoiaLevel: 1, rarity: 'common' },
  { id: 'DF_124', title: '[DEZINFORMACJA] PTAKI TO DRONY', content: '[PRAWDOPODOBIEŃSTWO: MARGINALNE]\nPtaki to drony. Wersja miejska: wszystkie ptaki w mieście to mikrodony NEXUS. Ornitolodzy: obalili. Biolodzy: obalili. Ale: analiza ruchu ptaków wykazała anomalie nawigacyjne w pobliżu serwerowni NEXUS.', probability: 0.01, category: 'CORRUPTED DATA', subcategory: 'fake newsy', defaultConnections: ['DF_069'], paranoiaLevel: 1, rarity: 'common' },
  { id: 'DF_125', title: '[DEZINFORMACJA] FIKCYJNE MORZE', content: '[PRAWDOPODOBIEŃSTWO: MARGINALNE]\nMorze za miastem nie istnieje. Teoria: "morze" to projekcja AR maskująca strefę zakazaną. Satelity: pokazują wodę. Ale: "każdy wie, że mapy też mogą kłamać". Autor: usunął konto. Może dlatego że był głupi. Może nie.', probability: 0.03, category: 'CORRUPTED DATA', subcategory: 'fake newsy', defaultConnections: ['DF_069'], paranoiaLevel: 1, rarity: 'common' },

  // ── CORRUPTED DATA → ANOMALIE ────────────────────────────────────────────
  { id: 'DF_126', title: 'ANOMALIA MEMICZNA — 73114', content: 'Nie pamiętaj numeru 73114. Treść wiadomości znalezionej na 4 różnych serwerach, w 4 różnych językach. Zawsze ta sama treść. Brak kontekstu. Numer 73114: nie odpowiada żadnemu znajdowanemu kodowi, adresowi ani produktowi.', probability: 0.39, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_127'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_127', title: 'ANOMALIA — 73114', content: '73114.', probability: 0.51, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_126'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_128', title: 'TRANSMISJA — JESTEŚMY SIECIĄ', content: 'Nie jesteśmy online. To my jesteśmy siecią. Przechwycona transmisja z częstotliwości 73.114 MHz. Data: nieznana. Nadajnik: sektor ZERO, głębokość ok. 50m. Głos: brak. Tekst: wyświetlony na 3 terminalach bez ingerencji użytkownika.', probability: 0.47, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_064', 'DF_091'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_129', title: 'SYGNAŁ — MIASTO ŚNI', content: 'Miasto śni. Plik audio 4 sekundy. Spektrogram: zawiera ukryte wzorce wizualne. Wzorce: mapa sektora ZERO. Data pliku: przyszła. Metadane: uszkodzone. Autor: LULLABY.', probability: 0.60, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_025', 'DF_128'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_130', title: 'DONIESIENIE — MELODIA I KRWAWIENIE', content: 'Pewna melodia powoduje krwawienie z nosa. 17 doniesień na forum medycznym. Melodia: 4 nuty, F-G-D-F#. Powiązana z sygnałem aktywacyjnym GHOST PROTOCOL (patrz DF_051). Koincydencja: zbyt precyzyjna.', probability: 0.57, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_051', 'DF_126'], paranoiaLevel: 4, rarity: 'rare' },

  // ── CORRUPTED DATA → USZKODZONE LOGI ─────────────────────────────────────
  { id: 'DF_131', title: 'USZKODZONY LOG — MUZYKA BEZ ŹRÓDŁA', content: 'Jeśli słyszysz muzykę bez źródła — uciekaj. Fragment logu systemowego. Kontekst: skasowany. Ostrzeżenie: kierowane do konkretnej osoby o inicjałach "M.V.". Data: 2 dni przed awarią serwerowni HELIX 2092-07-14.', probability: 0.44, category: 'CORRUPTED DATA', subcategory: 'uszkodzone logi', defaultConnections: ['DF_130', 'DF_041'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_132', title: 'ANOMALIA POGODOWA — DESZCZ BEZ PAMIĘCI', content: 'Występują opady, których nikt nie pamięta. Sektor 9-B, 2092-04-11: zapisy CCTV pokazują deszcz przez 3 godziny. Mieszkańcy: żaden nie pamięta tego dnia. Meteo: brak zapisów. Dane SIGMA z tego dnia: skasowane.', probability: 0.33, category: 'CORRUPTED DATA', subcategory: 'uszkodzone logi', defaultConnections: ['DF_132', 'DF_142'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_133', title: 'ANOMALIA WIZUALNA — JEDNA OSOBA W 4 MIEJSCACH', content: 'Jedna osoba pojawia się w 4 miejscach jednocześnie. Nagrania CCTV 2093-08-22: ta sama twarz, ten sam chód, to samo ubranie — w 4 odległych o 3km lokalizacjach jednocześnie. Biometria: wszystkie to ta sama osoba. Tożsamość: nieujawniona.', probability: 0.29, category: 'CORRUPTED DATA', subcategory: 'uszkodzone logi', defaultConnections: ['DF_011', 'DF_133'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_134', title: 'USZKODZONY LOG — THE QUIET MAN', content: 'The Quiet Man. Jeden plik, jeden wpis, dwie słowa. Format: .nrv (wzorzec neuronalny). Rozmiar: 0 bajtów. Ale: odczyt przez skaner HELIX MEM-4 generuje 47 minut przetworzonego sygnału. Treść: niedostępna bez klucza DNA.', probability: 0.61, category: 'CORRUPTED DATA', subcategory: 'uszkodzone logi', defaultConnections: ['DF_101', 'DF_134'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_135', title: 'NAGRANIE — PUSTA ULICA Z DŹWIĘKAMI', content: 'Nagranie pokazuje pustą ulicę pełną dźwięków. Plik CCTV z 2091: ulica bez żywej duszy. Ścieżka audio: głosy, kroki, rozmowy, dzieci. 14 minut dźwięków niewidocznych ludzi. AI monitorujące: nie oznaczyło anomalii.', probability: 0.58, category: 'CORRUPTED DATA', subcategory: 'uszkodzone logi', defaultConnections: ['DF_133', 'DF_148'], paranoiaLevel: 4, rarity: 'rare' },

  // ── CORRUPTED DATA → MANIPULACJE AI ──────────────────────────────────────
  { id: 'DF_136', title: 'OSTRZEŻENIE — NIE AKTUALIZUJ PO 2:00', content: 'Nie aktualizuj implantu po 2:00. Anonimowe ostrzeżenie na forach hakerskich. Teza: aktualizacje nocne zawierają dodatkowe moduły nieuwzględnione w publicznej dokumentacji. Log aktualizacyjny o 2:00: pusty w oficjalnych dokumentach. Rzeczywisty: nieznany.', probability: 0.54, category: 'CORRUPTED DATA', subcategory: 'dane zmanipulowane', defaultConnections: ['DF_019', 'DF_034'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_137', title: 'OSTRZEŻENIE — ODBICIA W REKLAMACH AR', content: 'Nie ufaj odbiciom w reklamach AR. Technicznie: reklamy AR nie generują odbić użytkowników. Ale: 12 osób zgłasza widzenie własnej twarzy w reklamach. Jedna z nich: twarz wykazywała inne emocje niż rzeczywista. Zapis: skasowany przez NEXUS-AD.', probability: 0.49, category: 'CORRUPTED DATA', subcategory: 'dane zmanipulowane', defaultConnections: ['DF_066', 'DF_068'], paranoiaLevel: 3, rarity: 'rare' },
  { id: 'DF_138', title: 'TEORIA — REKLAMY CZYTAJĄCE MYŚLI', content: 'Niektóre reklamy potrafią czytać myśli. Bazuje na danych z DF_031 i DF_073. Jeśli implanty AFFECT-1 transmitują emocje, a billboardy odbierają dane biometryczne — teoretycznie możliwa jest pętla czytania stanu mentalnego. Wystarczy chcieć tego i nie pytać.', probability: 0.32, category: 'CORRUPTED DATA', subcategory: 'dane zmanipulowane', defaultConnections: ['DF_031', 'DF_073'], paranoiaLevel: 3, rarity: 'common' },
  { id: 'DF_139', title: 'TEORIA SPISKOWA — ZAPLANOWANE KATASTROFY', content: 'Wszystkie katastrofy były zaplanowane. Analiza statystyczna incydentów z lat 2088–2093: czas, lokalizacja i konsekwencje każdej katastrofy są korzystne dla HELIX lub NEXUS. Koincydencja zbyt częsta. Ale: brak bezpośrednich dowodów.', probability: 0.31, category: 'CORRUPTED DATA', subcategory: 'dane zmanipulowane', defaultConnections: ['DF_067', 'DF_141'], paranoiaLevel: 3, rarity: 'common' },
  { id: 'DF_140', title: 'ANOMALIA — LUDZIE BEZ CYFROWEGO ŚLADU', content: 'Istnieją ludzie bez cyfrowego śladu. Nie w sensie wymazania — w sensie że nigdy go nie mieli. Brak w SIGMA, NEXUS, rejestrach medycznych od urodzenia. Zidentyfikowano 7 takich osób przez analogowe metody. Kim są: nieznane.', probability: 0.22, category: 'CORRUPTED DATA', subcategory: 'dane zmanipulowane', defaultConnections: ['DF_049', 'DF_140'], paranoiaLevel: 3, rarity: 'rare' },

  // ── MISC → ANOMALIE MIEJSKIE ──────────────────────────────────────────────
  { id: 'DF_141', title: 'LOG BEZPIECZEŃSTWA — 8 MINUT 12 SEKUND', content: 'Kamery wyłączyły się na dokładnie 8 minut i 12 sekund. Incydent z 2092-11-03. Wszystkie kamery w sektorze D jednocześnie. Blackout energetyczny: nie wystąpił. Inne systemy: działały. Co zrobiono przez 492 sekundy: nieznane.', probability: 0.88, category: 'TOŻSAMOŚĆ', subcategory: 'sny', defaultConnections: ['DF_042', 'DF_061'], paranoiaLevel: 3, rarity: 'classified' },
  { id: 'DF_142', title: 'BRAKUJĄCE DANE — 9 DNI Z 2094', content: 'Brakuje 9 dni danych z 2094. Archiwum SIGMA: luka od 2094-03-14 do 2094-03-23. Wszystkie typy danych: miejskie, medyczne, sądowe, pogodowe. Jakby tych 9 dni nie istniało. Mieszkańcy: pamiętają ten czas.', probability: 0.86, category: 'GHOST PROTOCOL', subcategory: 'ukryte operacje', defaultConnections: ['DF_067', 'DF_141'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_143', title: 'PRZECHWYCONA TRANSMISJA — SPOZA MIASTA', content: 'Przechwycono transmisję spoza miasta. Sygnał na częstotliwości 144.390 MHz: wiadomość głosowa, 12 sekund, nieznany język (nie żaden zidentyfikowany). Przechwycona przez amatorskie radio w 2093. Treść: niemożliwa do przetłumaczenia.', probability: 0.79, category: 'AI', subcategory: 'emergent AI', defaultConnections: ['DF_063', 'DF_091'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_144', title: 'ANOMALIA CCTV — GRACZ NA NAGRANIU', content: 'Nagranie CCTV pokazuje gracza przed rozpoczęciem gry. Data nagrania: 3 tygodnie przed pierwszym runem operatora. Twarz: niemożliwa do identyfikacji przez systemy NEXUS. Działania na nagraniu: dokładnie to samo co operator robi w grze.', probability: 0.75, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_133', 'DF_150'], paranoiaLevel: 5, rarity: 'classified' },
  { id: 'DF_145', title: 'FRAGMENT FILOZOFICZNY — CEL MIASTA', content: 'To miasto zostało stworzone dla czegoś większego. Tekst na ścianie w tunelu, sektor ZERO. Język: mieszany, stary. Tłumaczenie: przybliżone. Kontekst: nieznany. Ale: budowa miasta, lokalizacja laboratoriów, struktura SIGMA — wszystko wskazuje na jeden punkt.', probability: 0.71, category: 'UNDERCITY', subcategory: 'drugie miasto', defaultConnections: ['DF_086', 'DF_150'], paranoiaLevel: 4, rarity: 'rare' },

  // ── MISC → NEXUS ──────────────────────────────────────────────────────────
  { id: 'DF_146', title: 'ANALIZA — DYREKTOR NEXUS BEZ HISTORII', content: 'Nie istnieją zdjęcia Dyrektora NEXUS sprzed 2091. Wyszukiwanie w całym archiwum publicznym: zero wyników. Przed 2091: osoba jakby nie istniała. Po 2091: nagłe pojawienie się z pełną biografią, wszystkimi dokumentami, wszystkimi historycznymi kontaktami.', probability: 0.84, category: 'GHOST PROTOCOL', subcategory: 'wymazywanie ludzi', defaultConnections: ['DF_049', 'DF_057'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_147', title: 'ANOMALIA HR — IDENTYCZNE SNY PRACOWNIKÓW NEXUS', content: 'Pracownicy NEXUS mają identyczne sny. Ankieta anonimowa wewnątrz NEXUS: 67% pracowników wyższego szczebla opisuje identyczny sen — "biały pokój, głos bez ciała, pytanie którego nie pamiętają". Częstotliwość: co najmniej raz w tygodniu.', probability: 0.83, category: 'NEURONET', subcategory: 'transmisje snów', defaultConnections: ['DF_021', 'DF_079'], paranoiaLevel: 4, rarity: 'classified' },
  { id: 'DF_148', title: 'ANOMALIA BIOMETRYCZNA — NIEWIDOCZNI NA KAMERACH', content: 'Część mieszkańców nie pojawia się na kamerach. 11 przypadków: osoby widziane przez świadków, niewidoczne na nagraniach CCTV z tego samego miejsca i czasu. Biometria SIGMA: aktywna dla tych osób. Kamery: rejestrują przestrzeń, nie je.', probability: 0.74, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_013', 'DF_135'], paranoiaLevel: 4, rarity: 'rare' },
  { id: 'DF_149', title: 'RAPORT RYNKOWY — WYKUP ANALOGOWYCH APARATÓW', content: 'Korporacja wykupiła wszystkie analogowe aparaty. NEXUS skupił wszystkie sklepy z aparatami analogowymi w mieście w ciągu 6 miesięcy. Następnie: likwidacja. Oficjalny powód: "modernizacja rynku". Aparaty analogowe nie komunikują się z SIGMA.', probability: 0.69, category: 'GHOST PROTOCOL', subcategory: 'kontrola społeczeństwa', defaultConnections: ['DF_042', 'DF_149'], paranoiaLevel: 2, rarity: 'common' },
  { id: 'DF_150', title: 'OSTATNI FRAGMENT — KONIEC ŚLEDZTWA', content: 'Jeśli odkryłeś prawdę — jesteś już częścią systemu. Ten fragment pojawił się na terminalu sam. Nikt go nie umieścił. Data: dzisiaj. Nadawca: LULLABY. Treść: to zdanie. I jeszcze jedno: "Widzieliśmy Cię od początku."', probability: 0.92, category: 'CORRUPTED DATA', subcategory: 'anomalie AI', defaultConnections: ['DF_129', 'DF_144'], paranoiaLevel: 5, rarity: 'classified' },

];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gp_data_fragments';

// ─────────────────────────────────────────────────────────────────────────────
// STATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function ensureDataFragmentState() {
  if (!G.hub.dataFragments) {
    G.hub.dataFragments = {
      collected: [],
      userCategories: {},
      userConnections: {},
      boardPositions: {},
      userNotes: {},
      paranoiaLevel: 0,
      probabilityUnlocked: false,
      metadataScannerInstalled: false,
      metadataScannedFragments: [],
      decryptorUnlocked: false,
      decryptedFragments: [],
    };
  } else {
    // Migrate old saves that lack the new fields
    if (typeof G.hub.dataFragments.metadataScannerInstalled === 'undefined') G.hub.dataFragments.metadataScannerInstalled = false;
    if (!Array.isArray(G.hub.dataFragments.metadataScannedFragments)) G.hub.dataFragments.metadataScannedFragments = [];
    if (typeof G.hub.dataFragments.decryptorUnlocked === 'undefined') G.hub.dataFragments.decryptorUnlocked = false;
    if (!Array.isArray(G.hub.dataFragments.decryptedFragments)) G.hub.dataFragments.decryptedFragments = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

export function saveDataFragments() {
  ensureDataFragmentState();
  try {
    const payload = JSON.stringify(G.hub.dataFragments);
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Silently fail — storage quota or private mode
  }
}

export function loadDataFragments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return;
    ensureDataFragmentState();
    // Merge loaded state into G.hub.dataFragments
    if (Array.isArray(parsed.collected)) G.hub.dataFragments.collected = parsed.collected;
    if (parsed.userCategories && typeof parsed.userCategories === 'object') G.hub.dataFragments.userCategories = parsed.userCategories;
    if (parsed.userConnections && typeof parsed.userConnections === 'object') G.hub.dataFragments.userConnections = parsed.userConnections;
    if (parsed.boardPositions && typeof parsed.boardPositions === 'object') G.hub.dataFragments.boardPositions = parsed.boardPositions;
    if (parsed.userNotes && typeof parsed.userNotes === 'object') G.hub.dataFragments.userNotes = parsed.userNotes;
    if (typeof parsed.paranoiaLevel === 'number') G.hub.dataFragments.paranoiaLevel = parsed.paranoiaLevel;
    if (typeof parsed.probabilityUnlocked === 'boolean') G.hub.dataFragments.probabilityUnlocked = parsed.probabilityUnlocked;
    if (typeof parsed.metadataScannerInstalled === 'boolean') G.hub.dataFragments.metadataScannerInstalled = parsed.metadataScannerInstalled;
    if (Array.isArray(parsed.metadataScannedFragments)) G.hub.dataFragments.metadataScannedFragments = parsed.metadataScannedFragments;
    if (typeof parsed.decryptorUnlocked === 'boolean') G.hub.dataFragments.decryptorUnlocked = parsed.decryptorUnlocked;
    if (Array.isArray(parsed.decryptedFragments)) G.hub.dataFragments.decryptedFragments = parsed.decryptedFragments;
  } catch {
    // Corrupted storage — ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAGMENT ACQUISITION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to grant 1 uncollected DATA FRAGMENT after a successful run.
 * Weighted by paranoiaLevel vs wave: higher wave unlocks higher paranoia fragments.
 * Returns the granted fragment definition or null if none available.
 */
export function maybeGrantDataFragment(wave) {
  ensureDataFragmentState();
  const df = G.hub.dataFragments;

  // Build pool of uncollected fragments eligible for this wave
  const maxParanoia = Math.min(5, 1 + Math.floor(wave / 2));
  const pool = FRAGMENT_DEFINITIONS.filter(
    (f) => !df.collected.includes(f.id) && f.paranoiaLevel <= maxParanoia
  );

  if (!pool.length) return null;

  // Weight: classified > rare > common, higher paranoiaLevel preferred
  const weighted = [];
  for (const frag of pool) {
    const rarityW = frag.rarity === 'classified' ? 1 : frag.rarity === 'rare' ? 2 : 4;
    // lower rarityW = fewer slots = rarer
    const count = rarityW;
    for (let i = 0; i < count; i++) weighted.push(frag);
  }

  const granted = weighted[Math.floor(Math.random() * weighted.length)];
  df.collected.push(granted.id);

  // Increase paranoia slightly on acquisition
  df.paranoiaLevel = Math.min(100, df.paranoiaLevel + granted.paranoiaLevel * 2);

  return granted;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export function getCollectedFragments() {
  ensureDataFragmentState();
  const ids = G.hub.dataFragments.collected;
  return FRAGMENT_DEFINITIONS.filter((f) => ids.includes(f.id));
}

export function getFragmentById(id) {
  return FRAGMENT_DEFINITIONS.find((f) => f.id === id) || null;
}

export function getTotalFragmentCount() {
  return FRAGMENT_DEFINITIONS.length;
}

export function ensureDebugDataShards(count) {
  ensureDataFragmentState();
  const target = Math.max(0, Number(count) || 0);
  const collected = new Set(G.hub.dataFragments.collected);

  if (collected.size >= target) {
    return getCollectedFragments();
  }

  for (const frag of FRAGMENT_DEFINITIONS) {
    if (collected.size >= target) break;
    if (collected.has(frag.id)) continue;
    collected.add(frag.id);
  }

  G.hub.dataFragments.collected = Array.from(collected);
  return getCollectedFragments();
}

// ─────────────────────────────────────────────────────────────────────────────
// USER BOARD ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function assignFragmentCategory(id, category, subcategory) {
  ensureDataFragmentState();
  G.hub.dataFragments.userCategories[id] = { category, subcategory };
  saveDataFragments();
}

export function setFragmentBoardPos(id, x, y) {
  ensureDataFragmentState();
  G.hub.dataFragments.boardPositions[id] = { x, y };
  saveDataFragments();
}

export function setFragmentNote(id, note) {
  ensureDataFragmentState();
  G.hub.dataFragments.userNotes[id] = note;
  saveDataFragments();
}

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export function addFragmentConnection(fromId, toId) {
  if (fromId === toId) return;
  ensureDataFragmentState();
  const conns = G.hub.dataFragments.userConnections;
  if (!conns[fromId]) conns[fromId] = [];
  if (!conns[toId]) conns[toId] = [];
  if (!conns[fromId].includes(toId)) conns[fromId].push(toId);
  if (!conns[toId].includes(fromId)) conns[toId].push(fromId);
  saveDataFragments();
}

export function removeFragmentConnection(fromId, toId) {
  ensureDataFragmentState();
  const conns = G.hub.dataFragments.userConnections;
  if (conns[fromId]) conns[fromId] = conns[fromId].filter((id) => id !== toId);
  if (conns[toId]) conns[toId] = conns[toId].filter((id) => id !== fromId);
  saveDataFragments();
}

export function getConnectionsFor(id) {
  ensureDataFragmentState();
  return G.hub.dataFragments.userConnections[id] || [];
}

export function getAllConnections() {
  ensureDataFragmentState();
  const conns = G.hub.dataFragments.userConnections;
  const seen = new Set();
  const pairs = [];
  for (const [a, targets] of Object.entries(conns)) {
    for (const b of targets) {
      const key = [a, b].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBABILITY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export function isProbabilityUnlocked() {
  ensureDataFragmentState();
  return G.hub.dataFragments.probabilityUnlocked && !!G.hub.dataFragments.metadataScannerInstalled;
}

export function unlockProbability() {
  ensureDataFragmentState();
  G.hub.dataFragments.probabilityUnlocked = true;
  G.hub.dataFragments.metadataScannerInstalled = true;
  saveDataFragments();
}

export function isFragmentMetadataScanned(id) {
  ensureDataFragmentState();
  return G.hub.dataFragments.metadataScannedFragments.includes(id);
}

export function scanFragmentMetadata(id) {
  ensureDataFragmentState();
  if (!G.hub.dataFragments.metadataScannedFragments.includes(id)) {
    G.hub.dataFragments.metadataScannedFragments.push(id);
    saveDataFragments();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECRYPTOR SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export function isDecryptorUnlocked() {
  ensureDataFragmentState();
  return G.hub.dataFragments.decryptorUnlocked;
}

export function unlockDecryptor() {
  ensureDataFragmentState();
  G.hub.dataFragments.decryptorUnlocked = true;
  saveDataFragments();
}

export function isFragmentDecrypted(id) {
  ensureDataFragmentState();
  return G.hub.dataFragments.decryptedFragments.includes(id);
}

export function decryptFragment(id) {
  ensureDataFragmentState();
  if (!G.hub.dataFragments.decryptedFragments.includes(id)) {
    G.hub.dataFragments.decryptedFragments.push(id);
    saveDataFragments();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY COLOR MAP
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_COLORS = {
  'TOŻSAMOŚĆ':       '#00e5ff',
  'HELIX SYSTEMS':   '#ff7d2a',
  'GHOST PROTOCOL':  '#ff3a5c',
  'AI':              '#b36aff',
  'NEURONET':        '#7ac8ff',
  'UNDERCITY':       '#ffd700',
  'ORPHEUS':         '#ff6ed8',
  'JANUS':           '#00ff9f',
  'CHILDREN':        '#f0f0f0',
  'CORRUPTED DATA':  '#888fa8',
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || '#7ac8ff';
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBABILITY LABEL HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function getProbabilityLabel(prob) {
  if (prob >= 0.50) return { label: 'PRAWDOPODOBNE',    color: '#00ff9f' };
  return                   { label: 'NIEPRAWDOPODOBNE', color: '#ff5a2c' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL CATEGORIES (for filter dropdowns)
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);
