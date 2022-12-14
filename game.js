import {
  replayOutput,
  getRunning
} from "./main.js"
import{
  character,
  characterSprite,
  ghostCharacter,
  ghostCharacterSprite,
  stats,
  timeHeader,
  fpsText,
  map,
  mapGrid,
  camera
} from "./elements.js"
import Car from "./car.js"
import {
  displayDriftParticles,
  particles
} from "./graphics.js"

import {generateMiniMap,updateMiniMapPlayers} from "./mini-map.js"

let debug = 0;

// const ghostInput = 

let car = Car();
let ghostCar = Car();
let ghostStep = 0; //kind of like dubstep, but for ghosts. 
let replayExport = []

let secondsPassed = 0;
let oldTimeStamp = 0;

const times = []
let fps = 0;

const tilePixelCount = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--tile-pixel-count')
);
const carSize = tilePixelCount;
const held_directions = []; //State of which arrow keys we are holding down



/* Direction key state */
const directions = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
}
const keys = {
  38: directions.up,
  37: directions.left,
  39: directions.right,
  40: directions.down,
  87: directions.up,
  65: directions.left,
  68: directions.right,
  83: directions.down

}

let mapData = {map:[[1]],
replay:[[]]}; 
let rows;
let columns;
let spawn = {};


let pixelSize = parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
);
let gridCellSize = pixelSize * tilePixelCount;

let seconds = 0;
let timeString = "00:00:00";

let enableGhost = true;

// functions
const setEnableGhost = (check) => {
  enableGhost = check;
  check ? ghostCharacter.classList.remove("hidden") : ghostCharacter.classList.add("hidden")
}
const getEnableGhost = () => {return enableGhost}

const getTilePixelCount = () => {return tilePixelCount}

const updateCarSpawnPosition = () => {
  car.setX(spawn.x * tilePixelCount)
  car.setY(spawn.y * tilePixelCount)

  ghostCar.setX(spawn.x * tilePixelCount)
  ghostCar.setY(spawn.y * tilePixelCount)
}

const resetCarValues = () => {
  updateCarSpawnPosition();
  car.resetValues()
  ghostCar.resetValues();
  ghostStep = 0;
  seconds = 0;
  replayExport = [];
  console.log(replayExport);
}
const setMapData = (map,replay) => {
  mapData = {
    map:map,
    replay:replay
  };
  generateMap(mapData.map)
  generateMiniMap(mapData.map)
}
const getMapData = () => {return mapData}

const generateMap = (inputData) => {
  while (mapGrid.lastElementChild) {
      mapGrid.removeChild(mapGrid.lastElementChild);
  }

  for (let rowIndex in inputData) {
      let mapRow = document.createElement("div");
      let row = inputData[rowIndex];
      mapRow.classList.add("row");
      for (let cellDataIndex in row) {
          let mapCell = document.createElement("div");
          let cell = row[cellDataIndex];
          mapCell.classList.add("cell");
          if (cell == 0) {
              mapCell.classList.add("road");
          } else if (cell == 1) {
              mapCell.classList.add("wall");
          } else if (cell == 2) {
              mapCell.classList.add("dirt");
          } else if (cell == 3) {
              mapCell.classList.add("spawn");
              spawn.x = cellDataIndex;
              spawn.y = rowIndex;
          } else if (cell == 4) {
              mapCell.classList.add("finish-up");
          } else if (cell == 5) {
              mapCell.classList.add("finish-down");
          } else if (cell == 6) {
              mapCell.classList.add("bumper");
          }
          //put cell into row
          mapRow.appendChild(mapCell);
          columns = mapRow.childElementCount;
      }
      //put the row into the dom
      mapGrid.appendChild(mapRow);
      rows = mapGrid.childElementCount;
  }

  document.documentElement.style.setProperty("--rows", rows);
  document.documentElement.style.setProperty("--columns", columns);

  updateCarSpawnPosition();

}

const checkGameOver = (currentLap, maxLaps) => {
  if (currentLap >= maxLaps) {
      car.setEngineLock(true); //disbales acceleration
      ghostCar.setEngineLock(true); //disbales acceleration

      timeHeader.innerText = "FINAL TIME";
      timeHeader.classList.remove("current");
      timeHeader.classList.add("final")


      //paste replay array to export.
      replayOutput.innerText =  "[" + replayExport.map(frame => "\n[" + frame.map(command => "\"" + command + "\"" ) + "]") + "\n]";;
      window.changeMenu("finish")
  }
}


const incrementSeconds = () => {
  if (!car.getEngineLock()) {
      seconds += 1;
      var date = new Date(0);
      date.setSeconds(seconds); // specify value for SECONDS here
      timeString = date.toISOString().substring(11, 19);
  }
}
const placeGhost = (stepCount) => {
    let ghost_held_directions = mapData.replay[stepCount]

    if (ghost_held_directions) {
        //turn
        if (speed != 0) {
            if (ghost_held_directions.includes(directions.right)) {
                ghostCar.turn("right");
                ghostCar.setTurning(true)
            } else if (ghost_held_directions.includes(directions.left)) {
                ghostCar.turn("left");
                ghostCar.setTurning(true)
            }
            else{
              ghostCar.setTurning(false)
            }
            ghostCharacterSprite.style.transform = `rotate(${ghostCar.getAngle().facing}deg)`;
        }
  
        if (ghost_held_directions.includes(directions.down)) {
            ghostCar.accelerate(false)
        }
        if (ghost_held_directions.includes(directions.up)) {
            ghostCar.accelerate(true)
        }
  
    }

    ghostCar.updateAngleLock()
    ghostCar.stabalizeDriftForce();
    ghostCar.stabalizeAngle()
    ghostCar.updateUnderSteering();

  if (ghostCar.getSpeed() != 0) {
    ghostCar.collision(tilePixelCount, rows, columns, mapData.map)
      //friction
      ghostCar.applyFriction();
  }

  
  
  //understeering




  //Limits (gives the illusion of walls)
  //set the right and bottom limit to the image size in the dom

  const leftLimit = 0;
  const rightLimit = (columns * tilePixelCount) - carSize;
  const topLimit = 0;
  const bottomLimit = (rows * tilePixelCount) - carSize;
  if (ghostCar.getX() < leftLimit) {
    ghostCar.setX(leftLimit);
    ghostCar.reduceSpeed()
  }
  if (ghostCar.getX() > rightLimit) {
    ghostCar.setX(rightLimit);
    ghostCar.reduceSpeed()
  }
  if (ghostCar.getY() < topLimit) {
    ghostCar.setY(topLimit);
    ghostCar.reduceSpeed()
  }
  if (ghostCar.getY() > bottomLimit) {
    ghostCar.setY(bottomLimit);
    ghostCar.reduceSpeed()
  }

  ghostCharacter.style.transform = `translate3d( ${ghostCar.getX()*pixelSize}px, ${ghostCar.getY()*pixelSize}px, 0 )`;

}
const placeCharacter = () => {

  //update stats
  stats.time.innerHTML = timeString;
  stats.lap.innerHTML = `${car.getLap()}/${car.getMaxLaps()}`;
  stats.x.innerHTML = car.getX().toFixed(2);
  stats.y.innerHTML = car.getY().toFixed(2);
  stats.speed.innerHTML = car.getSpeed().toFixed(2);
  stats.angle.facing.innerHTML = car.getAngle().facing.toFixed(2);
  stats.angle.moving.innerHTML = car.getAngle().moving.toFixed(2);
  stats.driftForce.innerHTML = car.getDriftForce().toFixed(2);
  stats.underSteering.innerHTML = car.getUnderSteering().toFixed(2);
  stats.angleLock.left.innerHTML = car.getAngleLock().left;
  stats.angleLock.right.innerHTML = car.getAngleLock().right;
  stats.particleCount.innerHTML = particles.length;


  pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
  );

  gridCellSize = pixelSize * tilePixelCount;

  // check if a direction is being held


  
  if (held_directions.length > 0) {
      //turn
      if (speed != 0) {
          if (held_directions.includes(directions.right)) {
              car.turn("right");
              car.setTurning(true)
          } else if (held_directions.includes(directions.left)) {
              car.turn("left");
              car.setTurning(true)
          }
          else{
            car.setTurning(false)
          }
          characterSprite.style.transform = `rotate(${car.getAngle().facing}deg)`;
      }

      if (held_directions.includes(directions.down)) {
          car.accelerate(false)
      }
      if (held_directions.includes(directions.up)) {
          car.accelerate(true)
      }

  }

  replayExport.push([...held_directions])
  car.updateAngleLock()
  car.stabalizeDriftForce();
  car.stabalizeAngle()
  car.updateUnderSteering();
  displayDriftParticles(car.getX(), car.getY(), car.getDriftForce(), car.getOnDirt(), car.getAngle());


  if (car.getSpeed() != 0) {
      car.collision(tilePixelCount, rows, columns, mapData.map)
      //friction
      car.applyFriction();
  }

  
  
  //understeering




  //Limits (gives the illusion of walls)
  //set the right and bottom limit to the image size in the dom

  const leftLimit = 0;
  const rightLimit = (columns * tilePixelCount) - carSize;
  const topLimit = 0;
  const bottomLimit = (rows * tilePixelCount) - carSize;
  if (car.getX() < leftLimit) {
      car.setX(leftLimit);
      car.reduceSpeed()
  }
  if (car.getX() > rightLimit) {
      car.setX(rightLimit);
      car.reduceSpeed()
  }
  if (car.getY() < topLimit) {
      car.setY(topLimit);
      car.reduceSpeed()
  }
  if (car.getY() > bottomLimit) {
      car.setY(bottomLimit);
      car.reduceSpeed()
  }
  // console.log(x);

  const camera_left = pixelSize * camera.clientWidth/8;
  const camera_top = pixelSize * camera.clientHeight/8;

  map.style.transform = `translate3d( ${-car.getX()*pixelSize+camera_left}px, ${-car.getY()*pixelSize+camera_top}px, 0 )`;

  //place particles
  for (let particle of particles) {
      particle.element.style.transform = `translate3d( ${particle.x*pixelSize}px, ${particle.y*pixelSize}px , 0) rotate(${particle.angle}deg)`;
  }

  character.style.transform = `translate3d( ${car.getX()*pixelSize}px, ${car.getY()*pixelSize}px, 0 )`;


}
characterSprite.style.transform = `rotate(${car.getAngle().facing}deg)`;
ghostCharacterSprite.style.transform = `rotate(${ghostCar.getAngle().facing}deg)`;
const step = () => {
  const now = performance.now();
  while (times.length > 0 && times[0] <= now - 1000) {
    times.shift();
  }
  times.push(now);
  fps = times.length;
  fpsText.innerHTML = fps;
  
  placeCharacter();
  updateMiniMapPlayers(car,ghostCar);
  if(enableGhost){
    placeGhost(ghostStep);
    ghostStep++;
  }
  if(getRunning()){
    window.requestAnimationFrame(step)
  }
}


//listeners 

document.addEventListener("keydown", (e) => {

  const dir = keys[e.which];
  if (dir == "up" || dir == "down") {
      e.preventDefault();
  }
  if (dir && held_directions.indexOf(dir) === -1) {
      held_directions.unshift(dir)
  }
})

document.addEventListener("keyup", (e) => {
  const dir = keys[e.which];
  const index = held_directions.indexOf(dir);
  if (index > -1) {
      held_directions.splice(index, 1)
  }
});

export {
  generateMap,
  getTilePixelCount,
  getMapData,
  checkGameOver,
  incrementSeconds,
  step,
  resetCarValues,
  getEnableGhost,
  setEnableGhost,
  setMapData
}