import Room from "./Room";
import { Sprite, Container, Point, Texture } from "pixi.js";
import BobbaEnvironment from "../BobbaEnvironment";
import MainEngine from "../graphics/MainEngine";
import { ROOM_TILE_WIDTH, ROOM_TILE_HEIGHT, ROOM_SELECTED_TILE, ROOM_TILE, ROOM_WALL_L, ROOM_WALL_R, ROOM_WALL_DOOR_EXTENDED_L, ROOM_WALL_DOOR_EXTENDED_L_OFFSET_X, ROOM_WALL_DOOR_EXTENDED_L_OFFSET_Y, ROOM_WALL_L_OFFSET_X, ROOM_WALL_L_OFFSET_Y, ROOM_WALL_R_OFFSET_X, ROOM_WALL_R_OFFSET_Y } from "../graphics/GenericSprites";
import RequestMovement from "../communication/outgoing/rooms/RequestMovement";
import FloorItem from "./items/FloorItem";
import RoomItem from "./items/RoomItem";
import { Direction } from "../imagers/furniture/FurniImager";

const CAMERA_CENTERED_OFFSET_X = 3;
const CAMERA_CENTERED_OFFSET_Y = 114;

const ROOM_SELECTED_TILE_OFFSET_X = 0;
const ROOM_SELECTED_TILE_OFFSET_Y = -3;

export default class RoomEngine {
    room: Room;
    container: Container;
    selectableContainer: Container;
    floorSprites: Sprite[];
    wallSprites: Sprite[];
    selectedTileSprite?: Sprite;
    lastMousePositionX: number;
    lastMousePositionY: number;
    userSprites: ContainerDictionary;
    shadowSprites: ContainerDictionary;
    roomItemSprites: ContainerArrayDictionary;
    selectableSprites: ContainerArrayDictionary;
    selectableItems: SelectableDictionary;
    currentSelectedItem?: Selectable | null;
    movingItem: RoomItem | null;
    movingItemPosition: { x: number, y: number, z: number, rot: Direction };

    constructor(room: Room) {
        this.room = room;
        this.container = new Container();
        this.selectableContainer = new Container();
        this.floorSprites = [];
        this.wallSprites = [];
        this.userSprites = {};
        this.shadowSprites = {};
        this.roomItemSprites = {};
        this.selectableSprites = {};
        this.selectableItems = {};
        this.lastMousePositionX = 0;
        this.lastMousePositionY = 0;

        this.movingItem = null;
        this.movingItemPosition = { x: 0, y: 0, z: 0, rot: 0 };

        this.container.sortableChildren = true;
        this.selectableContainer.sortableChildren = true;
        this.onResize();
        this.setWalls();
        this.setFloor();
        this.setSelectedTile();
    }

    onResize() {
        this.centerCamera();
    }

    centerCamera() {
        const model = this.room.model;
        this.container.x = Math.round((MainEngine.getViewportWidth() - (ROOM_TILE_WIDTH * (model.maxX - model.maxY + CAMERA_CENTERED_OFFSET_X))) / 2);
        this.container.y = Math.round((MainEngine.getViewportHeight() - ((model.maxX + model.maxY) * ROOM_TILE_HEIGHT) + CAMERA_CENTERED_OFFSET_Y) / 2);

        this.selectableContainer.x = this.container.x;
        this.selectableContainer.y = this.container.y;
    }

    setSelectedTile() {
        const floorTexture = BobbaEnvironment.getGame().engine.getTexture(ROOM_SELECTED_TILE);
        this.selectedTileSprite = new Sprite(floorTexture);
        this.selectedTileSprite.visible = false;
        this.container.addChild(this.selectedTileSprite);
    }

    setChatContainer(container: Container) {
        container.zIndex = calculateZIndexChat();
        this.container.addChild(container);
    }

    addUserContainer(id: number, container: Container, shadowSprite: Sprite) {
        this.userSprites[id] = container;
        this.shadowSprites[id] = shadowSprite;
        this.container.addChild(container);
        this.container.addChild(shadowSprite);
    }

    addRoomItemContainerSet(id: number, containers: Container[]) {
        this.roomItemSprites[id] = containers;
        for (let container of containers) {
            this.container.addChild(container);
        }
    }

    addSelectableContainer(colorId: number, selectableContainers: Container[], selectableElement: Selectable) {
        this.selectableSprites[colorId] = selectableContainers;
        this.selectableItems[colorId] = selectableElement;

        for (let container of selectableContainers) {
            this.selectableContainer.addChild(container);
        }
    }

    startRoomItemMove(roomItem: RoomItem) {
        this.cancelRoomItemMove();
        this.movingItem = roomItem;
        this.movingItemPosition = { x: roomItem._x, y: roomItem._y, z: roomItem._z, rot: roomItem.rot };
        this.movingItem.startMovement();
    }

    cancelRoomItemMove() {
        if (this.movingItem != null) {
            const { x, y, z, rot } = this.movingItemPosition;
            this.movingItem.updatePosition(x, y, z, rot, false);
            this.movingItem.stopMovement();
            this.room.roomItemManager.cancelRoomItemMovement(this.movingItem);
            this.movingItem = null;
        }
    }

    finishRoomItemMovement(globalX: number, globalY: number) {
        if (this.movingItem != null) {
            if (this.movingItem instanceof FloorItem) {
                const { x, y } = this.globalToTile(globalX, globalY);
                if (this.canPlaceFloorItem(x, y, this.movingItem)) {
                    this.movingItem.updatePosition(x, y, 0, this.movingItemPosition.rot, false);
                    this.room.roomItemManager.finishRoomItemMovement(this.movingItem);
                } else {
                    this.cancelRoomItemMove();
                }
            } else {
                const { x, y } = this.globalToLocal(globalX, globalY);
                if (this.canPlaceWallItem(globalX, globalY)) {
                    this.movingItem.updatePosition(x, y, 0, this.calculateWallDirection(globalX, globalY), false);
                    this.room.roomItemManager.finishRoomItemMovement(this.movingItem);
                } else {
                    this.cancelRoomItemMove();
                }
            }
            this.movingItem = null;
        }
    }

    isMovingRoomItem() {
        return this.movingItem != null;
    }

    updateMovingItem(globalX: number, globalY: number) {
        if (this.movingItem != null) {
            if (this.movingItem instanceof FloorItem) {
                const { x, y } = this.globalToTile(globalX, globalY);
                if (this.canPlaceFloorItem(x, y, this.movingItem)) {
                    this.movingItem.updatePosition(x, y, 0, this.movingItemPosition.rot, false);
                } else {
                    const local = this.globalToLocal(globalX, globalY);
                    this.movingItem.updatePosition(local.x, local.y, 0, this.movingItemPosition.rot, true);
                }
            } else {
                const { x, y } = this.globalToLocal(globalX, globalY);
                if (this.canPlaceWallItem(globalX, globalY)) {
                    this.movingItem.updatePosition(x, y, 0, this.calculateWallDirection(globalX, globalY), false);
                } else {
                    this.movingItem.updatePosition(x, y, 0, this.calculateWallDirection(globalX, globalY), true);
                }
            }
        }
    }

    calculateWallDirection(globalX: number, globalY: number): Direction {
        const local = this.globalToLocal(globalX, globalY);
        const { x } = this.localToWall(local.x, local.y);
        if (x < 2) {
            return 2;
        }
        return 4;
    }

    canPlaceWallItem(globalX: number, globalY: number): boolean {
        const local = this.globalToLocal(globalX, globalY);
        const wall = this.localToWall(local.x, local.y);
        const invertedWall = this.localToWall(-local.x, local.y);
        const { model } = this.room;

        if (wall.x > 2) {
            return wall.x < model.maxX + 0.5 && wall.y > -3 && wall.y < -1;
        } else {
            return invertedWall.x < model.maxY - 2.5 && invertedWall.y > -1 && invertedWall.y < 1;
        }
    }

    canPlaceFloorItem(tileX: number, tileY: number, floorItem: FloorItem): boolean {
        const { model } = this.room;
        let maxX = tileX;
        let maxY = tileY;
        if (floorItem.baseItem != null) {
            const first = parseInt(floorItem.baseItem.furniBase.offset.logic.dimensions.x);
            const second = parseInt(floorItem.baseItem.furniBase.offset.logic.dimensions.y);
            if (first > 1) {
                if (floorItem.rot === 0 || floorItem.rot === 4) {
                    maxX += first - 1;
                }
                if (floorItem.rot === 2 || floorItem.rot === 6) {
                    maxY += first - 1;
                }
            }
            if (second > 1) {
                if (floorItem.rot === 0 || floorItem.rot === 4) {
                    maxY += first - 1;
                }
                if (floorItem.rot === 2 || floorItem.rot === 6) {
                    maxX += first - 1;
                }
            }
        }
        return model.isValidTile(tileX, tileY) && model.isValidTile(maxX, maxY);
    }

    removeSelectableContainer(colorId: number) {
        const containers = this.selectableSprites[colorId];
        if (containers != null) {
            for (let container of containers) {
                this.selectableContainer.removeChild(container);
            }
            delete (this.selectableSprites[colorId]);
        }

        const items = this.selectableItems[colorId];
        if (items != null) {
            delete (this.selectableItems[colorId]);
        }
    }

    removeRoomItemContainerSet(id: number) {
        const containers = this.roomItemSprites[id];
        if (containers != null) {
            for (let container of containers) {
                this.container.removeChild(container);
            }
            delete (this.roomItemSprites[id]);
        }
    }

    removeUserSprite(id: number) {
        const sprite = this.userSprites[id];
        const shadowSprite = this.shadowSprites[id];
        if (sprite != null) {
            this.container.removeChild(sprite);
            delete (this.userSprites[id]);
        }
        if (shadowSprite != null) {
            this.container.removeChild(shadowSprite);
            delete (this.shadowSprites[id]);
        }
    }

    _addWallSprite(texture: Texture, x: number, y: number, offsetX: number, offsetY: number, priority: number) {
        const currentSprite = new Sprite(texture);
        const localPos = this.tileToLocal(x, y, 0);
        currentSprite.x = localPos.x + offsetX;
        currentSprite.y = localPos.y + offsetY;
        currentSprite.zIndex = calculateZIndex(x, y, 0, priority);
        this.wallSprites.push(currentSprite);
        this.container.addChild(currentSprite);
    }

    setWalls() {
        const wall_r = BobbaEnvironment.getGame().engine.getTexture(ROOM_WALL_R);
        const wall_l = BobbaEnvironment.getGame().engine.getTexture(ROOM_WALL_L);
        const wall_door_extended_l = BobbaEnvironment.getGame().engine.getTexture(ROOM_WALL_DOOR_EXTENDED_L);
        const model = this.room.model;
        for (let i = 0; i < model.maxY; i++) {
            if (model.doorY === i) {
                this._addWallSprite(wall_door_extended_l, 1, i, ROOM_WALL_DOOR_EXTENDED_L_OFFSET_X, ROOM_WALL_DOOR_EXTENDED_L_OFFSET_Y, PRIORITY_WALL);
            } else if (model.doorY - 1 !== i) {
                this._addWallSprite(wall_l, 1, i, ROOM_WALL_L_OFFSET_X, ROOM_WALL_L_OFFSET_Y, PRIORITY_WALL);
            }
        }
        for (let i = 1; i < this.room.model.maxX; i++) {
            this._addWallSprite(wall_r, i, 1, ROOM_WALL_R_OFFSET_X, ROOM_WALL_R_OFFSET_Y, PRIORITY_WALL);
        }
    }

    setFloor() {
        const floorTexture = BobbaEnvironment.getGame().engine.getTexture(ROOM_TILE);
        this.floorSprites = [];
        const model = this.room.model;
        for (let i = 0; i < model.maxX; i++) {
            for (let j = 0; j < model.maxY; j++) {
                const tile = model.heightMap[i][j];
                if (tile > 0) {
                    const currentSprite = new Sprite(floorTexture);
                    const localPos = this.tileToLocal(i, j, 0);
                    currentSprite.x = localPos.x;
                    currentSprite.y = localPos.y;

                    currentSprite.zIndex = calculateZIndex(i, j, 0, model.doorX === i && model.doorY === j ? PRIORITY_DOOR_FLOOR : PRIORITY_FLOOR);
                    this.floorSprites.push(currentSprite);
                    this.container.addChild(currentSprite);
                }
            }
        }
    }

    tileToLocal(x: number, y: number, z: number): Point {
        return new Point((x - y) * ROOM_TILE_WIDTH, (x + y) * ROOM_TILE_HEIGHT - (z * ROOM_TILE_HEIGHT * 2));
    }

    globalToTile(x: number, y: number): Point {
        const offsetX = this.container.x;
        const offsetY = this.container.y;

        const xminusy = (x - ROOM_TILE_WIDTH - offsetX) / ROOM_TILE_WIDTH;
        const xplusy = (y - offsetY) / ROOM_TILE_HEIGHT;

        const tileX = Math.floor((xminusy + xplusy) / 2);
        const tileY = Math.floor((xplusy - xminusy) / 2);

        return new Point(tileX, tileY);
    }

    localToWall(localX: number, localY: number): Point {
        const x = localX / 32;
        const y = (localY / 32) - (localX / 64);

        return new Point(x, y);
    }

    globalToLocal(x: number, y: number): Point {
        const offsetX = this.container.x;
        const offsetY = this.container.y;
        return new Point(x - offsetX, y - offsetY);
    }

    handleMouseMovement = (mouseX: number, mouseY: number, isDrag: boolean) => {
        const { x, y } = this.globalToTile(mouseX, mouseY);
        const colorId = this.getSelectableColorId(mouseX, mouseY);
        let selectable = null;
        if (colorId !== -1) {
            selectable = this.selectableItems[colorId];

            if (selectable != null) {
                selectable.handleHover(colorId);
            }
        }

        if (isDrag) {
            const diffX = Math.round(this.lastMousePositionX - mouseX);
            const diffY = Math.round(this.lastMousePositionY - mouseY);
            this.container.x -= diffX;
            this.container.y -= diffY;
            this.selectableContainer.x = this.container.x;
            this.selectableContainer.y = this.container.y;
        }
        this.lastMousePositionX = Math.round(mouseX);
        this.lastMousePositionY = Math.round(mouseY);
        this.updateSelectedTile(x, y);
        this.updateMovingItem(mouseX, mouseY);
    }

    getSelectableColorId(mouseX: number, mouseY: number): number {
        const pixels = BobbaEnvironment.getGame().engine.logicPixiApp.renderer.extract.pixels(this.getLogicStage());

        const bounds = this.getLogicStage().getBounds();
        const stageX = Math.floor(mouseX - bounds.x);
        const stageY = Math.floor(mouseY - bounds.y);
        const pos = (stageY * bounds.width + stageX) * 4;
        if (stageX >= 0 && stageY >= 0 && stageX <= bounds.width && stageY <= bounds.height) {
            const colorId = rgb2int(pixels[pos], pixels[pos + 1], pixels[pos + 2]);
            return colorId;
        }
        return -1;
    }

    handleMouseClick = (mouseX: number, mouseY: number, shiftKey: boolean, ctrlKey: boolean, altKey: boolean): Selectable | null => {
        const { x, y } = this.globalToTile(mouseX, mouseY);
        const isValidTile = this.room.model.isValidTile(x, y);
        if (this.isMovingRoomItem()) {
            this.finishRoomItemMovement(mouseX, mouseY);
            return null;
        }
        const colorId = this.getSelectableColorId(mouseX, mouseY);
        let selectable = null;

        if (colorId !== -1) {
            selectable = this.selectableItems[colorId];

            if (selectable != null) {
                if (shiftKey) {
                    if (selectable instanceof FloorItem) {
                        selectable.rotate();
                    }
                } else if (ctrlKey) {
                    if (selectable instanceof RoomItem) {
                        selectable.pickUp();
                    }
                } else if (altKey) {
                    if (selectable instanceof RoomItem) {
                        this.startRoomItemMove(selectable);
                    }
                }

                selectable.handleClick(colorId);
            }
        }

        if (isValidTile) {
            BobbaEnvironment.getGame().communicationManager.sendMessage(new RequestMovement(x, y));
        }

        BobbaEnvironment.getGame().uiManager.onFocusChat();
        return selectable;
    }

    handleTouchMove = (mouseX: number, mouseY: number) => {
        mouseX = Math.floor(mouseX);
        mouseY = Math.floor(mouseY);
        this.handleMouseMovement(mouseX, mouseY, true);
    }

    handleTouchStart = (mouseX: number, mouseY: number) => {
        mouseX = Math.floor(mouseX);
        mouseY = Math.floor(mouseY);
        this.handleMouseMovement(mouseX, mouseY, false);
        const newSelectedItem = this.handleMouseClick(mouseX, mouseY, false, false, false);

        if (newSelectedItem === this.currentSelectedItem) {
            this.handleMouseDoubleClick(mouseX, mouseY);
        }
        this.currentSelectedItem = newSelectedItem;
    }

    handleMouseDoubleClick = (mouseX: number, mouseY: number) => {
        const { x, y } = this.globalToTile(mouseX, mouseY);
        const colorId = this.getSelectableColorId(mouseX, mouseY);
        const selectable = this.selectableItems[colorId];
        if (selectable != null) {
            selectable.handleDoubleClick(colorId);
        } else if (!this.room.model.isValidTile(x, y)) {
            this.centerCamera();
        }
    }

    updateSelectedTile(tileX: number, tileY: number) {
        const model = this.room.model;
        const localPos = this.tileToLocal(tileX, tileY, 0);
        if (this.selectedTileSprite != null) {
            this.selectedTileSprite.visible = model.isValidTile(tileX, tileY);
            this.selectedTileSprite.x = localPos.x + ROOM_SELECTED_TILE_OFFSET_X;
            this.selectedTileSprite.y = localPos.y + ROOM_SELECTED_TILE_OFFSET_Y;

            this.selectedTileSprite.zIndex = calculateZIndex(tileX, tileY, 0, model.doorX === tileX && model.doorY === tileY ? PRIORITY_DOOR_FLOOR_SELECT : PRIORITY_FLOOR_SELECT);
        }
    }

    tick(delta: number) {

    }

    getStage() {
        return this.container;
    }

    getLogicStage() {
        return this.selectableContainer;
    }

    calculateZIndexUser(x: number, y: number, z: number): number {
        const model = this.room.model;
        return _calculateZIndexUser(x, y, z, model.doorX === x && model.doorY === y ? PRIORITY_DOOR_FLOOR_PLAYER : PRIORITY_PLAYER);
    }

    calculateZIndexUserShadow(x: number, y: number, z: number): number {
        const model = this.room.model;
        return _calculateZIndexUser(x, y, z, model.doorX === x && model.doorY === y ? PRIORITY_DOOR_FLOOR_PLAYER_SHADOW : PRIORITY_PLAYER_SHADOW);
    }
}

interface ContainerDictionary {
    [id: number]: Container;
}

interface ContainerArrayDictionary {
    [id: number]: Container[];
}

export interface Selectable {
    handleClick(id: number): void,
    handleDoubleClick(id: number): void,
    handleHover(id: number): void,
}

interface SelectableDictionary {
    [id: number]: Selectable;
}

export const calculateZIndex = (x: number, y: number, z: number, priority: number): number => {
    return ((x + y) * (COMPARABLE_X_Y) + (z * (COMPARABLE_Z))) + PRIORITY_MULTIPLIER * priority;
};

const _calculateZIndexUser = (x: number, y: number, z: number, priority: number): number => {
    return calculateZIndex(Math.floor(x), Math.floor(y), z + 0.001, priority);
};

export const calculateZIndexFloorItem = (x: number, y: number, z: number, zIndex: number, layerId: number): number => {
    const compareY = (Math.trunc(zIndex / 100)) / 10;
    return calculateZIndex(x, y + compareY, z, PRIORITY_ROOM_ITEM);
};

export const calculateZIndexWallItem = (id: number, x: number, y: number, zIndex: number, layerId: number): number => {
    return (id * COMPARABLE_Z) + layerId + (PRIORITY_MULTIPLIER * PRIORITY_WALL_ITEM);
    //TODO: check this
};

export const rgb2int = (r: number, g: number, b: number) => {
    return (r << 16) + (g << 8) + (b);
};

export const calculateZIndexChat = () => PRIORITY_CHAT * PRIORITY_MULTIPLIER;

const PRIORITY_DOOR_FLOOR = 1;
const PRIORITY_DOOR_FLOOR_SELECT = 2;
const PRIORITY_DOOR_FLOOR_PLAYER_SHADOW = 3;
const PRIORITY_DOOR_FLOOR_PLAYER = 4;
//const PRIORITY_DOOR_WALL = 5;
const PRIORITY_WALL = 6;
const PRIORITY_FLOOR = 7;
const PRIORITY_PLAYER_SHADOW = 8;
const PRIORITY_WALL_ITEM = 9;
const PRIORITY_FLOOR_SELECT = 11;
const PRIORITY_PLAYER = 11;
const PRIORITY_ROOM_ITEM = 11;
//const PRIORITY_SIGN = 12;
const PRIORITY_CHAT = 13;

const PRIORITY_MULTIPLIER = 10000000;
const COMPARABLE_X_Y = 1000000;
const COMPARABLE_Z = 10000;