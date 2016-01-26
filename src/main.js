'use strict';

var utilities = require('utilities');

var roles = {
  attacker: require('attacker'),
  builder: require('builder'),
  explorer: require('explorer'),
  harvester: require('harvester'),
  mule: require('mule'),
  upgrader: require('upgrader')
};

// function spawnCreep(spawn, role) {
//   spawn.createCreep([
//     WORK,
//     WORK,
//     CARRY,
//     CARRY,
//     CARRY,
//     MOVE,
//     MOVE,
//     MOVE
//   ],
//   null,
//   {
//     role: role
//   });
// }

function doTowers() {
  var room = Game.spawns.Spawn1.room;
  var towers = room.find(FIND_MY_STRUCTURES,
    {filter: {structureType: STRUCTURE_TOWER}});

  var hostiles = room.find(FIND_HOSTILE_CREEPS);

  if (hostiles.length > 0) {
    Game.notify('Enemies spotted in room');

    towers.forEach(tower => tower.attack(hostiles[0]));

    return;
  }

  var damaged = utilities.creepsNeedingHealing();

  if (damaged.length) {
    towers.forEach(tower => tower.heal(damaged[0]));

    return;
  }

  var repairTargets = utilities.structuresNeedingRepair();

  if (repairTargets.length) {
    towers.forEach(tower => tower.repair(repairTargets[0]));

    return;
  }
}

var TICKS_CRITICAL = 200;
var TICKS_LOW = 300;
// var TICKS_MEDIUM = 700;
var TICKS_HIGH = 1000;

function needsRecharge(creep) {
  var spawn = Game.spawns.Spawn1;

  if (creep.ticksToLive <= TICKS_LOW) {
    creep.memory.recharging = true;
  } else if (creep.ticksToLive >= TICKS_HIGH &&
             !(spawn.memory.war && creep.memory.role === 'attacker')) {
    creep.memory.recharging = false;
  }

  return creep.memory.recharging;
}

// function counts() {
//   _(Game.creeps)
//   .groupBy(function (creep) {
//     return creep.memory.role;
//   })
//   .forEach(function (group, key) {
//     console.log(key, group.length);
//   })
//   .value();
// }

function pickupDroppedEnergy(creep) {
  if (creep.carry.energy < creep.carryCapacity &&
      !creep.memory.recharging) {
    var energy = creep.pos.findClosestByRange(FIND_DROPPED_ENERGY);

    if (energy) {
      creep.pickup(energy);
    }
  }
}

var ROLE_ORDER = {
  attacker: 3,
  builder: 1,
  harvester: 0,
  mule: 2,
  upgrader: 1
};

function rechargeOrder() {
  var creeps = _(Game.creeps)
    .filter(c => c.ticksToLive < TICKS_LOW || c.memory.recharging)
    .sortBy(c => ROLE_ORDER[c.memory.role])
    .value();

  if (creeps.length) {
    return creeps[0];
  }
}

function notifyCritical() {
  var critical = _.filter(Game.creeps, c => c.ticksToLive < TICKS_CRITICAL);

  if (critical.length) {
    Game.notify(`${critical.length} creep(s) going critical`);
  }
}

module.exports.loop = function () {
  notifyCritical();
  doTowers();

  var spawn = Game.spawns.Spawn1;
  var toRecharge = rechargeOrder();

  _.forEach(Game.creeps, function (creep) {
    if (needsRecharge(creep)) {
      if ((creep === toRecharge ||
           (creep.memory.role === 'attacker' && spawn.memory.war)) &&
             utilities.recharge(creep)) {
        return;
      }
    }

    // TODO: this uses lots of CPU
    pickupDroppedEnergy(creep);

    if (roles[creep.memory.role]) {
      roles[creep.memory.role](creep);
    }
  });
};
