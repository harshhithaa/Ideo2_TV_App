import {FETCH_ITEMS, SET_WALLET} from './actionTypes';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import VersionCheck from 'react-native-version-check';
 let version = VersionCheck.getCurrentVersion();

export const fetchItems = (callback) => (dispatch) => {

  AsyncStorage.getItem('user').then((reps)=>{
    console.log(reps,"SJJJJJJJJ")

    let token = JSON.parse(reps)
 
  axios({
    method: 'POST',
    // url: `https://coppercodes.com/ideogram/heritage/index.php`,
    url: `http://139.59.80.152:3000/api/monitor/fetchmonitordetails`,
    headers: {
      'Content-Type': 'application/json',
      AppVersion: '1.0.0',
      Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
      AuthToken: `${token.AuthToken}`,
    },
    data: {
      MonitorRef: token.MonitorRef,
    },
  })
    .then((res) => {
      let items = res.data;
            if (!items.Error) {
        // let alldishes = [];
        let sub = items.Details;
              console.log(sub, "Sub=====>>>>>>>");
        // let singleImage_url =
        //   items.venue_image == null ? null : items.venue_image;
        // let updatedOn = items.updatedOn;
        // let image_url = items.url === '' ? '' : items.url.split(',');
        // let video_url = items.url.split(',')[1];
        // console.log(items.image_url);
        // let payload = {
        //   sub,
        //   singleImage_url,
        //   image_url,
        //   video_url,
        //   updatedOn,
        // };  console.log(sub);
        dispatch({
          type: FETCH_ITEMS,
          payload: sub,
        });
        callback();
      } else {
        callback(items.Error.ErrorMessage);
      }
    })
    .catch((error) => {
      console.log(error);
      callback(error);
    });
  })
};
export const fetchscreenref = (payload, callback) => (dispatch) => {
  console.log('itemsscreen');
  axios({
    method: 'post',
     url: `http://139.59.80.152:3000/api/monitor/login`,
    headers: {
      'Content-Type': 'application/json',
      AppVersion: '1.0.0',
      Authorization: 'TlozR28zTWNlSTp3YnB1MkpKQ3cy',
    },
    data: payload,
  })
    .then((res) => {
      console.log(res)
      let items = res.data;
      if (!items.Error) {
        if (items == 'Incorrect Password' || items == '0 results') {
          callback({error : true});
        } else {
          let updatedUser = items.Details;
          console.log(updatedUser);

          AsyncStorage.setItem(
            'user',
            JSON.stringify(updatedUser),
            (err, result) => {
              dispatch({
                type: SET_WALLET,
                payload: updatedUser,
              });
              callback();
            },
          );
        }
      } else {
        callback({err:items.Error});
      }
    })
    .catch((error) => {
      console.log(error);
      callback(error);
    });
};
export const updateOrder = (payload, callback) => (dispatch) => {
  // var payload = AsyncStorage.getItem('user');
  // console.log(payload);
  dispatch({
    type: SET_WALLET,
    payload: payload,
  });
  callback();
};
