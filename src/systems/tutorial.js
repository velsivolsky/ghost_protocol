import { G } from '../core/state.js';
import { isTerminalOverlayOpen } from './terminalRuntime.js';
import { log } from './ui.js';
import { updateMissionText } from './mission.js';

export function startTutorialSession() {
	G.tutorial.active = true;
	G.tutorial.completed = false;
	G.tutorial.step = 0;
	G.tutorial.spawn = G.P ? { x: G.P.x, y: G.P.y } : null;
	G.tutorial.lastCommandId = null;
	G.tutorial.lastCommandTopic = null;
	G.tutorial.lastCommandArgs = [];
	G.tutorial.lastStepAt = performance.now();
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
	updateTutorialPanel();
}

export function noteTutorialCommand(commandId, args = []) {
	if (!G.tutorial?.active) {
		return;
	}

	G.tutorial.lastCommandId = commandId;
	G.tutorial.lastCommandArgs = args;
	G.tutorial.lastCommandTopic = args[0] || '';
	tickTutorial(true);
}

export function noteTutorialScan() {
	if (!G.tutorial?.active) {
		return;
	}

	G.tutorial.lastCommandId = 'scan_local';
	G.tutorial.lastCommandTopic = '';

	if (G.tutorial.step === 3) {
		advanceTutorialStep(4);
		updateTutorialPanel();
		updateMissionText();
		return;
	}

	tickTutorial(true);
}

export function tickTutorial(force = false) {
	if (!G.tutorial?.active || !G.P) {
		return;
	}

	const step = G.tutorial.step;
	let advanced = false;

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
		if (G.tutorial.lastCommandId === 'tutorial' || (G.tutorial.lastCommandId === 'help' && G.tutorial.lastCommandTopic === 'basics')) {
			advanced = advanceTutorialStep(3);
		}
	} else if (step === 3) {
		if (G.tutorial.lastCommandId === 'scan_local' || G.tutorial.lastCommandId === 'scan_network') {
			advanced = advanceTutorialStep(4);
		}
	} else if (step === 4) {
		if (G.tutorial.lastCommandId === 'unlock' || G.doors?.some((door) => door.open)) {
			advanced = advanceTutorialStep(5);
		}
	} else if (step === 5) {
		if (G.tutorial.lastCommandId === 'inject' || G.tutorial.lastCommandId === 'disable' || G.tutorial.lastCommandId === 'override') {
			advanced = advanceTutorialStep(6);
		}
	} else if (step === 6) {
		if (
			(G.tutorial.lastCommandId === 'set_friendly' || G.tutorial.lastCommandId === 'override' || G.tutorial.lastCommandId === 'disable') &&
			isConnectedToType('guard')
		) {
			advanced = advanceTutorialStep(7);
		}
	} else if (step === 7) {
		if (
			(G.tutorial.lastCommandId === 'set_friendly' || G.tutorial.lastCommandId === 'override' || G.tutorial.lastCommandId === 'disable') &&
			isConnectedToType('tech')
		) {
			advanced = advanceTutorialStep(8);
		}
	} else if (step === 8) {
		if (G.tutorial.lastCommandId === 'download_map' && isConnectedToType('sterm')) {
			advanced = advanceTutorialStep(9);
		}
	} else if (step === 9) {
		if ((G.tutorial.lastCommandId === 'download_hack' || G.tutorial.lastCommandId === 'transfer_credits') && isConnectedToType('sterm')) {
			advanced = advanceTutorialStep(10);
		}
	} else if (step === 10) {
		if (
			(G.tutorial.lastCommandId === 'inject' || G.tutorial.lastCommandId === 'deploy' || G.tutorial.lastCommandId === 'reroute') &&
			isConnectedToType('mainterm')
		) {
			advanced = advanceTutorialStep(11);
		}
	} else if (step === 11) {
		if (G.tutorial.lastCommandId === 'help' && ['guards', 'technicians', 'terminals', 'mainterm'].includes(G.tutorial.lastCommandTopic)) {
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
		G.dom.tutorialStep.textContent = `STEP ${G.tutorial.step + 1}/12`;
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
	G.tutorial.step = 11;
	updateTutorialPanel();
	log('Tutorial zakonczony. Mozesz zaczac normalny run.', 'ok');
	return true;
}

function isConnectedToType(type) {
	return G.terminalRuntime?.connectedTargetType === type;
}

function getTutorialStepContent(step) {
	if (step === 0) {
		return {
			title: 'MOVE',
			body: 'Poruszaj postacia WASD i podejdz do podswietlonego celu treningowego.',
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
			hint: 'Najpierw zobacz jak terminal odpowiada, potem rob scan local.',
			log: 'Tutorial: podstawy terminala.',
		};
	}

	if (step === 3) {
		return {
			title: 'SCAN',
			body: 'Zrob scan local. Terminal pokaze cele w zasiegu i podpowie co mozna hakowac.',
			hint: 'Szukaj panel_1, cam_0, door_0 i podobnych obiektow.',
			log: 'Tutorial: skan wykonany.',
		};
	}

	if (step === 4) {
		return {
			title: 'OPEN A DOOR',
			body: 'Zamkniete drzwi otwierasz przez panel. Uzyj: connect panel_1 -> unlock -> disconnect.',
			hint: 'Jesli jest bezposredni door id, mozesz polaczyc sie do drzwi wprost.',
			log: 'Tutorial: drzwi odblokowane.',
		};
	}

	if (step === 5) {
		return {
			title: 'HACK CAMERA',
			body: 'Teraz kamera. Uzyj: connect cam_0 -> inject loop -> disconnect albo disable.',
			hint: 'To ma byc realtime. Kamera ma zniknac z gry bez pauzy swiata.',
			log: 'Tutorial: kamera opanowana.',
		};
	}

	if (step === 6) {
		return {
			title: 'GUARD METHODS',
			body: 'Polacz sie ze straznikiem: connect guard_0. Przetestuj set friendly albo override, ewentualnie disable.',
			hint: 'To ten sam obiekt, ale kilka metod. Naucz sie zamieniac podejscie pod presja.',
			log: 'Tutorial: metody na strazniku zaliczone.',
		};
	}

	if (step === 7) {
		return {
			title: 'TECHNICIAN METHODS',
			body: 'Teraz technik: connect tech_0 i wykonaj set friendly albo override, ewentualnie disable.',
			hint: 'Technik to osobny typ celu. Komendy podobne, ale skutki taktyczne inne.',
			log: 'Tutorial: metody na techniku zaliczone.',
		};
	}

	if (step === 8) {
		return {
			title: 'SIDE TERMINAL // MAP',
			body: 'Podlacz side terminal: connect node_side_1 i wpisz download map.',
			hint: 'Komendy side terminala dzialaja tylko przy aktywnym polaczeniu do node_side_#.',
			log: 'Tutorial: pobieranie mapy zaliczone.',
		};
	}

	if (step === 9) {
		return {
			title: 'SIDE TERMINAL // LOOT',
			body: 'Na drugim side terminalu zrob transfer credits albo download hack.',
			hint: 'Kazdy terminal poboczny ma limit zasobow, wiec wybieraj swiadomie.',
			log: 'Tutorial: loot z side terminala zaliczony.',
		};
	}

	if (step === 10) {
		return {
			title: 'MAIN TERMINAL METHODS',
			body: 'Polacz z main terminalem: connect node_main, potem inject relay albo deploy worm/reroute.',
			hint: 'Main terminal daje strategiczny efekt na cala misje, nie tylko lokalny hack.',
			log: 'Tutorial: metody main terminala zaliczone.',
		};
	}

	if (step === 11) {
		return {
			title: 'COMMAND ENCYCLOPEDIA',
			body: 'Wpisz: help guards, help technicians, help terminals lub help mainterm.',
			hint: 'W menu TERMINAL masz tez statyczna sciage komend i flow dla kazdego obiektu.',
			log: 'Tutorial: komendy referencyjne zaliczone.',
		};
	}

	return {
		title: 'DONE',
		body: 'Tutorial zakonczony. Wszystkie kluczowe obiekty i metody live terminala masz opanowane.',
		hint: 'Mozesz odpalic normalny run i pracowac na skrotach oraz auto-complete.',
		log: 'Tutorial: final.',
	};
}