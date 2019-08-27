import Room from "./rooms/Room";
import MainEngine from './graphics/MainEngine';
import AvatarImager from "./imagers/avatars/AvatarImager";
import FurniImager from "./imagers/furniture/FurniImager";
import BaseItemManager from "./items/BaseItemManager";
import { ROOM_TILE, ROOM_SELECTED_TILE, ROOM_WALL_L, ROOM_WALL_R, ROOM_WALL_DOOR_EXTENDED_L, ROOM_TILE_SHADOW, FLOOR_ITEM_PLACEHOLDER, WALL_ITEM_PLACEHOLDER } from "./graphics/GenericSprites";
import AvatarContainer, { GHOST_LOOK } from "./rooms/users/AvatarContainer";
import CommunicationManager from "./communication/CommunicationManager";
import RoomModel from "./rooms/RoomModel";
import RequestRoomData from "./communication/outgoing/rooms/RequestRoomData";
import ChatImager from "./imagers/bubbles/ChatImager";
import MeMenuImager from "./imagers/bubbles/MeMenuImager";
import HabboEnvironment from "./BobbaEnvironment";
import UIManager from "./ui/UIManager";
import UserManager from "./users/UserManager";
import Inventory from "./inventory/Inventory";
import RequestInventoryItems from "./communication/outgoing/users/RequestInventoryItem";
import Navigator from "./navigator/navigator";

export default class Game {
    currentRoom?: Room;
    engine: MainEngine;
    avatarImager: AvatarImager;
    furniImager: FurniImager;
    chatImager: ChatImager;
    meMenuImager: MeMenuImager;
    baseItemManager: BaseItemManager;
    userManager: UserManager;
    ghostTextures: AvatarContainer;
    communicationManager: CommunicationManager;
    inventory: Inventory;
    navigator: Navigator;
    uiManager: UIManager;
    isStarting: boolean;
    isInv: boolean;

    constructor() {
        this.engine = new MainEngine(this.gameLoop, this.onResize, this.onMouseMove, this.onTouchStart, this.onTouchMove, this.onMouseClick, this.onMouseDoubleClick);
        this.ghostTextures = new AvatarContainer(GHOST_LOOK, true);
        this.avatarImager = new AvatarImager();
        this.furniImager = new FurniImager();
        this.chatImager = new ChatImager();
        this.meMenuImager = new MeMenuImager();
        this.userManager = new UserManager();
        this.baseItemManager = new BaseItemManager(this.furniImager);
        this.communicationManager = new CommunicationManager();
        this.inventory = new Inventory();
        this.navigator = new Navigator();
        this.uiManager = new UIManager(this);
        this.isStarting = false;
        this.isInv = false;
    }

    loadGame(): Promise<void> {
        this.isStarting = true;
        const sprites: string[] = [
            ROOM_TILE,
            ROOM_SELECTED_TILE,
            FLOOR_ITEM_PLACEHOLDER,
            WALL_ITEM_PLACEHOLDER,
            ROOM_WALL_L,
            ROOM_WALL_R,
            ROOM_WALL_DOOR_EXTENDED_L,
            ROOM_TILE_SHADOW
        ];
        HabboEnvironment.getGame().uiManager.postLoading("Initializing game engine");
        return Promise.all([
            this.avatarImager.initialize().then(() => this.ghostTextures.initialize()),
            this.furniImager.initialize(),
            this.chatImager.initialize(),
            this.meMenuImager.initialize(),
            this.engine.loadGlobalTextures(sprites),
            this.engine.onLeaveRoom(),
        ]).then(() => {
            HabboEnvironment.getGame().uiManager.postLoading("Connecting to Habbo-Server v0.0.8");
            return this.communicationManager.connect("178.82.248.71", 1232, true);
        });
    }

    handleUserData(id: number, name: string, look: string, motto: string) {
        if (this.currentRoom == null) {
            HabboEnvironment.getGame().uiManager.log("Logged in!");
            this.uiManager.onSetUserData(this.userManager.setCurrentUser(id, name, motto, look));
        }
    }

    loadRoom(id: number, name: string, model: RoomModel) {
        this.unloadRoom();
        this.engine.onEnterRoom();
        this.uiManager.onOpenRoomInfo();
        this.currentRoom = new Room(id, name, model);
        this.engine.getLogicStage().addChild(this.currentRoom.engine.getLogicStage());
        this.engine.getMainStage().addChild(this.currentRoom.engine.getStage());
        HabboEnvironment.getGame().uiManager.log("Load room: "+ name +" <- complete");
        this.communicationManager.sendMessage(new RequestRoomData());
        this.communicationManager.sendMessage(new RequestInventoryItems());
        
    }

    unloadRoom() {
        if (this.currentRoom != null) {
            this.currentRoom.dispose();
            this.engine.onLeaveRoom();
            this.uiManager.onCloseSelectFurni(-1);
            this.uiManager.onCloseSelectUser(-1);
            this.uiManager.onCloseRoomInfo();
            this.uiManager.doOpenNavigator();
        }
        this.currentRoom = undefined;
    }

    onMouseMove = (x: number, y: number, isMouseDragging: boolean) => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.handleMouseMovement(x, y, isMouseDragging);
        }
    }

    onTouchStart = (x: number, y: number) => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.handleTouchStart(x, y);
        }
    }

    onTouchMove = (x: number, y: number) => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.handleTouchMove(x, y);
        }
    }

    onMouseClick = (x: number, y: number, shiftKey: boolean, ctrlKey: boolean, altKey: boolean) => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.handleMouseClick(x, y, shiftKey, ctrlKey, altKey);
        }
    }

    onMouseDoubleClick = (x: number, y: number) => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.handleMouseDoubleClick(x, y);
        }
    }

    onResize = () => {
        if (this.currentRoom != null) {
            this.currentRoom.engine.onResize();
        }
    }

    gameLoop = (delta: number) => {
        if (this.currentRoom != null) {
            this.currentRoom.tick(delta * (1 / 60) * 1000);
        }
    }

    stop() {
        this.unloadRoom();
        this.uiManager.onGameStop();
        console.log("Stopping game...");
    }
}