import React, {useState, useEffect} from 'react';
import {View, Text, Image, Alert, TouchableOpacity, Modal} from 'react-native';
import {Button} from 'react-native-paper';
import {GetWidth, GetHeight, LoginStatus} from './utils/utils';
import Icon from 'react-native-vector-icons/dist/AntDesign';
import ImagePicker from 'react-native-image-crop-picker';
import Dialog from 'react-native-dialog';
import AsyncStorage from '@react-native-community/async-storage';
import {AccessToken, LoginManager} from 'react-native-fbsdk';
import axios from 'axios';

import TwitterLoginScreen from './twitterLogin';
import {LinkedinLoginScreen} from './linkedinLogin';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';



/*
   The Functional Component - LogoutModal - is used to present the option that a user can avail if he/she intends to
   logout or login to a different account.
 */
function LogoutModal(props) {
    let { isVisible, logoutPayload } = props;
    let { name, removeAccount, close, editDetails } = logoutPayload;

    const ICON = {
        facebook: 'facebook-square',
        twitter: 'twitter-square',
        linkedin: 'linkedin-square',
    }

    if (!name) name = 'close';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      hardwareAccelerated={true}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.75)',
        }}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
          }}>
          <View
            style={{
              backgroundColor: '#5859ED',
              height: GetHeight(80, 640),
              width: GetHeight(80, 640),
              borderRadius: GetHeight(40, 640),
              position: 'absolute',
              top: -1 * GetHeight(40, 640),
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FontAwesome
              name={ICON[name]}
              size={GetHeight(50, 640)}
              color={'white'}
            />
          </View>
          <View
            style={{
              height: GetHeight(43, 640),
            }}
          />
          <View
            style={{
                margin: GetWidth(28,360)
            }}
          >
              <Button
                  style={{
                      borderRadius: 0,
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  color={'#5859ED'}
                  contentStyle={{
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  mode={'contained'}
                onPress={editDetails}
              >Edit Details</Button>
              <View style={{height: GetHeight(19, 640)}} />
              <Button
                  style={{
                      borderRadius: 0,
                      borderWidth:3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: '#EA1152',
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  color={'#EA1152'}
                  contentStyle={{
                      alignItems: 'center',
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  mode={'outlined'}
                onPress={removeAccount}
              >Remove Account</Button>
              <View style={{height: GetHeight(19, 640)}} />
              <Button
                  style={{
                      borderRadius: 0,
                      borderWidth:3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: '#5859ED',
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  contentStyle={{
                      alignItems: 'center',
                      height:GetHeight(41, 640),
                      width: GetWidth(247, 360)
                  }}
                  color={'#5859ED'}
                  mode={'outlined'}
                onPress={close}
              >Cancel</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/*
    The functional component - FacebookPageSelectionDialog - is used to present users with the pages that they may want
    to manage.
 */
function FacebookPageSelectionDialog(props) {
  let {PageList} = props;
  let mapForPagesList = PageList.map((value, key) => {
    return (
      <Button
        key={key}
        onPress={() => {
          props.setState(value.access_token);
          AsyncStorage.setItem('facebookAccessToken', value.access_token);
          props.setPageList([]);
        }}>
        {value.name}
      </Button>
    );
  });
  return (
    <Dialog.Container visible={PageList.length > 0}>
      <Dialog.Title> Select the page you want to manage</Dialog.Title>
      <Dialog.Description>Tap page you want to manage</Dialog.Description>
      {mapForPagesList}
    </Dialog.Container>
  );
}

function HomeScreen(props) {
  const EMPTY_LOGOUT_PAYLOAD = {}

  // The following variables keep track of social media user state
  const [FacebookLogin, setFacebookState] = useState('');
  const [LinkedLogin, setLinkedinState] = useState('');
  const [TwitterLogin, setTwitterState] = useState('');
  const [TwitterKey, setTwitterKeyState] = useState('');

  // Facebook Page List state variable
  const [PageList, setPageList] = useState([]);

  // State contains functions to manage user for social media platform
    /*
        The state variable - LogoutPayload - is used to pass down payload from TwitterLogin and
        LinkedinLoginScreenComponent

        The payload is then passed on to LogoutModal component to provide following actions
            - Remove account
            - Edit Account
    */
  const [LogoutPayload, setLogoutPayload] = useState(EMPTY_LOGOUT_PAYLOAD);

  // The variable manages the sate of LogoutModal Component
  const [LogoutModalVisible, setLogoutModalVisible] = useState(false);

  /*
    The state variable is used to disable the FacebookLoginButton for the time AccessToken is fetched after login
  */
  const [facebookLoginEnabled, setFacebookLoginEnable] = useState(true);

  // The Hook loads Login Status for all the social media platforms
  useEffect(() => {
    (async () => {
      setFacebookState(await AsyncStorage.getItem('facebookAccessToken'));
      setTwitterState(await AsyncStorage.getItem('tweetSecret'));
      setTwitterKeyState(await AsyncStorage.getItem('tweetKey'));
      setLinkedinState(await AsyncStorage.getItem('linkedinAccessToken'));
    })();
  }, []);

  // Handles facebook login Action
  let handleFacebookLogin = async () => {
    if (FacebookLogin) return;
    let result = await LoginManager.logInWithPermissions([
      'email',
      'publish_pages',
      'manage_pages',
      'pages_show_list',
    ]);
    let token;
    if (!result.isCancelled) {
      token = await AccessToken.getCurrentAccessToken();
      AsyncStorage.setItem('facebookAccessToken', token.accessToken.toString());
      const resp = await axios
        .get(
          `https://graph.facebook.com/v6.0/me/accounts?access_token=${token.accessToken.toString()}`,
        )
        .catch(err => Alert.alert('Error fetching data. ->' + err + ' |'));
      let PageListR = [];
      PageListR.push({
        name: 'Use as self',
        access_token: token.accessToken.toString(),
      });
      for (let val in resp.data.data) {
        PageListR.push({
          name: resp.data.data[val].name,
          access_token: resp.data.data[val].access_token,
        });
      }
      setPageList(PageListR);
    }
  };
  // Handles facebook logout action
  let handleFacebookLogout = () => {
    LoginManager.logOut();
    setFacebookState('');
    AsyncStorage.setItem('facebookAccessToken', '');
  };

  // Handles Add Image action button
  let _handleAddImageButton = async () => {
    try {
      let Images = await ImagePicker.openPicker({
        multiple: true,
        includeBase64: true,
      });
      let img = Images.map(value => {
        let _m = value.path.split('/');
        _m = _m[_m.length - 1];
        return {
          width: value.width,
          height: value.height,
          name: _m,
          data: value.data,
          type: value.mime,
          uri: value.path,
        };
      });
      props.navigation.navigate('UPLOAD_PAGE', {Images: img});
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'white',
      }}>
      {/* Facebook Page Selection Dialog */}
      {PageList.length > 0 ? (
        <FacebookPageSelectionDialog
          PageList={PageList}
          setPageList={setPageList}
          setState={setFacebookState}
        />
      ) : null}
      {/* Logout Component */}
        <LogoutModal isVisible={LogoutModalVisible} logoutPayload={LogoutPayload}/>
      <View
        style={{
          paddingTop: GetHeight(52, 640),
          paddingBottom: GetHeight(103, 640),
          paddingHorizontal: GetWidth(57, 360),
        }}>
        <Image
          style={{
            width: GetWidth(246, 360),
            height: GetHeight(87, 640),
          }}
          source={require('../assets/images/logo.png')}
          resizeMode={'contain'}
        />
      </View>
      <View
        style={{
          alignItems: 'center',
        }}>
        <Text
          style={{
            fontSize: GetHeight(16, 640),
            fontWeight: 'bold',
          }}>
          Login in to your accounts
        </Text>
      </View>
      <View
        style={{
          paddingTop: GetHeight(46, 640),
          alignItems: 'center',
        }}>
        <View
          style={{
            flexDirection: 'row',
          }}>
          <TouchableOpacity
              disabled={!facebookLoginEnabled}
            onPress={() => {
              if (FacebookLogin) {
                  setLogoutModalVisible(true);
                  setLogoutPayload({
                      name: 'facebook',
                      close: () => {
                          setLogoutModalVisible(false);
                          setLogoutPayload({});
                      },
                      removeAccount: () => {
                          setLogoutModalVisible(false);
                          setLogoutPayload({});
                          handleFacebookLogout();
                      },
                      editDetails: () => {
                          setLogoutModalVisible(false);
                          setLogoutPayload({});
                          handleFacebookLogout();
                          handleFacebookLogin();
                      },
                  });
              } else {
                  setFacebookLoginEnable(false);
                  handleFacebookLogin();
                  setFacebookLoginEnable(true);
              }
            }}>
            <Icon
              name={'facebook-square'}
              size={GetWidth(60, 360)}
              color={LoginStatus(FacebookLogin)}
            />
          </TouchableOpacity>
          <View style={{width: GetWidth(75, 360)}} />
          <LinkedinLoginScreen setLogoutVisible={setLogoutModalVisible} setLinkedinStatus={setLinkedinState} setLogoutPayload={setLogoutPayload} />
        </View>
        <View
          style={{
            marginTop: GetHeight(48, 640),
            flexDirection: 'row',
          }}>
          <TwitterLoginScreen setLogoutVisible={setLogoutModalVisible}
                              setTwitterStatus={setTwitterState}
                              setTwitterKeyStatus={setTwitterKeyState}
                              setLogoutPayload={setLogoutPayload}/>
        </View>
      </View>
      <View
        style={{
            flex:1,
            justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Button
          onPress={_handleAddImageButton}
          disabled={!(FacebookLogin || TwitterLogin || LinkedLogin)}
          mode={'contained'}
          color={'#5859ED'}
          style={{
            borderRadius: 0,
            height: GetHeight(41, 640),
            width: GetWidth(303, 360),
            elevation: 0,
          }}
          uppercase={false}
          contentStyle={{
            height: GetHeight(41, 640),
            width: GetWidth(303, 360),
          }}
          labelStyle={{
            fontSize: GetHeight(14, 640),
          }}>
          Make a new post
        </Button>
      </View>
    </View>
  );
}

export default HomeScreen;
