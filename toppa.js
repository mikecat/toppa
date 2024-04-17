"use strict";

window.addEventListener("DOMContentLoaded", () => {
	const elems = {};
	document.querySelectorAll("[id]").forEach((elem) => elems[elem.id] = elem);

	const STATUS_INITIAL = 0;
	const STATUS_COUNTDOWN = STATUS_INITIAL + 1;
	const STATUS_GAME = STATUS_COUNTDOWN + 1;
	const STATUS_FINISH = STATUS_GAME + 1;
	const STATUS_RESULT = STATUS_FINISH + 1;

	const ANIME_STATUS_NONE = 0;
	const ANIME_STATUS_INITIAL = ANIME_STATUS_NONE + 1;
	const ANIME_STATUS_MOVE = ANIME_STATUS_INITIAL + 1;
	const ANIME_STATUS_CHANGE = ANIME_STATUS_MOVE + 1;

	const images = {
		[-2]: "img/b.png",
		[-1]: "img/a.png",
		0: "empty.png",
		1: "img/1.png",
		2: "img/2.png",
		3: "img/3.png",
		4: "img/4.png",
		5: "img/5.png",
		6: "img/6.png",
	};
	const scoreAndTimeDelta = {
		[-2]: {score: 768, time: 0},
		[-1]: {score: 384, time: 0},
		0: {score: 0, time: 0},
		1: {score: 6, time: 0},
		2: {score: 12, time: 0},
		3: {score: 24, time: 0},
		4: {score: 48, time: 0},
		5: {score: 96, time: 0},
		6: {score: 192, time: 30},
	};
	const initialTimeLimit = 90; // s
	const animeMoveTime = 100; // ms
	const animeChangeTime = 200; // ms

	let status = STATUS_INITIAL;
	let gameStartTime = 0;
	let gameTimeLimit = 0;
	let gameScore = 0;
	let gameMergeCount = 0;
	let gameAnimeStartTime = 0;
	let gameAnimePhase = 0;

	const gameBoard = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
	const prevGameBoard = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
	const gameBoardMoveDelta = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
	const gameBoardChangeFrom = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

	function getTime() {
		return performance.now();
	}

	function gameIsRunning() {
		const elapsedTime = getTime() - gameStartTime;
		return elapsedTime < gameTimeLimit * 1000;
	}

	function spawnPanel() {
		const candidates = [];
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (gameBoard[i][j] === 0 && !gameBoardChangeFrom[i][j]) candidates.push([i, j]);
			}
		}
		if (candidates.length === 0) return;
		const pos = candidates[~~(Math.random() * candidates.length)];
		const panelSelect = Math.random();
		const panel = panelSelect < 0.85 ? 1 : (panelSelect < 0.95 ? 2 : -1);
		gameBoard[pos[0]][pos[1]] = panel;
		gameBoardChangeFrom[pos[0]][pos[1]] = 0;
	}

	function renderPanels() {
		const animeTime = getTime() - gameAnimeStartTime;
		if (animeTime < animeMoveTime) {
			if (gameAnimePhase !== ANIME_STATUS_MOVE) {
				for (let i = 0; i < 4; i++) {
					for (let j = 0; j < 4; j++) {
						elems["g" + i + j].src = images[prevGameBoard[i][j]];
						elems["pg" + i + j].src = images[0];
					}
				}
				gameAnimePhase = ANIME_STATUS_MOVE;
			}
			const animeRatio = animeTime / animeMoveTime;
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					elems["g" + i + j].style.transform = gameBoardMoveDelta[i][j] ?
						"translate(" +
							"calc((100% + 1ex) * " + (gameBoardMoveDelta[i][j][1] * animeRatio) + "), " +
							"calc((100% + 1ex) * " + (gameBoardMoveDelta[i][j][0] * animeRatio) + "))"
					: "";
				}
			}
		} else if (animeTime < animeMoveTime + animeChangeTime) {
			if (gameAnimePhase !== ANIME_STATUS_CHANGE) {
				for (let i = 0; i < 4; i++) {
					for (let j = 0; j < 4; j++) {
						if (gameBoardChangeFrom[i][j] !== null && gameBoard[i][j] === 0) {
							elems["g" + i + j].src = images[gameBoardChangeFrom[i][j]];
							elems["pg" + i + j].src = images[0];
						} else {
							elems["g" + i + j].src = images[gameBoard[i][j]];
							elems["pg" + i + j].src = images[gameBoardChangeFrom[i][j] || 0];
						}
					}
				}
				gameAnimePhase = ANIME_STATUS_CHANGE;
			}
			const animeRatio = (animeTime - animeMoveTime) / animeChangeTime;
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					elems["g" + i + j].style.transform =
						gameBoardChangeFrom[i][j] === null ? "" :
						gameBoard[i][j] === 0 ? "scale(" + (1 - animeRatio) + ")" :
						"scale(" + animeRatio + ")";
				}
			}
		} else {
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					elems["g" + i + j].src = images[gameBoard[i][j]];
					elems["pg" + i + j].src = images[0];
					elems["g" + i + j].style.transform = "";
				}
			}
			gameAnimePhase = ANIME_STATUS_NONE;
		}
		if (gameAnimePhase !== ANIME_STATUS_NONE) {
			requestAnimationFrame(renderPanels);
		}
	}

	function startRenderPanels(skipMove) {
		const currentAnimePhase = gameAnimePhase;
		gameAnimePhase = ANIME_STATUS_INITIAL;
		gameAnimeStartTime = getTime() - (skipMove ? animeMoveTime : 0);
		if (currentAnimePhase === ANIME_STATUS_NONE) renderPanels();
	}

	function gameInit() {
		if (status !== STATUS_COUNTDOWN) return;
		gameStartTime = getTime();
		gameTimeLimit = initialTimeLimit;
		gameScore = 0;
		gameMergeCount = 0;
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				gameBoard[i][j] = 0;
				prevGameBoard[i][j] = 0;
				gameBoardChangeFrom[i][j] = null;
			}
		}
		elems.gameBoard.classList.remove("gameCountdown");
		status = STATUS_GAME;
		spawnPanel();
		spawnPanel();
		startRenderPanels(true);
		gameTimeDisplayAndCheck();
	}

	function gameTimeDisplayAndCheck() {
		if (status !== STATUS_GAME) return;
		const elapsedTime = getTime() - gameStartTime;
		elems.timeArea.textContent = Math.max(Math.ceil(gameTimeLimit - elapsedTime / 1000), 0);
		if (gameIsRunning()) {
			requestAnimationFrame(gameTimeDisplayAndCheck);
		} else {
			gameFinish();
		}
	}

	function gameFinish() {
		if (status !== STATUS_GAME) return;
		elems.gameBoard.classList.add("gameFinish");
		status = STATUS_FINISH;
		setTimeout(gameResult, 3000);
	}

	function gameResult() {
		if (status !== STATUS_FINISH) return;
		elems.gameBoard.classList.remove("gameFinish");
		elems.gameBoard.classList.add("gameResult");
		status = STATUS_RESULT;
	}

	function gameMoveInitialize() {
		if (status !== STATUS_GAME || !gameIsRunning()) return false;
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				prevGameBoard[i][j] = gameBoard[i][j];
				gameBoardChangeFrom[i][j] = null;
				gameBoardMoveDelta[i][j] = null;
			}
		}
		return true;
	}

	function transformBoard(board, func) {
		const newBoard = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				const newPos = func(i, j);
				newBoard[newPos[0]][newPos[1]] = board[i][j];
			}
		}
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				board[i][j] = newBoard[i][j];
			}
		}
	}

	function transformBoards(func) {
		transformBoard(gameBoard, func);
		transformBoard(prevGameBoard, func);
		transformBoard(gameBoardChangeFrom, func);
		transformBoard(gameBoardMoveDelta, func);
	}

	function boardsTurnLeft() {
		transformBoards((y, x) => [3 - x, y]);
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (gameBoardMoveDelta[i][j]) {
					const value = gameBoardMoveDelta[i][j];
					gameBoardMoveDelta[i][j] = [-value[1], value[0]];
				}
			}
		}
	}

	function boardsTurnRight() {
		transformBoards((y, x) => [x, 3 - y]);
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (gameBoardMoveDelta[i][j]) {
					const value = gameBoardMoveDelta[i][j];
					gameBoardMoveDelta[i][j] = [value[1], -value[0]];
				}
			}
		}
	}

	function boardsTurn180() {
		transformBoards((y, x) => [3 - y, 3 - x]);
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (gameBoardMoveDelta[i][j]) {
					const value = gameBoardMoveDelta[i][j];
					gameBoardMoveDelta[i][j] = [-value[0], -value[1]];
				}
			}
		}
	}

	function gameCanMove() {
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				if (gameBoard[i][j] !== 0) {
					const judge = (value) => value === 0 || value === gameBoard[i][j];
					if (i > 0 && judge(gameBoard[i - 1][j])) return true;
					if (i < 3 && judge(gameBoard[i + 1][j])) return true;
					if (j > 0 && judge(gameBoard[i][j - 1])) return true;
					if (j < 3 && judge(gameBoard[i][j + 1])) return true;
				}
			}
		}
		return false;
	}

	function gameMoveTemplate(preRotate, postRotate) {
		if (!gameMoveInitialize()) return;
		preRotate();
		let moved = false;
		for (let i = 0; i < 4; i++) {
			let fixed = -1;
			for (let j = 0; j < 4; j++) {
				if (gameBoard[i][j] !== 0) {
					const panel = gameBoard[i][j];
					gameBoard[i][j] = 0;
					let k = j;
					while (k - 1 > fixed) {
						if (gameBoard[i][k - 1] !== 0 && gameBoard[i][k - 1] !== panel) break;
						k--;
					}
					if (k !== j) moved = true;
					if (gameBoard[i][k] === panel) {
						gameScore += scoreAndTimeDelta[panel].score;
						gameMergeCount++;
						gameTimeLimit += scoreAndTimeDelta[panel].time;
						if (gameBoard[i][k] > 0) {
							if (++gameBoard[i][k] > 6) gameBoard[i][k] = 0;
						} else {
							if (--gameBoard[i][k] < -2) gameBoard[i][k] = 0;
						}
						gameBoardChangeFrom[i][k] = panel;
						fixed = k;
					} else {
						gameBoard[i][k] = panel;
						fixed = k - 1;
					}
					gameBoardMoveDelta[i][j] = [0, k - j];
				}
			}
		}
		postRotate();
		if (moved) {
			elems.scoreArea.textContent = gameScore;
			elems.countArea.textContent = gameMergeCount;
			spawnPanel();
			if (!gameCanMove()) gameFinish();
			startRenderPanels(false);
		}
	}

	function gameMoveLeft() {
		gameMoveTemplate(() => {}, () => {});
	}

	function gameMoveRight() {
		gameMoveTemplate(boardsTurn180, boardsTurn180);
	}

	function gameMoveUp() {
		gameMoveTemplate(boardsTurnLeft, boardsTurnRight);
	}

	function gameMoveDown() {
		gameMoveTemplate(boardsTurnRight, boardsTurnLeft);
	}

	function gameStart() {
		if (status === STATUS_INITIAL || status === STATUS_RESULT) {
			elems.gameBoard.classList.remove("gameInitial");
			elems.gameBoard.classList.remove("gameResult");
			elems.gameBoard.classList.add("gameCountdown");
			for (let i = 0; i < 4; i++) {
				for (let j = 0; j < 4; j++) {
					elems["g" + i + j].src = images[0];
					elems["pg" + i + j].src = images[0];
					elems["g" + i + j].style.transform = "";
				}
			}
			elems.timeArea.textContent = initialTimeLimit;
			elems.scoreArea.textContent = "0";
			elems.countArea.textContent = "0";
			status = STATUS_COUNTDOWN;
			gameStartTime = getTime();
			runCountdown();
		}
	};

	function runCountdown() {
		const elapsedTime = Math.floor((getTime() - gameStartTime) / 1000);
		if (elapsedTime < 3) {
			elems.countdownArea.textContent = 3 - elapsedTime;
		} else {
			elems.countdownArea.textContent = "START";
		}
		if (elapsedTime < 4) {
			requestAnimationFrame(runCountdown);
		} else {
			gameInit();
		}
	}

	function toStringWithComma(value) {
		let result = value.toFixed(0);
		for (let i = result.length - 3; i > 0; i -= 3) {
			result = result.substring(0, i) + "," + result.substring(i);
		}
		return result;
	}

	function postResult() {
		if (status !== STATUS_RESULT) return;
		const params = new URLSearchParams();
		params.append("text", "『とっぱ』で" + toStringWithComma(gameMergeCount) +
			"回マージし、" + toStringWithComma(gameScore) + "点を獲得しました！");
		params.append("url", location.origin + location.pathname);
		params.append("hashtags", "ゲームとっぱ");
		elems.postLink.href = "https://twitter.com/intent/tweet?" + params.toString();
		elems.postLink.click();
	}

	elems.startButton.addEventListener("click", () => {
		gameStart();
	});

	elems.retryButton.addEventListener("click", () => {
		gameStart();
	});

	elems.postButton.addEventListener("click", () => {
		postResult();
	});

	function shouldPreventArrowDefault() {
		return status === STATUS_COUNTDOWN || status === STATUS_GAME || status === STATUS_FINISH;
	}

	window.addEventListener("keydown", (event) => {
		switch (event.key) {
			case " ":
				gameStart();
				event.preventDefault();
				break;
			case "ArrowLeft":
				gameMoveLeft();
				if (shouldPreventArrowDefault()) event.preventDefault();
				break;
			case "ArrowRight":
				gameMoveRight();
				if (shouldPreventArrowDefault()) event.preventDefault();
				break;
			case "ArrowUp":
				gameMoveUp();
				if (shouldPreventArrowDefault()) event.preventDefault();
				break;
			case "ArrowDown":
				gameMoveDown();
				if (shouldPreventArrowDefault()) event.preventDefault();
				break;
		}
	});

	const touchInfo = new Map();
	elems.gameArea.addEventListener("touchstart", (event) => {
		if (shouldPreventArrowDefault()) event.preventDefault();
		const newTouches = event.changedTouches;
		for (let i = 0; i < newTouches.length; i++) {
			const touch = newTouches[i];
			touchInfo.set(touch.id, {sx: touch.pageX, sy: touch.pageY});
		}
	});
	elems.gameArea.addEventListener("touchmove", (event) => {
		if (shouldPreventArrowDefault()) event.preventDefault();
		const updatedTouches = event.changedTouches;
		const threshold = elems.gameBoard.getBoundingClientRect().width / 12;
		for (let i = 0; i < updatedTouches.length; i++) {
			const touch = updatedTouches[i];
			const info = touchInfo.get(touch.id);
			if (info) {
				const dx = touch.pageX - info.sx, dy = touch.pageY - info.sy;
				let swipeDetected = false;
				if (Math.abs(dx) > Math.abs(dy) * 2) {
					if (dx >= threshold) {
						gameMoveRight();
						swipeDetected = true;
					}
					if (dx <= -threshold) {
						gameMoveLeft();
						swipeDetected = true;
					}
				}
				if (Math.abs(dy) > Math.abs(dx) * 2) {
					if (dy >= threshold) {
						gameMoveDown();
						swipeDetected = true;
					}
					if (dy <= -threshold) {
						gameMoveUp();
						swipeDetected = true;
					}
				}
				if (swipeDetected) touchInfo.delete(touch.id);
			}
		}
	});
	elems.gameArea.addEventListener("touchend", (event) => {
		if (shouldPreventArrowDefault()) event.preventDefault();
		const updatedTouches = event.changedTouches;
		for (let i = 0; i < updatedTouches.length; i++) {
			const touch = updatedTouches[i];
			touchInfo.delete(touch.id);
		}
	});
	elems.gameArea.addEventListener("touchcancel", (event) => {
		if (shouldPreventArrowDefault()) event.preventDefault();
		const updatedTouches = event.changedTouches;
		for (let i = 0; i < updatedTouches.length; i++) {
			const touch = updatedTouches[i];
			touchInfo.delete(touch.id);
		}
	});
});
