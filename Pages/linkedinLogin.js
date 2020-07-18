import React, {useState, useEffect} from 'react';
import 'react-native-get-random-values';
import {WebView} from 'react-native-webview';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import {GetHeight, GetWidth, LoginStatus} from './utils/utils';
import Dialog from 'react-native-dialog';
import CookieManager from '@react-native-community/react-native-cookies';
import AsyncStorage from '@react-native-community/async-storage';
import {Button, Surface} from 'react-native-paper';
import Icon from 'react-native-vector-icons/dist/AntDesign';
import {
  GetOrganizationUserManages,
  GetPersonalURN,
} from './utils/linkedinUtils';

import {likedinCredentials} from './credentials'

const deviceDimensions = {
  Width: Dimensions.get('window').width,
  Height: Dimensions.get('window').height,
};

/*
  The configuration for oauth to Linkedin Account.

   linkedinCredentials Contains:
    - clientId
    - clientSecret
    - redirect_uri
 */

const config = {
  ...likedinCredentials,
  scope:
    'r_emailaddress,rw_organization_admin,r_liteprofile,w_member_social,w_organization_social,r_organization_social',
  response_type: 'code',
  state: 'SIGN_IN',
};


/*
  Function Generates the URL for linkedin OAuth
 */

function getUrlForAuth(_config) {
  let _baseURL = 'https://www.linkedin.com/oauth/v2/authorization?';
  _baseURL += 'client_id=' + _config.clientId + '&'; // adding clientID
  _baseURL += 'response_type=' + _config.response_type + '&'; //adding response type
  _baseURL += 'redirect_uri=' + _config.redirect_uri + '&'; //add redirect uri
  _baseURL += 'state=' + _config.state + '&'; // add state
  _baseURL += 'scope=' + _config.scope; // add scopes
  return _baseURL;
}

/*
  Functional component to finalize URN to be used to upload POSTS.
 */
function DialogForORGID(props) {
  let [text, setText] = useState('');
  let {isVisible, setState} = props;
  const {setLinkedinStatus, selfURN, organizations} = props;
  let mapOfOrganization = organizations.map((v, index) => {
    const {urn, name} = v;
    return (
      <Button
        key={index}
        onPress={() => {
          try {
            setState(urn);
            AsyncStorage.setItem('LinkedinOrgIn', urn);
          } catch (e) {
            Alert.alert('There was an error setting the urn value.');
          }
        }}>
        {name}
      </Button>
    );
  });
  return (
    <Dialog.Container visible={true}>
      {organizations.length == 0 ? (
        <View>
          <Dialog.Title>
            Looks like you are not an administrator for even one account.
          </Dialog.Title>

          <View
            style={{
              alignSelf: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}>
            <Text
              style={{
                justifyContent: 'center',
                fontWeight: 'bold',
                paddingTop: 10,
              }}>
              urn:li:organization:
            </Text>
            <View style={{width: 10}} />
            <TextInput
              keyboardType="number-pad"
              style={{
                borderRadius: 7,
                alignSelf: 'center',
                height: 40,
                borderColor: 'gray',
                borderWidth: 1,
              }}
              label={'Organization ID'}
              value={text}
              onChangeText={txt => setText(txt)}
            />
          </View>
          <View style={{alignSelf:'flex-end'}}>
            <Dialog.Button
              label="SET PAGE ID"
              onPress={ () => {
                try {
                  setState(text);
                  if (text.length == 0) {
                    throw 'Error';
                  }
                  AsyncStorage.setItem(
                    'LinkedinOrgIn',
                    'urn:li:organization:' + text,
                  );
                } catch (e) {
                  Alert.alert('Error', 'Empty page ID supplied!');
                }
              }}
            />
          </View>
        </View>
      ) : (
        <View>
          <Dialog.Title>Select the page you want to manage.</Dialog.Title>
          <View
            style={{
              alignSelf: 'center',
              justifyContent: 'center',
            }}>
            {mapOfOrganization}
          </View>
        </View>
      )}
      <Dialog.Button
        label="USE SELF ACCOUNT INSTEAD"
        onPress={() => {
          try {
            setState(selfURN);
            console.log("run")
            AsyncStorage.setItem('LinkedinOrgIn', selfURN);
          } catch (e) {
            Alert.alert('Error', 'Error while setting the self urn value!\n' + e);
          }
        }}
      />
    </Dialog.Container>
  );
}

/*
 *  The component LinkedinLoginScreen handles login to linkedin account
 * props:
 *    - setLogoutVisible   : boolean   - Disable/Enable Login TouchOpacity while AccessToken is fetched
 *    - setLinkedinState   : string    - Sets token for HomeScreen Component
 *    - setLogoutPayload   : Object    - Taken in close(), removeAccount(), editDetails() implementation
 */

export function LinkedinLoginScreen(props) {
  // State variable to Enable/Disable Webview
  const [showLoginWebview, setWebviewState] = useState(false);

  // State variable manages
  const [linkedinCode, setLinkedinCode] = useState('');
  const [linkedinAccessToken, setAccessToken] = useState('');
  const [linkedinExpiresIn, setExpiry] = useState('');

  // State variable to store the URN value of the Organization/Self URN
  const [orgid, setOrgid] = useState('');
  // State variables store the URN value for the authenticated user
  const [selfURN, setSelfURN] = useState('');

  // Contains the Organization list that the authenticated user manages
  const [organizations, setOrganizations] = useState([]);

  // Enable/Disable button while AccessToken is being fetched
  const [LinkedinButtonEnable, setLinkedinButtonEnable] = useState(true);

  const {setLogoutVisible, setLogoutPayload, setLinkedinStatus} = props;

  // Function handles navigation changes on webview
  let _handleNav = obj => {
    var url = decodeURIComponent(obj.url);
    const hashes = url.slice(url.indexOf('?') + 1).split('&');
    const params = {};
    hashes.map(hash => {
      const [key, val] = hash.split('=');
      params[key] = decodeURIComponent(val);
    });
    hashes.forEach(value => {
      const [key, val] = value.split('=');
      params[key.replace('"', '')] = decodeURIComponent(val);
    });
    if (params.code) {
      setWebviewState(false);
      setLinkedinCode(params.code);
      CookieManager.clearAll();
      fetchAcessToken(params.code, config);
    } else if (params.error) {
      Alert.alert(
        'Error occured',
        params.error +
          '\nError Description: ' +
          params.error_description.replace('+', ' '),
      );
      setWebviewState(false);
      CookieManager.clearAll();
    }
  };

  // Makes Webview Visible
  let _handleLogin = () => {
    setWebviewState(true);
  };

  // Function that completes 3 Legged OAuth
  /*
    codeVal: Takes the Code from Callback Redirect
    _config: Taken Configuration object, that contains for Config for OAuth.
   */
  let fetchAcessToken = async (codeVal, _config) => {
    setLinkedinButtonEnable(false);
    let _string =
      'grant_type=authorization_code&' +
      'code=' +
      codeVal +
      '&redirect_uri=' +
      _config.redirect_uri;
    _string +=
      '&client_id=' +
      _config.clientId +
      '&client_secret=' +
      _config.clientSecret;
    try {
      const returnValue = await fetch(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          method: 'POST',
          body: _string,
          headers: {
            'Content-type': 'application/x-www-form-urlencoded',
          },
        },
      ).catch(error => {
        console.log(error);
      });
      if (returnValue.status != 200) {
        throw 'theres an error';
      }
      const result = await returnValue.json();
      if (!result.access_token) {
        throw 'No access token in payload';
      }

      setSelfURN(await GetPersonalURN(result.access_token));
      let organizations = await GetOrganizationUserManages(result.access_token);
      setOrganizations(organizations);
      console.log(result.access_token)
      setAccessToken(result.access_token);
      setExpiry(result.expires_in);
      setLinkedinStatus(result.access_token);

      await AsyncStorage.setItem('linkedinAccessToken', result.access_token);
      await AsyncStorage.setItem(
        'linkedinExpiresIn',
        result.expires_in.toString(),
      );
    } catch (e) {
      Alert.alert('Oops!', 'There was a problem logging you in.');
    }
    setLinkedinButtonEnable(true);
  };

  // Retrieve the saved configurations from AsyncStorage.
  useEffect(() => {
    (async () => {
      setAccessToken(await AsyncStorage.getItem('linkedinAccessToken'));
      console.log(linkedinAccessToken);
      setOrgid(await AsyncStorage.getItem('LinkedinOrgIn'));
      setExpiry(await AsyncStorage.getItem('linkedinExpiresIn'));
    })();
  }, []);

  return (
    <View>
      {linkedinAccessToken && !orgid ? (
        <DialogForORGID
          isVisible={linkedinAccessToken && !orgid}
          setState={(text) => {
              setOrgid(text);
              console.log(orgid, '');
          }}
          setLinkedinStatus={setLinkedinStatus}
          selfURN={selfURN}
          organizations={organizations}
        />
      ) : null}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLoginWebview && !linkedinAccessToken}
        onRequestClose={() => {
          CookieManager.clearAll();
          setWebviewState(false);
        }}
        hardwareAccelerated={true}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            back: 0.5,
          }}>
          <View
            style={{
              flex: 1,
              borderRadius: 40,
            }}>
            <WebView
              source={{uri: getUrlForAuth(config)}}
              style={{
                maxHeight: deviceDimensions.Height * 0.9,
                width: deviceDimensions.Width * 0.9,
                maxWidth: deviceDimensions.Width * 0.9,
              }}
              onNavigationStateChange={_handleNav}
            />
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: 'orange',
              height: deviceDimensions.Height * 0.05,
              width: deviceDimensions.Width * 0.75,
              margin: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => {
              CookieManager.clearAll();
              setWebviewState(false);
            }}>
            <Text
              style={{
                fontSize: GetHeight(12, 640),
                color: 'white',
              }}>
              CLOSE
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TouchableOpacity
        disabled={!LinkedinButtonEnable}
        onPress={() => {
          if (linkedinAccessToken) {
            setLogoutVisible(true);
            setLogoutPayload({
              name: 'linkedin',
              close: () => {
                setLogoutVisible(false);
                setLogoutPayload({});
              },
              removeAccount: () => {
                setLogoutVisible(false);
                setLogoutPayload({});
                (async () => {
                  try {
                    setLinkedinStatus('');
                    setAccessToken('');
                    setOrgid('');
                    await AsyncStorage.setItem('linkedinAccessToken', '');
                    await AsyncStorage.setItem('LinkedinOrgIn', '');
                  } catch (e) {
                    Alert.alert('Error!', 'Logout Failed!');
                  }
                })();
              },
              editDetails: () => {
                setLogoutVisible(false);
                setLogoutPayload({});
                (async () => {
                  try {
                    setLinkedinStatus('');
                    setAccessToken('');
                    setOrgid('');
                    await AsyncStorage.setItem('linkedinAccessToken', '');
                    await AsyncStorage.setItem('LinkedinOrgIn', '');
                  } catch (e) {
                    Alert.alert('Error!', 'Logout Failed!');
                  }
                })();
                _handleLogin();
              },
            });
          } else {
            _handleLogin();
          }
        }}>
        <Icon
          name={'linkedin-square'}
          size={GetWidth(60, 360)}
          color={LoginStatus(linkedinAccessToken)}
        />
      </TouchableOpacity>
    </View>
  );
}