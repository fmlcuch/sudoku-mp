import './styles/base.css';
import './styles/newspaper.css';
import { state } from './app/state';
import { createSocket } from './net/ws';
import type { ClientEvent, ServerEvent } from './shared/events';
import type { GameSnapshot, RoomSnapshot } from './shared/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

const socket = createSocket(handleServerEvent);

let selectedCell: { row: number; col: number } | null = null;

function send(event: ClientEvent) {
  socket.send(event);
}

function setScreen(screen: typeof state.screen) {
  state.screen = screen;
  render();
}

function handleServerEvent(event: ServerEvent) {
  if (event.type === 'room:error') {
    state.status = event.payload.message === 'connected' ? 'Připojeno.' : event.payload.message;
    state.connected = true;
  }

  if (event.type === 'room:state') {
    state.room = event.payload.room;
    state.selfId = event.payload.selfId;
    state.connected = true;
    state.screen = event.payload.room.players.length >= 2 ? 'game' : 'lobby';
    state.status = event.payload.room.players.length >= 2 ? 'Místnost je plná.' : 'Čeká se na soupeře.';
  }

  if (event.type === 'game:started') {
    state.room = event.payload.room;
    state.game = event.payload.game;
    state.screen = 'game';
    state.status = 'Hra začala.';
  }

  if (event.type === 'game:snapshot') {
    state.game = event.payload.game;
  }

  if (event.type === 'game:moveAccepted') {
    state.game = event.payload.game;
    state.status = `Zapsáno ${event.payload.value}.`;
  }

  if (event.type === 'game:moveRejected') {
    state.game = event.payload.game;
    state.status = event.payload.reason === 'wrong_value' ? 'Špatný tah: -1 bod' : event.payload.reason;
  }

  if (event.type === 'game:finished') {
    state.game = event.payload.game;
    state.screen = 'result';
    state.status = event.payload.winnerId ? 'Hra skončila.' : 'Remíza.';
  }

  render();
}

function currentPlayers(room?: RoomSnapshot | null) {
  return room?.players ?? [];
}

function renderBoard(game: GameSnapshot) {
  const cells: string[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = game.board[r][c];
      const fixed = game.puzzle[r][c] !== 0;
      const selected = selectedCell?.row === r && selectedCell?.col === c;
      const related = selectedCell && (selectedCell.row === r || selectedCell.col === c || (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3)));
      cells.push(`
        <button class="board-cell ${fixed ? 'fixed' : ''} ${selected ? 'selected' : ''} ${related ? 'related' : ''} ${c % 3 === 2 ? 'block-right' : ''} ${r % 3 === 2 ? 'block-bottom' : ''}" data-row="${r}" data-col="${c}">
          ${value || ''}
        </button>
      `);
    }
  }

  return `<div class="board">${cells.join('')}</div>`;
}

function renderKeypad() {
  return `
    <div class="keypad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="digit" data-value="${n}">${n}</button>`).join('')}
    </div>
  `;
}

function renderScore(room: RoomSnapshot | null, game: GameSnapshot | null) {
  if (!room || !game) return '';
  return `
    <div class="scoreboard">
      ${room.players.map(player => `
        <div class="score-row">
          <span>${player.name}</span>
          <strong>${game.scores[player.sessionId] ?? 0}</strong>
          <small>${game.mistakes[player.sessionId] ?? 0} chyb</small>
        </div>
      `).join('')}
    </div>
  `;
}

function render() {
  const room = state.room;
  const game = state.game;

  app.innerHTML = `
    <main class="shell">
      <header class="masthead">
        <p class="eyebrow">Sudoku Multiplayer</p>
        <h1>Newspaper challenge</h1>
        <p>${state.status}</p>
      </header>

      ${state.screen === 'start' ? `
        <section class="card">
          <label>Jméno<br><input id="name" value="${state.name}" /></label>
          <label>Obtížnost<br>
            <select id="difficulty">
              <option value="easy" ${state.difficulty === 'easy' ? 'selected' : ''}>Lehká</option>
              <option value="medium" ${state.difficulty === 'medium' ? 'selected' : ''}>Střední</option>
              <option value="hard" ${state.difficulty === 'hard' ? 'selected' : ''}>Těžká</option>
            </select>
          </label>
          <div class="actions">
            <button id="create">Vytvořit místnost</button>
            <input id="code" placeholder="Kód místnosti" />
            <button id="join">Připojit se</button>
          </div>
        </section>
      ` : ''}

      ${state.screen === 'lobby' ? `
        <section class="card">
          <h2>Lobby</h2>
          <p>Kód: <strong>${room?.code ?? ''}</strong></p>
          <p>Hráči: ${currentPlayers(room).map(p => p.name).join(', ') ?? ''}</p>
          <button id="leave">Opustit</button>
        </section>
      ` : ''}

      ${state.screen === 'game' && game ? `
        <section class="game-layout">
          <div class="card">
            <div class="board-head">
              <strong>Kód: ${room?.code ?? ''}</strong>
              <span>${game.status === 'finished' ? 'Hotovo' : 'Hraje se'}</span>
            </div>
            ${renderBoard(game)}
          </div>
          <div class="card sidepanel">
            <h2>Skóre</h2>
            ${renderScore(room, game)}
            ${renderKeypad()}
            <button id="leave">Opustit</button>
          </div>
        </section>
      ` : ''}

      ${state.screen === 'result' && game ? `
        <section class="card">
          <h2>Výsledek</h2>
          <p>Hra skončila.</p>
          ${renderScore(room, game)}
          <div class="actions">
            <button id="rematch">Rematch</button>
            <button id="leave">Zpět</button>
          </div>
        </section>
      ` : ''}
    </main>
  `;

  const nameInput = document.querySelector<HTMLInputElement>('#name');
  if (nameInput) nameInput.oninput = () => { state.name = nameInput.value; };

  const difficultyInput = document.querySelector<HTMLSelectElement>('#difficulty');
  if (difficultyInput) difficultyInput.onchange = () => { state.difficulty = difficultyInput.value as typeof state.difficulty; };

  const createBtn = document.querySelector<HTMLButtonElement>('#create');
  if (createBtn) createBtn.onclick = () => {
    state.status = 'Vytvářím místnost...';
    send({ type: 'room:create', payload: { name: state.name, difficulty: state.difficulty } });
    setScreen('lobby');
  };

  const joinBtn = document.querySelector<HTMLButtonElement>('#join');
  const codeInput = document.querySelector<HTMLInputElement>('#code');
  if (joinBtn && codeInput) joinBtn.onclick = () => {
    state.roomCode = codeInput.value.trim().toUpperCase();
    state.status = 'Připojuji se...';
    send({ type: 'room:join', payload: { name: state.name, code: state.roomCode } });
    setScreen('lobby');
  };

  const rematchBtn = document.querySelector<HTMLButtonElement>('#rematch');
  if (rematchBtn) rematchBtn.onclick = () => {
    state.status = 'Požadavek na rematch...';
    send({ type: 'game:rematch', payload: { roomCode: state.room?.code } });
  };

  const leaveBtn = document.querySelectorAll<HTMLButtonElement>('#leave');
  leaveBtn.forEach(btn => {
    btn.onclick = () => {
      send({ type: 'room:leave', payload: { roomCode: state.room?.code } });
      state.room = null;
      state.game = null;
      selectedCell = null;
      setScreen('start');
      state.status = 'Opustil jsi místnost.';
      render();
    };
  });

  document.querySelectorAll<HTMLButtonElement>('.board-cell').forEach(btn => {
    btn.onclick = () => {
      selectedCell = { row: Number(btn.dataset.row), col: Number(btn.dataset.col) };
      render();
    };
  });

  document.querySelectorAll<HTMLButtonElement>('.digit').forEach(btn => {
    btn.onclick = () => {
      if (!selectedCell || !state.room) return;
      send({ type: 'game:move', payload: { roomCode: state.room?.code, row: selectedCell.row, col: selectedCell.col, value: Number(btn.dataset.value) } });
    };
  });
}

render();
