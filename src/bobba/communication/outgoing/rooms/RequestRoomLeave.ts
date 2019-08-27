import ClientMessage from "../../protocol/ClientMessage";
import { REQUEST_ROOM_LEAVE } from "../../protocol/OpCodes/ClientOpCodes";

export default class RequestRoomLeave extends ClientMessage {
    constructor() {
        super(REQUEST_ROOM_LEAVE);
    }
}