import React, { Component } from 'react';
import Draggable from 'react-draggable';
import './nav.css';
import BobbaEnvironment from '../../bobba/BobbaEnvironment';
import RequestMap from "../../bobba/communication/outgoing/rooms/RequestMap";
import RequestRoomLeave from '../../bobba/communication/outgoing/rooms/RequestRoomLeave';
type NavigatorContainerProps = {};
type NavigatorContainerState = {
    visible: boolean,
    selectedId: number,
    modelmap: number,
    userCount: number,
};
const initialState = {
    visible: false,
    selectedId: -1,
    modelmap: -1,
    userCount: 0,
};

export default class Navigator extends Component<NavigatorContainerProps, NavigatorContainerState> {
    userCount: number;
    constructor(props: NavigatorContainerProps) {
        super(props);
        this.state = initialState;
        this.userCount = initialState.userCount;
    } 

    componentDidMount() {
        const game = BobbaEnvironment.getGame();
        game.uiManager.setOnOpenNavigator(() => {
            this.setState({
                visible: true
            });
        });

        game.uiManager.setOnCloseNavigator(() => {
            this.setState({
                visible: false,
            });
        });
    }

    requestleaveroom(){
        BobbaEnvironment.getGame().communicationManager.sendMessage(new RequestRoomLeave());
        this.updateMinusCount(0);
    }

    close = () => {
        this.setState({
            visible: false,
        });
    }

    updatePlusCount = () => {
        this.userCount = this.userCount + 1;
    }

    updateMinusCount = (status: number) => {
        if (status > 0){
            this.userCount = this.userCount - 1;
        } else {}
    }

    newroom = () => {
        this.requestleaveroom();
        this.updatePlusCount();
        BobbaEnvironment.getGame().communicationManager.sendMessage(new RequestMap());
        this.close();
    }

    render() {
        const { visible } = this.state;
        if (!visible) {
            return <></>;
        }
        return (
            <Draggable>
                <div className="nav">
                    <button className="close" onClick={this.close}>X</button>
                    <h2 className="title">Navigator</h2>
                    <hr />
                    <div className="main_tab_container">
                        <button className="selected">Rooms</button>
                        <button className="">Me</button>
                        <button className="">Search</button>
                    </div>
                    <div className="wrapper">
                        <div className="search_bar">
                            <form>
                                <input type="text" name="room_search" placeholder="Search a room..." value=""></input>
                                <button>Search</button>
                            </form>
                    </div>
                    <div className="basic_rooms">
                        <div className="room_button" onClick={this.newroom}>
                            <span>Test Room</span>
                            <div className="icons_container">
                                <button className="make_favourite"></button>
                                <button className="usercount g">{this.userCount}</button>
                            </div> 
                        </div>
                    </div>
                    <div className="more_rooms">
                          <div className="info">
                            <img src="images/navigator/create_room.png" alt="More rooms"></img>
                            <span>More rooms?</span>
                        </div>
                        <button>Create room</button>
                    </div>
                </div>
                </div>
            </Draggable>
        );
    }
}
