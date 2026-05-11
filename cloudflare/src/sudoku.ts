type Grid = number[][];

function emptyGrid(fill = 0): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(fill));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(board: Grid, row: number, col: number, num: number) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

function fillBoard(board: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] !== 0) continue;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const num of nums) {
        if (isValid(board, row, col, num)) {
          board[row][col] = num;
          if (fillBoard(board)) return true;
          board[row][col] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function countSolutions(board: Grid, limit = 2) {
  let count = 0;

  function solve() {
    if (count >= limit) return;

    let row = -1;
    let col = -1;
    let minCandidates = 10;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        let candidateCount = 0;
        for (let n = 1; n <= 9; n++) {
          if (isValid(board, r, c, n)) candidateCount++;
        }
        if (candidateCount < minCandidates) {
          minCandidates = candidateCount;
          row = r;
          col = c;
        }
      }
    }

    if (row === -1) {
      count++;
      return;
    }

    for (let n = 1; n <= 9; n++) {
      if (!isValid(board, row, col, n)) continue;
      board[row][col] = n;
      solve();
      board[row][col] = 0;
      if (count >= limit) return;
    }
  }

  solve();
  return count;
}

const removals: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 40,
  medium: 50,
  hard: 58,
};

export function generateSudoku(difficulty: 'easy' | 'medium' | 'hard') {
  const full = emptyGrid();
  fillBoard(full);
  const solution = cloneGrid(full);

  const puzzle = cloneGrid(full);
  let removed = 0;
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));

  for (const index of cells) {
    if (removed >= removals[difficulty]) break;
    const r = Math.floor(index / 9);
    const c = index % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const testBoard = cloneGrid(puzzle);
    if (countSolutions(testBoard, 2) !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}
