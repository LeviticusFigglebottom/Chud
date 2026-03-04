import { GameEngine } from '../engine/GameEngine';
import { Unit, Building, Entity, Projectile, Vector2 } from '../engine/types';

export class CombatSystem {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  update(dt: number): void {
    for (const [, entity] of this.engine.state.entities) {
      if (entity.type !== 'unit') continue;
      const unit = entity as Unit;
      if (unit.state === 'dead' || unit.hp <= 0) continue;

      // Auto-acquire targets when idle
      if (unit.state === 'idle' || unit.state === 'patrolling') {
        const enemy = this.findNearestEnemy(unit);
        if (enemy && this.engine.distanceBetween(unit.position, enemy.position) <= unit.sightRange) {
          unit.targetEntity = enemy.id;
          unit.state = 'attacking';
        }
      }

      // Process attacking
      if (unit.state === 'attacking' && unit.targetEntity) {
        const target = this.engine.state.entities.get(unit.targetEntity);
        if (!target || target.hp <= 0) {
          unit.targetEntity = undefined;
          unit.state = 'idle';
          continue;
        }

        const dist = this.engine.distanceBetween(unit.position, target.position);

        if (dist <= unit.attackRange) {
          // In range - attack
          unit.path = [];
          if (unit.attackCooldown <= 0) {
            this.performAttack(unit, target);
            unit.attackCooldown = 1 / unit.attackSpeed;
          }
        } else {
          // Chase target
          unit.path = this.engine.pathFinder.findPath(unit.position, target.position);
        }
      }
    }
  }

  private performAttack(attacker: Unit, target: Entity): void {
    if (attacker.attackRange > 80) {
      // Ranged attack - spawn projectile
      this.spawnProjectile(attacker, target);
    } else {
      // Melee attack - instant damage
      this.applyDamage(target as Unit | Building, attacker.damage);
    }
  }

  private spawnProjectile(source: Unit, target: Entity): void {
    const proj: Projectile = {
      id: `proj_${Date.now()}_${Math.random()}`,
      type: 'projectile',
      faction: source.faction,
      position: { ...source.position },
      size: { x: 4, y: 4 },
      hp: 1,
      maxHp: 1,
      armor: 0,
      visible: true,
      selected: false,
      sourceId: source.id,
      targetId: target.id,
      targetPos: { ...target.position },
      speed: 400,
      damage: source.damage,
    };
    this.engine.state.entities.set(proj.id, proj);
  }

  applyDamage(target: Unit | Building, rawDamage: number): void {
    const damage = Math.max(1, rawDamage - target.armor);
    target.hp -= damage;

    if (target.hp <= 0) {
      target.hp = 0;
      if (target.type === 'unit') {
        (target as Unit).state = 'dead';
        // Remove after death animation delay
        setTimeout(() => this.engine.removeEntity(target.id), 1000);
      } else if (target.type === 'building') {
        (target as Building).state = 'destroyed';
        setTimeout(() => this.engine.removeEntity(target.id), 500);
      }
    }
  }

  private findNearestEnemy(unit: Unit): Entity | null {
    const owner = this.engine.getEntityOwner(unit.id);
    if (!owner) return null;

    let nearest: Entity | null = null;
    let nearestDist = Infinity;

    for (const [, entity] of this.engine.state.entities) {
      if (entity.type === 'projectile') continue;
      if (entity.hp <= 0) continue;
      const entityOwner = this.engine.getEntityOwner(entity.id);
      if (!entityOwner || entityOwner.teamId === owner.teamId) continue;

      const dist = this.engine.distanceBetween(unit.position, entity.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = entity;
      }
    }
    return nearest;
  }
}
