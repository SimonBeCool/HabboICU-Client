import BobbaEnvironment from "../BobbaEnvironment";
import RequestRoomLeave from "../communication/outgoing/rooms/RequestRoomLeave";

export default class navigator {
    userCount: number;

    constructor(){
        this.userCount = 0;
    }
    requestleaveroom(){
        BobbaEnvironment.getGame().communicationManager.sendMessage(new RequestRoomLeave());
        BobbaEnvironment.getGame().unloadRoom();
    }

    updatePlusCount = (con: number) => {
        this.userCount = this.userCount + 1;
    }

    updateMinusCount = (con: number) => {
        this.userCount = this.userCount - 1;
    }
}