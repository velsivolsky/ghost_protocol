import { G } from '../core/state.js';
import { isTerminalOverlayOpen } from './terminalRuntime.js';
import { log } from './ui.js';
import { updateMissionText } from './mission.js';

const TUTORIAL_TOTAL_STEPS = 20;
const STEALTH_REQUIRED = ['spoof', 'mask_trace', 'ghost'];
const MAIN_FAIL_COMMANDS = ['inject', 'deploy', 'reroute', 'unlock', 'elevator_unlock'];
const CONTROL_COMMANDS = ['set_friendly', 'override', 'disable', 'deploy'];
const TUTORIAL_RECOVERY_COOLDOWN_MS = 1200;

function resetTutorialProgress() {
	G.tutorial.progress = {
		stealth: {
			spoof: false,
			mask_trace: false,
			ghost: false,
		},
		distract: {
			lights: false,
			junction: false,
			wallpanel: false,
			ventOn: false,
			ventOff: false,
		},
		mainFailAttempted: false,
	};
	G.tutorial.lastRecoveryKey = '';
	G.tutorial.lastRecoveryAt = 0;
}

export function startTutorialSession() {
	G.tutorial.active = true;
	G.tutorial.completed = false;
	G.tutorial.step = 0;
	G.tutorial.spawn = G.P ? { x: G.P.x, y: G.P.y } : null;
	G.tutorial.lastCommandId = null;
	G.tutorial.lastCommandTopic = null;
	G.tutorial.lastCommandArgs = [];
	G.tutorial.lastStepAt = performance.now();
	resetTutorialProgress();
	updateTutorialPanel();
	updateMissionText();
	log('Tutorial aktywny. Panel prowadzi cie krok po kroku.', 'ok');
}

export function resetTutorialSession() {
	G.tutorial.active = false;
	G.tutorial.completed = false;
	G.tutorial.step = 0;
	G.tutorial.spawn = null;
	G.tutorial.lastCommandId = null;
	G.tutorial.lastCommandTopic = null;
	G.tutorial.lastCommandArgs = [];
	G.tutorial.lastStepAt = 0;
	resetTutorialProgress();
	updateTutorialPanel();
}

export function noteTutorialCommand(commandId, args = []) {
	if (!G.tutorial?.active) {
		return;
	}

	G.tutorial.lastCommandId = commandId;
	G.tutorial.lastCommandArgs = args;
	G.tutorial.lastCommandTopic = args[0] || '';
	recordTutorialProgress(commandId);
	const beforeStep = G.tutorial.step;
	tickTutorial(true);
	if (G.tutorial.step === beforeStep) {
		maybeLogTutorialRecovery(commandId, args, beforeStep);
	}
}

export function noteTutorialScan() {
	if (!G.tutorial?.active) {
		return;
	}

	G.tutorial.lastCommandId = 'scan_local';
	G.tutorial.lastCommandTopic = '';

	const beforeStep = G.tutorial.step;
	tickTutorial(true);
	if (G.tutorial.step === beforeStep) {
		maybeLogTutorialRecovery('scan_local', [], beforeStep);
	}
}

function maybeLogTutorialRecovery(commandId, args, step) {
	const hint = getTutorialRecoveryHint(commandId, args, step);
	if (!hint) {
		return;
	}

	const now = performance.now();
	const key = `${step}:${commandId}:${args.join('|')}`;
	if (G.tutorial.lastRecoveryKey === key && now - (G.tutorial.lastRecoveryAt || 0) < TUTORIAL_RECOVERY_COOLDOWN_MS) {
		return;
	}

	G.tutorial.lastRecoveryKey = key;
	G.tutorial.lastRecoveryAt = now;
	log(hint, 'dim');
}

function getTutorialRecoveryHint(commandId, args, step) {
	const topic = G.tutorial.lastCommandTopic;
	const connectedType = G.terminalRuntime?.connectedTargetType;
	const connectedId = G.terminalRuntime?.connectedTargetId;
	const arg0 = String(args?.[0] || '').toLowerCase();

	if (step <= 1) {
		return 'Najpierw porusz sie do celu treningowego i otworz terminal TAB.';
	}

	if (step === 2) {
		return 'Najpierw wpisz tutorial albo help basics. Reszta komend przyjdzie zaraz.';
	}

	if (step === 3) {
		return 'Na tym etapie zrob scan local. To odblokuje widoczne cele.';
	}

	if (step === 4) {
		if (commandId === 'connect' && connectedId && connectedId !== 'panel_1' && connectedType !== 'door') {
			return 'Najpierw przejdz przez panel drzwi: connect panel_1 -> unlock -> disconnect.';
		}
		return 'Najpierw zalicz drzwi panel_1. Inne komendy sa na kolejnych krokach.';
	}

	if (step === 5) {
		if (['guard_0', 'tech_0', 'drone_0', 'node_side_1', 'node_side_2', 'node_main'].includes(connectedId)) {
			return 'Kamera jest teraz priorytetem. Inne cele beda za chwile.';
		}
		return 'Najpierw cam_0: connect cam_0 -> inject loop albo disable.';
	}

	if (step === 6 || step === 7 || step === 8) {
		if (connectedId !== (step === 6 ? 'guard_0' : step === 7 ? 'tech_0' : 'drone_0')) {
			return `Najpierw połącz się z ${step === 6 ? 'guard_0' : step === 7 ? 'tech_0' : 'drone_0'}.`;
		}
		return 'Uzyj jednej z metod kontrolnych: set friendly, override, disable albo deploy worm.';
	}

	if (step === 9) {
		if (connectedId !== 'lights_1') {
			return 'Najpierw lights_1 i komenda lights cut.';
		}
		return 'Połącz się z lights_1 i wykonaj lights cut.';
	}

	if (step === 10) {
		if (connectedId !== 'junction_1' && connectedId !== 'wallpanel_1') {
			return 'Najpierw przetestuj junction_1 i wallpanel_1 komendą junction overload.';
		}
		return 'Zaliczenie wymaga obu paneli: junction_1 i wallpanel_1.';
	}

	if (step === 11 || step === 12) {
		if (connectedId !== 'vent_1') {
			return 'Najpierw vent_1. To jest osobny krok dystrakcji.';
		}
		return step === 11 ? 'Włącz wentylację komendą vent on.' : 'Wyłącz ją komendą vent off.';
	}

	if (step === 13) {
		return 'Stealth checklista jest teraz priorytetem: spoof, mask trace i ghost.';
	}

	if (step === 14) {
		return 'Najpierw zrób kontrolowany fail na node_main bez creds. Wtedy pokażemy poprawną ścieżkę.';
	}

	if (step === 15) {
		return 'Side node A czeka: connect node_side_1 -> breach firewall.';
	}

	if (step === 16) {
		if (connectedId !== 'node_side_1') {
			return 'Najpierw node_side_1. Potem dump creds.';
		}
		return 'Najpierw breach firewall, potem dump creds.';
	}

	if (step === 17) {
		return 'Side node B służy do lootu: download map, download hack albo transfer credits.';
	}

	if (step === 18) {
		return 'Wroc na node_main i wykonaj pelny hack: scp breach.sh -> source breach.sh.';
	}

	if (step === 19) {
		return 'Na końcu użyj windy: elevator up albo elevator down.';
	}

	if (commandId === 'scan_local' || commandId === 'scan_network') {
		return 'Skan jest już zrobiony albo przyjdzie w następnym kroku.';
	}

	if (commandId === 'spoof' || commandId === 'mask_trace' || commandId === 'ghost') {
		return 'Stealth komendy wykorzystasz dopiero później, po scenie z dystrakcjami.';
	}

	if (commandId === 'elevator_up' || commandId === 'elevator_down') {
		return 'Winda jest dostepna po zakonczeniu hacku na node_main (step 18).';
	}

	if (commandId === 'breach_firewall' || commandId === 'dump_creds') {
		return 'To jest ścieżka side node A, po kontrolowanym teście main node.';
	}

	if (['download_hack', 'download_map', 'transfer_credits'].includes(commandId)) {
		return 'To loot z side node B. Wrócimy do tego po auth shardzie.';
	}

	if (['set_friendly', 'override', 'disable', 'deploy'].includes(commandId)) {
		return 'Ten typ kontroli przyda się na urządzeniach i jednostkach, ale najpierw idź zgodnie z flow tutoriala.';
	}

	if (commandId === 'connect' && topic) {
		return 'To nie ten cel jeszcze. Trzymaj się aktualnego kroku z panelu tutoriala.';
	}

	if (commandId === 'unlock' && arg0 === 'elevator') {
		return 'Elevator unlock nie jest wymagany. Winda jest zawsze dostepna. Idz do windy i uzyj elevator up/down.';
	}

	return '';
}

function recordTutorialProgress(commandId) {
	const progress = G.tutorial?.progress;
	if (!progress) {
		return;
	}

	const connectedType = G.terminalRuntime?.connectedTargetType;
	const connectedId = G.terminalRuntime?.connectedTargetId;

	if (STEALTH_REQUIRED.includes(commandId)) {
		progress.stealth[commandId] = true;
	}

	if (commandId === 'cut_lights' && connectedType === 'distract' && connectedId === 'lights_1') {
		progress.distract.lights = true;
	}

	if (commandId === 'trip_panel' && connectedType === 'distract' && connectedId === 'junction_1') {
		progress.distract.junction = true;
	}

	if (commandId === 'trip_panel' && connectedType === 'distract' && connectedId === 'wallpanel_1') {
		progress.distract.wallpanel = true;
	}

	if (commandId === 'trigger_vent' && connectedType === 'distract' && connectedId === 'vent_1') {
		progress.distract.ventOn = true;
	}

	if (commandId === 'vent_off' && connectedType === 'distract' && connectedId === 'vent_1') {
		progress.distract.ventOff = true;
	}

	if (connectedType === 'mainterm' && connectedId === 'node_main' && MAIN_FAIL_COMMANDS.includes(commandId) && !isMainTerminalUnlocked()) {
		progress.mainFailAttempted = true;
	}
}

export function tickTutorial(force = false) {
	if (!G.tutorial?.active || !G.P) {
		return;
	}

	const step = G.tutorial.step;
	let advanced = false;
	const cmd = G.tutorial.lastCommandId;
	const topic = G.tutorial.lastCommandTopic;
	const args = G.tutorial.lastCommandArgs || [];
	const connectedType = G.terminalRuntime?.connectedTargetType;
	const connectedId = G.terminalRuntime?.connectedTargetId;
	const progress = G.tutorial.progress || {};

	if (step === 0) {
		const spawn = G.tutorial.spawn || G.P;
		const moved = Math.abs(G.P.x - spawn.x) + Math.abs(G.P.y - spawn.y) > 1;
		if (moved) {
			advanced = advanceTutorialStep(1);
		}
	} else if (step === 1) {
		if (isTerminalOverlayOpen()) {
			advanced = advanceTutorialStep(2);
		}
	} else if (step === 2) {
		if (cmd === 'tutorial' || (cmd === 'help' && topic === 'basics')) {
			advanced = advanceTutorialStep(3);
		}
	} else if (step === 3) {
		if (cmd === 'scan_local' || cmd === 'scan_network') {
			advanced = advanceTutorialStep(4);
		}
	} else if (step === 4) {
		if ((cmd === 'unlock' && (connectedType === 'wterm' || connectedType === 'door')) || G.doors?.some((door) => door.open)) {
			advanced = advanceTutorialStep(5);
		}
	} else if (step === 5) {
		if ((cmd === 'inject' || cmd === 'disable') && connectedType === 'cam' && connectedId === 'cam_0') {
			advanced = advanceTutorialStep(6);
		}
	} else if (step === 6) {
		if (CONTROL_COMMANDS.includes(cmd) && connectedType === 'guard' && connectedId === 'guard_0') {
			advanced = advanceTutorialStep(7);
		}
	} else if (step === 7) {
		if (CONTROL_COMMANDS.includes(cmd) && connectedType === 'tech' && connectedId === 'tech_0') {
			advanced = advanceTutorialStep(8);
		}
	} else if (step === 8) {
		if (CONTROL_COMMANDS.includes(cmd) && connectedType === 'drone' && connectedId === 'drone_0') {
			advanced = advanceTutorialStep(9);
		}
	} else if (step === 9) {
		if (progress?.distract?.lights) {
			advanced = advanceTutorialStep(10);
		}
	} else if (step === 10) {
		if (progress?.distract?.junction && progress?.distract?.wallpanel) {
			advanced = advanceTutorialStep(11);
		}
	} else if (step === 11) {
		if (progress?.distract?.ventOn) {
			advanced = advanceTutorialStep(12);
		}
	} else if (step === 12) {
		if (progress?.distract?.ventOff) {
			advanced = advanceTutorialStep(13);
		}
	} else if (step === 13) {
		const stealthDone = STEALTH_REQUIRED.every((id) => !!progress?.stealth?.[id]);
		if (stealthDone) {
			advanced = advanceTutorialStep(14);
		}
	} else if (step === 14) {
		if (progress?.mainFailAttempted) {
			advanced = advanceTutorialStep(15);
		}
	} else if (step === 15) {
		if (cmd === 'breach_firewall' && connectedType === 'sterm' && connectedId === 'node_side_1') {
			advanced = advanceTutorialStep(16);
		}
	} else if (step === 16) {
		if (cmd === 'dump_creds' && connectedType === 'sterm' && connectedId === 'node_side_1' && isMainTerminalUnlocked()) {
			advanced = advanceTutorialStep(17);
		}
	} else if (step === 17) {
		if ((cmd === 'download_hack' || cmd === 'transfer_credits' || cmd === 'download_map') && connectedType === 'sterm' && connectedId === 'node_side_2') {
			advanced = advanceTutorialStep(18);
		}
	} else if (step === 18) {
		if (G.mainHacked) {
			advanced = advanceTutorialStep(19);
		}
	} else if (step === 19) {
		if (cmd === 'elevator_up' || cmd === 'elevator_down') {
			advanced = completeTutorial();
		}
	}

	if (advanced || force) {
		updateTutorialPanel();
		updateMissionText();
	}
}

export function updateTutorialPanel() {
	const panel = G.dom.tutorialPanel;
	if (!panel) {
		return;
	}

	if (!G.tutorial?.active) {
		panel.classList.remove('show');
		return;
	}

	panel.classList.add('show');

	const content = getTutorialStepContent(G.tutorial.step);
	if (G.dom.tutorialStep) {
		G.dom.tutorialStep.textContent = `STEP ${Math.min(TUTORIAL_TOTAL_STEPS, G.tutorial.step + 1)}/${TUTORIAL_TOTAL_STEPS}`;
	}
	if (G.dom.tutorialTitle) {
		G.dom.tutorialTitle.textContent = content.title;
	}
	if (G.dom.tutorialBody) {
		G.dom.tutorialBody.textContent = content.body;
	}
	if (G.dom.tutorialHint) {
		G.dom.tutorialHint.textContent = content.hint;
	}
}

function advanceTutorialStep(nextStep) {
	if (!G.tutorial?.active || G.tutorial.step >= nextStep) {
		return false;
	}

	G.tutorial.step = nextStep;
	G.tutorial.lastStepAt = performance.now();
	log(getTutorialStepContent(nextStep).log, 'ok');
	return true;
}

function completeTutorial() {
	G.tutorial.active = false;
	G.tutorial.completed = true;
	G.tutorial.step = TUTORIAL_TOTAL_STEPS - 1;
	updateTutorialPanel();
	log('Tutorial zakonczony. Mozesz zaczac normalny run.', 'ok');
	return true;
}

function isMainTerminalUnlocked() {
	if (!G.mainTerminalAuth) {
		return true;
	}

	return !!G.mainTerminalAuth.unlocked;
}

function getTutorialStepContent(step) {
	if (step === 0) {
		return {
			title: 'MOVE',
			body: 'Poruszaj postacia WASD i przejdz miedzy pokojami treningowymi.',
			hint: 'Ruch nie pauzuje swiata. Wykorzystaj chwile i obserwuj patrol.',
			log: 'Tutorial: ruch zaliczony.',
		};
	}

	if (step === 1) {
		return {
			title: 'OPEN TERMINAL',
			body: 'Otworz realtime terminal klawiszem TAB. Overlay dziala nad gra i nie zatrzymuje swiata.',
			hint: 'ESC zamyka overlay. Kursor powinien byc gotowy do wpisywania komend.',
			log: 'Tutorial: terminal otwarty.',
		};
	}

	if (step === 2) {
		return {
			title: 'LEARN THE BASICS',
			body: 'W terminalu wpisz tutorial albo help basics. Dostaniesz szybkie wskazowki i flow.',
			hint: 'Najpierw oswoj skladnie, potem przejdz do skanowania.',
			log: 'Tutorial: podstawy terminala.',
		};
	}

	if (step === 3) {
		return {
			title: 'SCAN',
			body: 'Zrob scan local. Terminal pokaze cele w zasiegu i podpowie co mozna hakowac.',
			hint: 'Szukaj panel_1, cam_0, door_1, vent_1, lights_1, junction_1, wallpanel_1 i podobnych obiektow.',
			log: 'Tutorial: skan wykonany.',
		};
	}

	if (step === 4) {
		return {
			title: 'OPEN A DOOR',
			body: 'Zamkniete drzwi otwierasz przez panel. Uzyj: connect panel_1 -> unlock -> disconnect.',
			hint: 'Alternatywa: connect door_1 -> unlock.',
			log: 'Tutorial: drzwi odblokowane.',
		};
	}

	if (step === 5) {
		return {
			title: 'NEUTRALIZE CAMERA',
			body: 'Polacz z kamera: connect cam_0 i wykonaj inject loop albo disable.',
			hint: 'Po akcji kamera powinna przestac byc zagrozeniem na chwile.',
			log: 'Tutorial: kamera opanowana.',
		};
	}

	if (step === 6) {
		return {
			title: 'NEUTRALIZE GUARD',
			body: 'Polacz sie ze straznikiem: connect guard_0 i uzyj set friendly / override / disable / deploy worm.',
			hint: 'To ten sam obiekt, ale kilka metod. Naucz sie zamieniac podejscie pod presja.',
			log: 'Tutorial: metody na strazniku zaliczone.',
		};
	}

	if (step === 7) {
		return {
			title: 'NEUTRALIZE TECHNICIAN',
			body: 'Teraz technik: connect tech_0 i wykonaj set friendly / override / disable / deploy worm.',
			hint: 'Technik to osobny typ celu. Komendy podobne, ale skutki taktyczne inne.',
			log: 'Tutorial: metody na techniku zaliczone.',
		};
	}

	if (step === 8) {
		return {
			title: 'NEUTRALIZE DRONE',
			body: 'Teraz dron: connect drone_0 i wykonaj set friendly / override / disable / deploy worm.',
			hint: 'Dron jest ruchomy, wiec kontrola czasu i dystansu ma znaczenie.',
			log: 'Tutorial: metody na dronie zaliczone.',
		};
	}

	if (step === 9) {
		return {
			title: 'DISTRACTION // LIGHTS',
			body: 'Polacz z lights_1 i uruchom lights cut.',
			hint: 'To generuje odruchowa reakcje patroli w okolicy wezla.',
			log: 'Tutorial: lights cut zaliczone.',
		};
	}

	if (step === 10) {
		return {
			title: 'DISTRACTION // PANELS',
			body: 'Uzyj junction overload na junction_1 ORAZ na wallpanel_1.',
			hint: 'Ten krok przechodzi dopiero po zaliczeniu obu paneli.',
			log: 'Tutorial: panele dystrakcji zaliczone.',
		};
	}

	if (step === 11) {
		return {
			title: 'DISTRACTION // VENT ON',
			body: 'Polacz z vent_1 i uruchom vent on.',
			hint: 'Wentylacja moze sciagac patrol do zrodla dzwieku.',
			log: 'Tutorial: vent on zaliczone.',
		};
	}

	if (step === 12) {
		return {
			title: 'DISTRACTION // VENT OFF',
			body: 'Na tym samym wezle wykonaj vent off.',
			hint: 'Musisz umiec nie tylko triggerowac dystrakcje, ale tez je wygaszac.',
			log: 'Tutorial: vent off zaliczone.',
		};
	}

	if (step === 13) {
		return {
			title: 'STEALTH CHECKLIST',
			body: 'Wykonaj komplet komend stealth: spoof, mask trace, ghost.',
			hint: 'Kolejnosc dowolna, ale wszystkie trzy sa wymagane.',
			log: 'Tutorial: stealth checklista zaliczona.',
		};
	}

	if (step === 14) {
		return {
			title: 'MAIN NODE // CONTROLLED FAIL',
			body: 'Polacz z node_main i sproboj akcji bez creds (np. inject relay albo scp breach.sh bez sharda).',
			hint: 'To ma byc kontrolowana porazka edukacyjna przed zdobyciem shardu.',
			log: 'Tutorial: fail-case na main node zaliczony.',
		};
	}

	if (step === 15) {
		return {
			title: 'SIDE NODE A // BREACH',
			body: 'Polacz z node_side_1 i wykonaj breach firewall.',
			hint: 'Ten node ma aktywny ICE, wiec bez breach nie ruszysz dalej.',
			log: 'Tutorial: breach firewall zaliczony.',
		};
	}

	if (step === 16) {
		return {
			title: 'SIDE NODE A // DUMP CREDS',
			body: 'Na node_side_1 wykonaj dump creds, aby odblokowac dostep do main node.',
			hint: 'Po poprawnym dump zobaczysz postep shardow i odblokowanie auth.',
			log: 'Tutorial: dump creds zaliczone.',
		};
	}

	if (step === 17) {
		return {
			title: 'SIDE NODE B // LOOT',
			body: 'Polacz z node_side_2 i wykonaj download map, download hack albo transfer credits.',
			hint: 'To pokazuje roznice miedzy node auth a node czysto lootowym.',
			log: 'Tutorial: side node loot zaliczony.',
		};
	}

	if (step === 18) {
		return {
			title: 'MAIN NODE // HACK',
			body: 'Wroc na node_main i wykonaj pelny hack: connect node_main -> scp breach.sh -> source breach.sh.',
			hint: 'To jest finalny cel runa. Auth shard z node_side_1 juz jest w systemie.',
			log: 'Tutorial: main node zhakowany.',
		};
	}

	if (step === 19) {
		return {
			title: 'ELEVATOR EXECUTION',
			body: 'Podejdz do windy i wykonaj elevator up albo elevator down. Winda jest zawsze dostepna.',
			hint: 'Winda nie wymaga main node. Mozesz przemieszczac sie miedzy pietrami w dowolnym momencie.',
			log: 'Tutorial: winda zaliczona.',
		};
	}

	return {
		title: 'DONE',
		body: 'Tutorial zakonczony. Wszystkie kluczowe obiekty i metody live terminala masz opanowane.',
		hint: 'Mozesz odpalic normalny run i pracowac na skrotach oraz auto-complete.',
		log: 'Tutorial: final.',
	};
}