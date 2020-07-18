import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import {Button} from 'react-native-paper';
import ImageView from 'react-native-image-view';
import {TextInput, Switch} from 'react-native-paper';
import Icon from 'react-native-vector-icons/dist/AntDesign';
import AsyncStorage from '@react-native-community/async-storage';
import {StackActions} from '@react-navigation/native';
import axios from 'axios';
import Buffer from 'buffer';
import {ActivityIndicator, Colors} from 'react-native-paper';
import {GetHeight, GetWidth} from './utils/utils';
import ImagePicker from 'react-native-image-crop-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
var Dim = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
};

//  Functional component to present image cards
function ImageCard(props) {
  return (
    <View
      style={{
        height: GetHeight(61, 640),
        elevation: 5,
        marginHorizontal: GetWidth(0, 360),
        marginVertical: GetWidth(10, 360),
        backgroundColor: '#FFFFFF',
        padding: GetHeight(7, 640),
        justifyContent: 'center',
      }}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity onPress={props.preview}>
            <Image
              source={{uri: props.path}}
              style={{
                height: GetHeight(46, 640),
                width: GetHeight(46, 640),
                borderRadius: GetHeight(5, 640),
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View
            style={{
              paddingLeft: 10,
              width: Dim.width * 0.4,
              justifyContent: 'center',
            }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{
                fontSize: GetHeight(12, 640),
                color: '#5859ED',
              }}>
              {props.name}
            </Text>
          </View>
        </View>
        <View
          style={{
            justifyContent: 'center',
          }}>
          <TouchableOpacity onPress={() => props.remove()}>
            <Image
              style={{
                height: GetHeight(20, 640),
                width: GetHeight(20, 640),
              }}
              resizeMode="contain"
              source={require('../assets/images/remove.png')}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

//  Function to remove duplicate tags
function RemoveDuplicates( tags ) {
  let newTaglist = [];
  tags.sort((a,b) => a.value < b.value ? -1: 1);
  if (tags.length >0)
    newTaglist.push(tags[0])
  let a = 0, b = 0;
  while ( a < tags.length) {
    while ( b <  tags.length ) {
      if ( tags[a].value == tags[b].value ) {
        b += 1;
      } else {
        newTaglist.push(tags[b]);
        a = b;
      }
    }
    a += 1;
  }
 return newTaglist;
}

function TagsCard(tags, pushCap, handleHashtags) {
  let tagsChips = tags.map((value, index) => (
    <TouchableOpacity
      key={index}
      style={{margin: GetHeight(2,640), backgroundColor: ( value.selected ) ? '#5859ED' : '#707070' }}
      onPress={() => {
        pushCap(value.value);
        handleHashtags(value.value);
      }}>
      <Text style={{color: 'white', fontSize: GetHeight(12,640), marginHorizontal: GetWidth(16,360), marginVertical: GetHeight(8,640)}}>
        {value.value}
      </Text>
    </TouchableOpacity>
  ));
  return tagsChips;
}

/*

The following fuctions handle upload to a specific platform.
    -   UploadToFacebook
    -   handleLinkedinUpload
    -   handleTwitterUpload

params:
    - images
        *   Takes in array of images
    - caption/status
        *   Taken in caption to post
 */

async function UploadToFacebook(images, caption) {
  return new Promise(async (resolve, reject) => {
    let token = await AsyncStorage.getItem('facebookAccessToken');
    let vectorToStoreImageIDs = [];
    let url_to_upload_photo = `https://graph.facebook.com/v6.0/me/photos?access_token=${token}&published=false`;
    for (const {uri, name, type} of images) {
      let dataForm = new FormData();
      dataForm.append('source', {
        uri: uri,
        type: type,
        name: name,
      });
      const config = {
        method: 'post',
        url: url_to_upload_photo,
        data: dataForm,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      };
      try {
        let response = await axios(config);
        vectorToStoreImageIDs.push(response.data.id);
      } catch (e) {
        reject({
          status: 1,
          message: e,
        });
      }
    }
    let baseurl = 'https://graph.facebook.com/v2.11/me/feed?';
    baseurl += `access_token=${token}&message=${encodeURIComponent(caption)}`;
    for (let i in vectorToStoreImageIDs) {
      baseurl += `&attached_media[${i}]={"media_fbid":"${
        vectorToStoreImageIDs[i]
      }"}`;
    }
    try {
      await axios.post(baseurl);
    } catch (e) {
      reject({
        status: 1,
        message: e,
      });
    }

    resolve({
      status: 0,
      message: 'successful!',
    });
  });
}
async function handleLinkedinUpload(images, status) {
  return new Promise(async (resolve, reject) => {
    let AccessToken = await AsyncStorage.getItem('linkedinAccessToken');
    let owner = await AsyncStorage.getItem('LinkedinOrgIn');
    console.log(owner);
    //let owner = `urn:li:organization:${orgId}`;
    let cap = '';
    for (let i in status) {
      if (status.charCodeAt(i) == 10) {
        cap += '\\n';
      } else {
        cap += status[i];
      }
    }
    status = cap;
    let assets = [];
    for (var img of images) {
      var raw = JSON.stringify({
        registerUploadRequest: {
          owner: owner,
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          serviceRelationships: [
            {
              identifier: 'urn:li:userGeneratedContent',
              relationshipType: 'OWNER',
            },
          ],
        },
      }); // End of payload for Upload Registration

      var requestOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AccessToken}`,
          'Content-Type': 'application/json',
        },
        body: raw,
        redirect: 'follow',
      };
      let resp, response;
      try {
        resp = await fetch(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          requestOptions,
        );
        response = await resp.json();
      } catch (e) {
        reject({
          status: 1,
          message: e,
        });
      }
      let url =
        response.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl;
      let asset = response.value.asset;
      assets.push(asset);
      const buffer = Buffer.Buffer.from(img.data, 'base64');
      try {
        let resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AccessToken}`,
            'Content-Type': `${img.type}; charset=utf-8`,
            'x-amz-acl': 'public-read',
          },
          body: buffer,
          redirect: 'follow',
        });
      } catch (e) {
        reject({
          status: 1,
          message: e,
        });
      }
    }
    let entity = assets.map((value, i) => {
      return {
        entity: value,
      };
    });

    let finalPayload = `{"content": {"contentEntities": ${JSON.stringify(
      entity,
    )},"description": "content description","title": "Images uploaded","shareMediaCategory": "IMAGE"},"distribution": {"linkedInDistributionTarget": {}},"owner": "${owner}","subject": "Parallel Upload Content","text": {"text": "${status}"}}`;
    var requestOptions = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AccessToken}`,
        'Content-Type': 'application/json',
      },
      body: finalPayload,
      redirect: 'follow',
    };

    try {
      let response = await fetch(
        'https://api.linkedin.com/v2/shares',
        requestOptions,
      );
      console.log(await response.text())
    } catch (e) {
      reject({
        status: 1,
        message: e,
      });
    }
    resolve({
      status: 0,
      message: 'successful!',
    });
  });
}
async function handleTwitterUpload(images, caption) {
  return new Promise(async (resolve, reject) => {
    let key = await AsyncStorage.getItem('tweetKey');
    let Secret = await AsyncStorage.getItem('tweetSecret');
    let formData = new FormData();
    let url = 'https://parallel-upload.herokuapp.com/api/v1/tweet';
    formData.append('accessToken', key);
    formData.append('accessTokenSecret', Secret);
    formData.append('status', caption);
    for (var img of images) {
      formData.append('images-base64', img.data);
    }
    let resp = await fetch(url, {
      method: 'post',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).catch(err => Alert.alert('Network Error', 'Twitter! Error' + err));
    if (resp.status == 200) {
      resolve({
        status: 0,
        message: 'successful!',
      });
    } else {
      reject({
        status: 1,
        message: 'Error occured!',
      });
    }
  });
}


/*
    The fuctional component - UploadStatusModal - presents the real time status of the uploads.
 */
function UploadStatusModal(props) {
  const {
    currentQueue,
    totalQueue,
    status,
    uploadQueue,
    setMainPageState,
    GoHome,
    Close,
    TryAgain,
  } = props;
  const STATUS_ICON = {
    success: 'md-checkmark',
    wait: 'ios-timer',
    error: 'md-close',
  };

  const STATUS_COLOR = {
    success: '#5859ED',
    wait: '#5859ED',
    error: '#EA1152',
  };

  if (status == 'wait') {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={true}
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
                position: 'relative',
                top: -1 * GetHeight(40, 640),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons
                name={'ios-timer'}
                size={GetHeight(50, 640)}
                color={'white'}
              />
            </View>
            <View
              style={{
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: GetHeight(26, 640),
                  fontWeight: 'bold',
                  color: '#5859ED',
                }}>
                Uploading...
              </Text>
              <Text
                style={{
                  fontSize: GetHeight(16, 640),
                  fontWeight: 'bold',
                  color: '#5859ED',
                }}>
                Posted to {currentQueue}/{totalQueue} accounts.
              </Text>
            </View>
            <Button
              onPress={() => {}}
              disabled={true}
              mode={'contained'}
              color={'#5859ED'}
              style={{
                height: GetHeight(41, 640),
                width: GetWidth(247, 360),
                borderRadius: 0,
                elevation: 0,
                marginHorizontal: GetWidth(28, 360),
                marginVertical: GetHeight(28, 640),
              }}
              uppercase={false}
              contentStyle={{
                height: GetHeight(41, 640),
                width: GetWidth(247, 360),
              }}
              labelStyle={{
                fontSize: GetHeight(14, 640),
              }}>
              Done
            </Button>
          </View>
        </View>
      </Modal>
    );
  } else if (status == 'success') {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={true}
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
                backgroundColor: STATUS_COLOR.success,
                height: GetHeight(80, 640),
                width: GetHeight(80, 640),
                borderRadius: GetHeight(40, 640),
                position: 'relative',
                top: -1 * GetHeight(40, 640),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons
                name={STATUS_ICON.success}
                size={GetHeight(50, 640)}
                color={'white'}
              />
            </View>
            <View
              style={{
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: GetHeight(26, 640),
                  fontWeight: 'bold',
                  color: '#5859ED',
                }}>
                Success!
              </Text>
              <Text
                style={{
                  fontSize: GetHeight(16, 640),
                  fontWeight: 'bold',
                  color: '#5859ED',
                }}>
                Posted to all selected accounts.
              </Text>
            </View>
            <Button
              onPress={() => {
                setMainPageState({
                  uploadStatusPayload: {
                    status: '',
                    currentQueue: 0,
                    totalQueue: 0,
                    uploadQueue: [],
                  },
                });
                GoHome();
              }}
              disabled={false}
              mode={'contained'}
              color={'#5859ED'}
              style={{
                height: GetHeight(41, 640),
                width: GetWidth(247, 360),
                borderRadius: 0,
                elevation: 0,
                marginHorizontal: GetWidth(28, 360),
                marginVertical: GetHeight(28, 640),
              }}
              uppercase={false}
              contentStyle={{
                height: GetHeight(41, 640),
                width: GetWidth(247, 360),
              }}
              labelStyle={{
                fontSize: GetHeight(14, 640),
              }}>
              Done
            </Button>
          </View>
        </View>
      </Modal>
    );
  } else if (status == 'error') {
    let payload = {}
    // Making a map to present status of all social Media accounts.
    let SSNStatus = uploadQueue.map((value, index) => {
      console.log(value);
      const {status} = value.status;
      const status_value = status == 0 ? 'success' : 'error';
      if (status == 0) {
        if (value.name == 'facebook') {
          payload = {...payload, facebookPublish: false}
        } else if (value.name == 'twitter') {
          payload = {...payload, twitterPublish: false}
        } else if (value.name == 'linkedin') {
          payload = {...payload, linkedinPublish: false}
        }
      }
      return (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            width: GetWidth(150, 360),
            alignItems: 'stretch',
            marginTop: GetHeight(10, 640),
            justifyContent: 'space-between',
          }}>
          <View
            style={{
              flexDirection: 'row',
            }}>
            <Icon
              name={value.icon}
              size={GetHeight(21, 640)}
              color={STATUS_COLOR[status_value]}
            />
            <View
              style={{
                width: GetWidth(8, 360),
              }}
            />
            <Text
              style={{
                color: STATUS_COLOR[status_value],
                fontWeight: 'bold',
                fontSize: GetHeight(17, 640),
              }}>
              {value.name}
            </Text>
          </View>
          <View>
            <Ionicons
              name={STATUS_ICON[status_value]}
              size={GetHeight(21, 640)}
              color={STATUS_COLOR[status_value]}
            />
          </View>
        </View>
      );
    });
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={true}
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
                backgroundColor: STATUS_COLOR.error,
                height: GetHeight(80, 640),
                width: GetHeight(80, 640),
                borderRadius: GetHeight(40, 640),
                position: 'absolute',
                top: -1 * GetHeight(40, 640),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons
                name={STATUS_ICON.error}
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
                margin: 10,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: GetHeight(26, 640),
                  fontWeight: 'bold',
                  color: STATUS_COLOR.error,
                }}>
                Error
              </Text>
              <Text
                style={{
                  fontSize: GetHeight(16, 640),
                  fontWeight: 'bold',
                }}>
                Couldn't post to one or more accounts.
              </Text>
              <View>{SSNStatus}</View>
            </View>
            <View
              style={{
                flexDirection: 'row',
              }}>
              <Button
                onPress={() => {
                  Close();
                }}
                mode={'outlined'}
                color={'#5859ED'}
                style={{
                  height: GetHeight(41, 640),
                  width: GetWidth(109, 360),
                  borderRadius: 0,
                  elevation: 0,
                  borderWidth: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  borderColor: '#5859ED',
                  marginVertical: GetHeight(28, 640),
                }}
                uppercase={false}
                contentStyle={{
                  borderRadius: 0,
                  height: GetHeight(41, 640),
                  width: GetWidth(109, 360),
                }}
                labelStyle={{
                  fontSize: GetHeight(14, 640),
                }}>
                Close
              </Button>
              <View
                style={{
                  width: GetWidth(19, 360),
                }}
              />
              <Button
                onPress={() => {
                  TryAgain(payload);
                }}
                mode={'contained'}
                color={'#5859ED'}
                style={{
                  height: GetHeight(41, 640),
                  width: GetWidth(109, 360),
                  borderRadius: 0,
                  elevation: 0,
                  marginVertical: GetHeight(28, 640),
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                uppercase={false}
                contentStyle={{
                  height: GetHeight(41, 640),
                  width: GetWidth(109, 360),
                }}
                labelStyle={{
                  fontSize: GetHeight(14, 640),
                }}>
                Try Again
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  } else {
    return null;
  }
}
export default class UploadsPage extends React.Component {
  state = {
    showImage: false,
    Images: [],
    caption: '',
    facebookPublish: false,
    linkedinPublish: false,
    twitterPublish: false,
    tags: [],
    pressGETTags: false,
    uploadStatusPayload: {
      status: '',
      currentQueue: 0,
      totalQueue: 0,
      uploadQueue: [],
    },
  };

  //    Fuction handles add image button
  _handleImageAdd = async () => {
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
      this.setState({
        Images: [...this.state.Images, ...img],
      });
    } catch (e) {
      Alert.alert('Something went wrong!', 'An error occured ' + e);
    }
  };

  //    Handles image preview
  _handlePreview = element => {
    this.setState({
      image: [
        {
          source: {
            uri: element.uri,
          },
          title: 'Preview',
          height: element.height,
          width: element.width,
        },
      ],
      showImage: true,
    });
  };

  //    Handles removing image cards
  _handleImageRemoveButton = uri => {
    if (this.state.Images.length == 1) {
      this.props.navigation.pop();
    }
    let img = [];
    this.state.Images.forEach(value => {
      if (value.uri != uri) {
        img.push(value);
      }
    });
    this.setState({
      Images: img,
    });
  };

  //    Handles adding hastag to caption
  _handlePushCaption = text => {
    this.setState({
      caption: this.state.caption + ' #' + text,
    });
  };

  //    Handles network request to get hashtags suggestions
  _handleGETTags = async () => {
    this.setState({
      pressGETTags: true,
    });
    try {
      let data = await fetch(
        `https://hashtags-suggestion.herokuapp.com/caption?text=${
          this.state.caption
        }`,
      );
      let jsonData = await data.json();
      let tagList = [];
      if (data.status == 200) {
        jsonData.hashtags.forEach((value, i) => {
          tagList.push({value: value.value, selected: false, id: i});
        });
      }
      this.setState({
        tags: RemoveDuplicates([...this.state.tags,...tagList]),
        pressGETTags: false,
      });
      this._handleHashtagGETButton()
    } catch (e) {
      Alert.alert('Network Error', 'Error fetching the hashtags!\n' + e);
      this.setState({
        pressGETTags: false,
      });
    }
  };

  UNSAFE_componentWillMount() {
    this._updateToken();
    this._LoadTopTenHashtags();
    this.setState({
      Images: this.props.route.params.Images,
    });
  }

  //    Fetches Auth Token for different account
  _updateToken = async () => {
    this.setState({
      facebookPageAccessToken: await AsyncStorage.getItem(
        'facebookAccessToken',
      ),
      twitterAccessToken: await AsyncStorage.getItem('tweetKey'),
      twitterAccessTokenSecret: await AsyncStorage.getItem('tweetSecret'),
      linkedinAccessToken: await AsyncStorage.getItem('linkedinAccessToken'),
    });
  };

  //    Scans the captions to fetch hastags manually entered and adds them to the suggestions.
  _handleHashtagInput = async ( caption ) => {
    const {tags} = this.state;
    let hashtags =  caption.match(/#[\p{L}]+/ugi) || []
      tags.sort( (a,b) => a.value < b.value ? -1 : 1);
      hashtags.sort( (a,b) => a.value < b.value ? -1 : 1);

      console.log(tags, hashtags);

      for ( let i in tags ) {
          tags[i].selected = false;
      }
    for ( let v of hashtags ) {
        for ( let i in tags ) {
            console.log(v, '#'+tags[i].value )
            if ( v == '#'+tags[i].value ) {
                tags[i].selected = true;
                break;
            }
        }
    }
    // while (i <  tags.length) {
    //     tags[i].selected = false;
    //     i+=1;
    // }
    console.log(tags);

    this.setState({ tags })
  }

  //    Handles SELECTED status of each Hashtag suggeted CHIP
  _handleHashtagButtonPress = async ( tag ) => {
    let { tags } = this.state;
    for (let x in tags) {
        if ( (tags[x].value) == tag )
          tags[x].selected = true;
    }
    this.setState({ tags })
  }

  //    Function handles displaying top 10 hashtags from hashtag table data store
  _LoadTopTenHashtags = async () => {
      let STORED_HASHTAGS = JSON.parse(await AsyncStorage.getItem('HASHTAGS')) || [];
      STORED_HASHTAGS.sort( (a,b) => a.count > b.count ? -1: 1 );
      let TagsToAdd = []

      let maxLen = (11 < STORED_HASHTAGS.length) ? 11 : STORED_HASHTAGS.length;

      let i = 0;

      while ( i < maxLen ) {
          let name = STORED_HASHTAGS[i].name;
          TagsToAdd.push ({
              value: name.slice(1,name.length),
              selected: false,
              id: 999 - i,
          })
          i+=1;
      }
      this.setState({
          tags: RemoveDuplicates([...this.state.tags, ...TagsToAdd])
      })
  }

  //    Function handles the hashtags data store
  AddHashtagsToStore = async () => {
    let STORED_HASHTAGS = JSON.parse(await AsyncStorage.getItem('HASHTAGS')) || [];
    STORED_HASHTAGS.sort( (a,b) => a.name < b.name ? -1: 1 );
    const {caption} = this.state;
    let hashtags = [...(new Set(caption.match(/#[\p{L}]+/ugi)))] || []
    hashtags.sort( (a,b) => a.name < b.name ? -1: 1)
    let i = 0;
    let j = 0;
    while (i < hashtags.length) {
      while ( j < STORED_HASHTAGS.length ) {
        if ( hashtags[i] == STORED_HASHTAGS[j].name ) {
          STORED_HASHTAGS[j].count += 1;
          j+=1;
          break;
        } else {
          j += 1;
        }
      }

      if ( j >= STORED_HASHTAGS.length ) break;
      else i += 1;
    }
    while ( i < hashtags.length ) {
      STORED_HASHTAGS.push({
        name: hashtags[i],
        count: 1,
      });
      i += 1;hashtags
    }
    await AsyncStorage.setItem('HASHTAGS', JSON.stringify(STORED_HASHTAGS) );
  }

  //    Handles button press action to get hashtag suggestions
  _handleHashtagGETButton = async () => {
        const {tags, caption} = this.state;
        let hashtags =  caption.match(/#[\p{L}]+/ugi) || []
        tags.sort( (a,b) => a.value < b.value ? -1 : 1);
        hashtags.sort( (a,b) => a.value < b.value ? -1 : 1);

        console.log(tags, hashtags);

        for ( let i in tags ) {
            tags[i].selected = false;
        }
        for ( let v of hashtags ) {
            for ( let i in tags ) {
                console.log(v, '#'+tags[i].value )
                if ( v == '#'+tags[i].value ) {
                    tags[i].selected = true;
                    break;
                }
            }
        }
        console.log(tags);
        this.setState({ tags })
    };

  render() {
    return (
      <>
        {
          (this.state.uploadStatusPayload.status) ? (
              <UploadStatusModal
                  status={this.state.uploadStatusPayload.status}
                  currentQueue={this.state.uploadStatusPayload.currentQueue}
                  totalQueue={this.state.uploadStatusPayload.totalQueue}
                  uploadQueue={this.state.uploadStatusPayload.uploadQueue}
                  setMainPageState={payload => {
                    this.setState(payload);
                  }}
                  GoHome={() => {
                    StackActions.popToTop();
                    this.props.navigation.navigate('HOME');
                  }}
                  Close={() => {
                    this.setState({
                      uploadStatusPayload: {
                        status: '',
                        currentQueue: 0,
                        totalQueue: 0,
                        uploadQueue: [],
                      },
                    });
                  }}
                  TryAgain={(payload) => {
                    for (let [key, value] of Object.entries(payload)) {
                      this.state[key] = false;
                    }
                    console.log(this.state);
                    this._handleUpload();
                  }}
              />
          ) : null
        }
        <ScrollView
          contentContainerStyle={{
            backgroundColor: '#FFFFFF',
            paddingHorizontal: GetWidth(17, 360),
            paddingVertical: GetWidth(10, 360),
          }}>

                    <ImageView
            images={this.state.image}
            imageIndex={0}
            isVisible={this.state.showImage}
            onClose={() => this.setState({showImage: false})}
          />
          {this.state.Images.map((value, index) => (
            <ImageCard
              name={value.name}
              path={value.uri}
              key={index}
              preview={() => this._handlePreview(value)}
              remove={() => this._handleImageRemoveButton(value.uri)}
            />
          ))}
          <TouchableOpacity
            onPress={this._handleImageAdd}
            style={{
              height: GetHeight(61, 640),
              borderWidth: 1,
              borderColor: '#5859ED',
              backgroundColor: '#FAFAFA',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
                marginVertical: 10,
            }}>
            <Text
              style={{
                fontSize: GetHeight(12, 640),
                color: '#5859ED',
              }}>
              Select an image...
            </Text>
          </TouchableOpacity>
          <TextInput
            style={{
              backgroundColor: 'white',
            }}
            mode="outlined"
            placeholder="Write a caption..."
            label={'Write a caption...'}
            value={this.state.caption}
            selectionColor={'#e0e0ff'}
            numberOfLines={10}
            multiline={true}
            onChangeText={text => {
              this._handleHashtagInput(text);
              this.setState({caption: text});
            }}
          />

          <View
            style={{
              marginVertical: GetWidth(10, 360),
              backgroundColor: '#e5e5e5',
              padding: GetWidth(9, 360),
            }}>
            <View
              style={{
                flexDirection: 'row',
              }}>
              <TouchableOpacity
                onPress={this._handleGETTags}
                style={{
                  backgroundColor: '#5859ED',
                  alignItems: 'center',
                    justifyContent:"center",
                  width: GetWidth(78,360),
                  height: GetHeight(28, 640),
                  alignContent: 'center',
                }}>
                <Text
                  style={{
                    color: 'white',
                    fontSize: GetHeight(12, 640),
                    margin: GetHeight(6, 640),
                  }}>
                  Get Tags
                </Text>
              </TouchableOpacity>
              <View style={{flex: 1, flexDirection: 'row-reverse'}}>
                {this.state.pressGETTags ? (
                  <ActivityIndicator animating={true} color={'#5859ED'} />
                ) : null}
              </View>
            </View>
            {this.state.tags.length > 0 ? (
              <View
                style={{
                  flexWrap: 'wrap',
                  flexDirection: 'row',
                }}>
                {TagsCard(this.state.tags, this._handlePushCaption, this._handleHashtagButtonPress)}
              </View>
            ) : null}
          </View>

          <View
            style={{
              padding: GetWidth(17, 360),
            }}>
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: GetHeight(13, 640),
              }}>
              Post to:
            </Text>
            <View style={{height: GetHeight(10, 640)}} />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'space-around',
              }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                }}>
                <View
                  style={{
                    padding: GetHeight(7, 640),
                  }}>
                  <Icon name={'facebook-square'} size={GetHeight(17, 640)} />
                </View>
                <View
                  style={{
                    justifyContent: 'center',
                    paddingBottom: GetHeight(8, 640),
                  }}>
                  <Text
                    style={{
                      fontSize: GetHeight(12, 640),
                    }}>
                    Facebook
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingBottom: GetHeight(8, 640),
                }}>
                <Switch
                  disabled={!this.state.facebookPageAccessToken}
                  color={'#5859ED'}
                  style={{
                    paddingBottom: 10,
                  }}
                  value={this.state.facebookPublish}
                  onValueChange={() =>
                    this.setState({
                      facebookPublish: !this.state.facebookPublish,
                    })
                  }
                />
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'space-around',
              }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                }}>
                <View
                  style={{
                    padding: GetHeight(7, 640),
                  }}>
                  <Icon name={'linkedin-square'} size={GetHeight(17, 640)} />
                </View>
                <View
                  style={{
                    justifyContent: 'center',
                    paddingBottom: GetHeight(8, 640),
                  }}>
                  <Text
                    style={{
                      fontSize: GetHeight(12, 640),
                    }}>
                    Linkedin
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingBottom: GetHeight(8, 640),
                  alignSelf: 'center',
                }}>
                <Switch
                  disabled={!this.state.linkedinAccessToken}
                  style={{
                    paddingBottom: 10,
                  }}
                  color={'#5859ED'}
                  value={this.state.linkedinPublish}
                  onValueChange={() =>
                    this.setState({
                      linkedinPublish: !this.state.linkedinPublish,
                    })
                  }
                />
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'stretch',
                justifyContent: 'space-around',
              }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                }}>
                <View
                  style={{
                    padding: GetHeight(7, 640),
                  }}>
                  <Icon name={'twitter'} size={GetHeight(17, 640)} />
                </View>
                <View
                  style={{
                    justifyContent: 'center',
                    paddingBottom: GetHeight(8, 640),
                  }}>
                  <Text
                    style={{
                      fontSize: GetHeight(12, 640),
                    }}>
                    Twitter
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingBottom: GetHeight(8, 640),
                }}>
                <Switch
                  disabled={!this.state.twitterAccessTokenSecret}
                  style={{
                    paddingBottom: 10,
                  }}
                  color={'#5859ED'}
                  value={this.state.twitterPublish}
                  onValueChange={() =>
                    this.setState({
                      twitterPublish: !this.state.twitterPublish,
                    })
                  }
                />
              </View>
            </View>
          </View>
          <View>
            <Button
              onPress={this._handleUpload}
              mode={'contained'}
              color={'#5859ED'}
              uppercase={false}
              style={{
                alignItems: 'center',
                borderRadius: 0,
                height: GetHeight(41, 640),
                elevation: 0,
              }}
              contentStyle={{
                height: GetHeight(41, 640),
                width: GetWidth(303, 360),
              }}
              labelStyle={{
                fontSize: GetHeight(14, 640),
              }}>
              Upload
            </Button>
          </View>
        </ScrollView>
      </>
    );
  }

  //    Handles Upload button press action
  _handleUpload = async () => {
    this.AddHashtagsToStore();
    // Requires state parameters

    let {
      facebookPublish,
      twitterPublish,
      linkedinPublish,
      caption,
      Images,
    } = this.state;

    // Parameters for upload prompt

    let totalQueue = 0;
    let currentQueue = 0;

    // Required Checks

    if (caption.length == 0) {
      Alert.alert('Attention', 'Caption is empty');
      return;
    }
    if (Images.length == 0) {
      Alert.alert('Attention', 'No images added');
      return;
    }

    // Updating parameters

    if (facebookPublish) {
      totalQueue += 1;
    }
    if (twitterPublish) {
      totalQueue += 1;
    }
    if (linkedinPublish) {
      totalQueue += 1;
    }

    // Updating the state
    // Will cause the upload status prompt to open
    const updateCurrentState = () => {
      this.setState({
        uploadStatusPayload: {
          status: 'wait',
          currentQueue,
          totalQueue,
          uploadQueue: [],
        },
      });
    };
    updateCurrentState();

    // Upload status flags

    let facebookStatus, twitterStatus, linkedinStatus;

    // final status flag

    let finalStatus = 0;

    // Upload Queue Array

    let UploadQueue = [];

    if (facebookPublish) {
      try {
        facebookStatus = await UploadToFacebook(Images, caption);
      } catch (e) {
        facebookStatus = e;
      }
      UploadQueue.push({
        name: 'facebook',
        icon: 'facebook-square',
        status: facebookStatus,
      });
      finalStatus = finalStatus || facebookStatus.status;
      currentQueue += 1;
      updateCurrentState();
    }
    if (twitterPublish) {
      try {
        twitterStatus = await handleTwitterUpload(Images, caption);
      } catch (e) {
        twitterStatus = e;
      }
      UploadQueue.push({
        name: 'twitter',
        icon: 'twitter',
        status: twitterStatus,
      });
      finalStatus = finalStatus || twitterStatus.status;
      currentQueue += 1;
      updateCurrentState();
    }
    if (linkedinPublish) {
      try {
        linkedinStatus = await handleLinkedinUpload(Images, caption);
      } catch (e) {
        linkedinStatus = e;
      }
      UploadQueue.push({
        name: 'linkedin',
        icon: 'linkedin-square',
        status: linkedinStatus,
      });
      finalStatus = finalStatus || linkedinStatus.status;
      currentQueue += 1;
      updateCurrentState();
    }

    const state = finalStatus == 0 ? 'success' : 'error';
    this.setState({
      uploadStatusPayload: {
        status: state,
        currentQueue,
        totalQueue,
        uploadQueue: UploadQueue,
      },
    });
  };
}
