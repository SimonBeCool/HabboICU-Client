import React, { Component } from 'react';
import JoinForm, { LookGroup } from './JoinForm';
import BobbaEnvironment from '../../bobba/BobbaEnvironment';
import AvatarInfo from '../../bobba/imagers/avatars/AvatarInfo';
import GenericSplash from './GenericSplash';
import Loading from './Loading';
import { canvas2Image } from '../misc/GraphicsUtilities';

const skins = [
    "hr-828-1407.sh-3089-110.ha-1013-110.ch-3323-110-92.lg-3058-82.hd-180-10",
];

const initialState = {
    looks: [],
    looksLoaded: 0,
};
type SplashScreenState = {
    looks: LookGroup[],
    looksLoaded: number,
};
type SplashScreenProps = {};

const getPercent = (current: number, max: number) => {
    return Math.trunc((current / max) * 100);
};

class SplashScreen extends Component<SplashScreenProps, SplashScreenState> {
    constructor(props: SplashScreenProps) {
        super(props);
        this.state = initialState;
    }

    componentDidMount() {
        const avatarImager = BobbaEnvironment.getGame().avatarImager;

        skins.forEach(skin => {
            avatarImager.generateGeneric(new AvatarInfo(skin, 4, 4, ["wlk"], "std", 2, false, false, "n"), false).then(canvas => {
                const looks = this.state.looks.concat({ figure: skin, image: canvas2Image(canvas) });
                this.setState({
                    looks,
                });
            });
        });

    }

    render() {
        const { looks } = this.state;

        if (looks.length !== skins.length) {
            return <Loading loadingText={"Loading sample looks (" + getPercent(looks.length, skins.length) + "%)"} />;
        }
        return (
            <GenericSplash>
                <p>
                    Please enter your username and pick a look!
                </p>
                <JoinForm looks={looks} />
            </GenericSplash>
        );
    }
}

export default SplashScreen;
