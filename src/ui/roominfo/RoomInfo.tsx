import React, { Component } from 'react';
import Draggable from 'react-draggable';
import './roominfo.css';
import BobbaEnvironment from '../../bobba/BobbaEnvironment';
type RoomInfoContainerProps = {};
type RoomInfoContainerState = {
    visible: boolean
};
const initialState = {
    visible: false,
};

export default class RoomInfo extends Component<RoomInfoContainerProps, RoomInfoContainerState>{
    constructor(props: RoomInfoContainerProps) {
        super(props);
        this.state = initialState;
    } 
    componentDidMount() {
        const game = BobbaEnvironment.getGame();
        game.uiManager.setOnOpenRoomInfo(() => {
            this.setState({
                visible: true
            });
        });

        game.uiManager.setOnCloseRoomInfo(() => {
            this.setState({
                visible: false,
            });
        });
    }

    close = () => {
        this.setState({
            visible: false,
        });
    }

    render() {
        const { visible } = this.state;
        if (!visible) {
            return <></>;
        }
        return (
            <Draggable>
                <div className="room_info">
                    <h2 className="title">Test Room</h2>
                    <p className="owner_info">Owner: <span className="owner_name">Satoshi</span></p>
                    <div className="buttons_container">
                        <button>
                            <img src="images/room_info/clear_favourite.png" alt="Favorite" />
                        </button>
                        <button>
                            <img src="images/room_info/settings_icon.png" alt="Settings" />
                        </button>
                        <button>
                            <img src="images/room_info/chat_history.png" alt="Chat history" />
                        </button>
                    </div>
                </div>
            </Draggable>
        );
    }
}

