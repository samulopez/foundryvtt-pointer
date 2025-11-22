import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PointerManager } from '../src/scripts/pointer-manager.js';

// Mock globals
global.game = {
    socket: {
        on: vi.fn(),
        emit: vi.fn(),
    },
    user: {
        id: 'user-1',
    },
    users: [],
};

global.Hooks = {
    on: vi.fn(),
};

global.canvas = {
    scene: {
        id: 'scene-1',
    },
    stage: {
        scale: { x: 1 },
    },
    controls: {
        addChild: vi.fn(),
        pointer: {
            destroy: vi.fn(),
            hidePointer: vi.fn(),
            movePointer: vi.fn(),
            ping: vi.fn(),
            getMouseWorldCoord: vi.fn(() => ({ x: 100, y: 100 })),
            updatePointerPosition: vi.fn(),
            showPointer: vi.fn(),
        },
    },
    animatePan: vi.fn(),
};

// Mock PointerContainer
vi.mock('../src/scripts/pixi/container.js', () => {
    return {
        PointerContainer: class {
            constructor() {}
        }
    };
});

describe('PointerManager', () => {
    let manager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new PointerManager();
    });

    it('should register hooks on init', () => {
        const instance = PointerManager.init();
        expect(game.socket.on).toHaveBeenCalledWith('module.pointer', expect.any(Function));
        expect(Hooks.on).toHaveBeenCalledWith('canvasReady', expect.any(Function));
    });

    it('should handle socket events', () => {
        manager.registerHooks();
        const socketHandler = game.socket.on.mock.calls[0][1]; // Get the bound handler

        // Test 'pointer' type
        socketHandler({ type: 'pointer', senderId: 'user-2', position: { x: 50, y: 50 }, sceneId: 'scene-1' });
        expect(canvas.controls.pointer.movePointer).toHaveBeenCalledWith('user-2', { x: 50, y: 50 });

        // Test 'ping' type
        socketHandler({ type: 'ping', senderId: 'user-2', position: { x: 200, y: 200 }, sceneId: 'scene-1' });
        expect(canvas.controls.pointer.ping).toHaveBeenCalled();

        // Test 'stop'
        socketHandler({ stop: true, senderId: 'user-2' });
        expect(canvas.controls.pointer.hidePointer).toHaveBeenCalledWith('user-2');
    });

    it('should emit socket event on ping', () => {
        manager.ping({ position: { x: 300, y: 300 }, force: true });
        expect(game.socket.emit).toHaveBeenCalledWith('module.pointer', expect.objectContaining({
            type: 'ping',
            senderId: 'user-1',
            position: { x: 300, y: 300 },
            force: true
        }));
        expect(canvas.animatePan).toHaveBeenCalled();
    });

    it('should start and stop tracking', () => {
        manager.start();
        expect(canvas.controls.pointer.showPointer).toHaveBeenCalledWith('user-1');

        manager.stop();
        expect(canvas.controls.pointer.hidePointer).toHaveBeenCalledWith('user-1');
        expect(game.socket.emit).toHaveBeenCalledWith('module.pointer', expect.objectContaining({
            stop: true,
            senderId: 'user-1'
        }));
    });
});
