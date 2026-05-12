// Multi-floor map logic for breach minigame
// Each floor is a separate map object, with stairs up/down and terminals

function generateFloors(floorCount = 3) {
  // Returns an array of floor objects
  const floors = [];
  for (let i = 0; i < floorCount; ++i) {
    const floor = generateSingleFloor(i, floorCount);
    floors.push(floor);
  }
  // Link stairs
  for (let i = 0; i < floors.length; ++i) {
    if (i > 0) floors[i].stairsDown = { to: i - 1 };
    if (i < floors.length - 1) floors[i].stairsUp = { to: i + 1 };
  }
  return floors;
}

function generateSingleFloor(idx, total) {
  // Placeholder: generate rooms, terminals, enemies, etc.
  // Top floor gets main terminal and locked door
  // Lower floors may get code terminal
  return {
    id: `floor${idx}`,
    idx,
    rooms: [], // TODO: fill with room/terminal data
    hasMainTerminal: idx === total - 1,
    hasCodeTerminal: false, // set later
    stairsUp: null,
    stairsDown: null,
  };
}

module.exports = { generateFloors };
