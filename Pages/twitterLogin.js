import React, {Component} from 'react';
import {
  NativeModules,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import {GetWidth, GetHeight, LoginStatus} from './utils/utils';
const {RNTwitterSignIn} = NativeModules;
import {twitterCredentials} from './credentials'


/*
 *  The component TwitterLoginScreen handles login to twitter account
 * props:
 *    - setLogoutVisible   : boolean   - Disable/Enable Login TouchOpacity while AccessToken is fetched
 *    - setTwitterState    : string    - Sets token for HomeScreen Component
 *    - setTwitterKeyStatus: string    - Sets Twitter Key for HomeScreen state
 *    - setLogoutPayload   : Object    - Taken in close(), removeAccount(), editDetails() implementation
 */

export default class TwitterLoginScreen extends Component {
  state = {
    isLoggedIn: false,
    authToken: '',
    authTokenSecret: '',
    twitterButtonEnable: true,
  };
  // Handles Login to Twitter Account
  _twitterSignIn = async () => {
    this.setState({twitterButtonEnable: false});
    const {setTwitterStatus, setTwitterKeyStatus } = this.props;
      if (this.state.authToken)
        return;
    RNTwitterSignIn.init(
      twitterCredentials.TWITTER_CONSUMER_KEY,
      twitterCredentials.TWITTER_CONSUMER_SECRET,
    );
    let bat = await RNTwitterSignIn.logIn()
      .then(loginData => loginData)
      .catch(error => {
        console.log(error);
      });
    this.setState({
      authToken: bat.authToken,
      authTokenSecret: bat.authTokenSecret,
    });
    setTwitterStatus(bat.authToken)
    setTwitterKeyStatus(bat.authTokenSecret)

    await AsyncStorage.setItem('tweetKey', bat.authToken);
    await AsyncStorage.setItem('tweetSecret', bat.authTokenSecret);
    this.setState({twitterButtonEnable: true});
  };

  // Handles Logout for Twitter Account
  handleLogout = async () => {
    const {setLogoutVisible, setLogoutPayload, setTwitterStatus,
      setTwitterKeyStatus } = this.props;
    this.setState({
      authToken: '',
      authTokenSecret: '',
    });
    setTwitterStatus('')
    setTwitterKeyStatus('')

    await AsyncStorage.setItem('tweetKey', '');
    await AsyncStorage.setItem('tweetSecret', '');
  };

  // Fetches configration from AsyncStorage
  async componentDidMount() {
    this.setState({
      authToken: await AsyncStorage.getItem('tweetKey'),
      authTokenSecret: await AsyncStorage.getItem('tweetSecret'),
    });
  }

  render() {
    const {setLogoutVisible, setLogoutPayload} = this.props;
    return (
        <TouchableOpacity
            disabled={!this.state.twitterButtonEnable}
            onPress={() => {
                if (this.state.authToken) {
                  setLogoutVisible(true);
                  setLogoutPayload({
                    name: 'twitter',
                    close: () => {
                      setLogoutVisible(false);
                      setLogoutPayload({});
                    },
                    removeAccount: () => {
                      setLogoutVisible(false);
                      setLogoutPayload({});
                      this.handleLogout();
                    },
                    editDetails: () => {
                      setLogoutVisible(false);
                      setLogoutPayload({});
                      this.handleLogout();
                      this._twitterSignIn();
                    },
                  });
                }
                else {
                  this._twitterSignIn()
                }
            }}>
            <FontAwesomeIcon
                name={'twitter-square'}
                size={GetWidth(60, 360)}
                color={LoginStatus(this.state.authToken)}
            />
        </TouchableOpacity>
    );
  }
}