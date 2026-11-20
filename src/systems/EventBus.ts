import { CreditBreakdown, EquipmentId, HudSnapshot } from '@/src/types/game';

export interface LevelEndPayload {
  victory: boolean;
  levelId: number;
  elapsedSec: number;
  alarmsTriggered: number;
  optionalCompleted: boolean;
  collectiblesFound: number;
  hiddenRoomsFound?: number;
  intelFound?: number;
  rank: 'S' | 'A' | 'B' | 'C';
  reason?: string;
  creditBreakdown?: CreditBreakdown;
  newBalance?: number;
}

export interface VirtualInputState {
  moveX: number;
  moveY: number;
  sprint: boolean;
  crouch: boolean;
}

type Listener<T> = (payload: T) => void;

class EventBusClass {
  private hudListeners = new Set<Listener<HudSnapshot>>();
  private endListeners = new Set<Listener<LevelEndPayload>>();
  private pauseListeners = new Set<Listener<void>>();
  private useEquipListeners = new Set<Listener<EquipmentId>>();
  private selectEquipListeners = new Set<Listener<EquipmentId>>();
  private actionListeners = new Set<Listener<'interact' | 'dodge' | 'crouch' | 'use_gadget'>>();
  private virtualInput: VirtualInputState = { moveX: 0, moveY: 0, sprint: false, crouch: false };

  public onHudUpdate(fn: Listener<HudSnapshot>): () => void {
    this.hudListeners.add(fn);
    return () => this.hudListeners.delete(fn);
  }

  public emitHudUpdate(snapshot: HudSnapshot): void {
    this.hudListeners.forEach((fn) => fn(snapshot));
  }

  public onLevelEnd(fn: Listener<LevelEndPayload>): () => void {
    this.endListeners.add(fn);
    return () => this.endListeners.delete(fn);
  }

  public emitLevelEnd(payload: LevelEndPayload): void {
    this.endListeners.forEach((fn) => fn(payload));
  }

  public onPauseRequest(fn: Listener<void>): () => void {
    this.pauseListeners.add(fn);
    return () => this.pauseListeners.delete(fn);
  }

  public emitPauseRequest(): void {
    this.pauseListeners.forEach((fn) => fn());
  }

  public onEquipTrigger(fn: Listener<EquipmentId>): () => void {
    this.useEquipListeners.add(fn);
    return () => this.useEquipListeners.delete(fn);
  }

  public triggerEquipment(id: EquipmentId): void {
    this.useEquipListeners.forEach((fn) => fn(id));
  }

  public onSelectEquip(fn: Listener<EquipmentId>): () => void {
    this.selectEquipListeners.add(fn);
    return () => this.selectEquipListeners.delete(fn);
  }

  public selectEquipment(id: EquipmentId): void {
    this.selectEquipListeners.forEach((fn) => fn(id));
  }

  public onActionTrigger(
    fn: Listener<'interact' | 'dodge' | 'crouch' | 'use_gadget'>
  ): () => void {
    this.actionListeners.add(fn);
    return () => this.actionListeners.delete(fn);
  }

  public triggerAction(action: 'interact' | 'dodge' | 'crouch' | 'use_gadget'): void {
    this.actionListeners.forEach((fn) => fn(action));
  }

  public setVirtualInput(partial: Partial<VirtualInputState>): void {
    this.virtualInput = { ...this.virtualInput, ...partial };
  }

  public getVirtualInput(): VirtualInputState {
    return this.virtualInput;
  }
}

export const EventBus = new EventBusClass();
