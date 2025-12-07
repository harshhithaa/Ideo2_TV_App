import {
  FETCH_ITEMS,
  SET_ITEMS,
  NEW_ORDER,
  FETCH_RESTAURANT_LIST,
  SET_CURRENT_RESTAURANT,
  SET_ORDERREF,
  TRUE,
  TEMP_STATUS,
  UPDATE_ORDER,
  ORDER_DETAILS,
  UPDATE_ORDERCON,
  FINAL_BILL,
  CLEAR_ORDER,
  CLEAR_ORDERCON,
  SET_STATUS,
  SET_RIDER,
  SET_STATUSLOG,
  SET_AMOUNT,
  FETCH_WALLET,
  SET_WALLET,
  SET_PROMO,
  SET_DELIVERY,
  SET_ACTUALCOST,
  SET_QUESTIONS,
  SET_TRIVIA,
  ACtualAmount,
  SET_DISCOUNTEDCOST,
  SET_GRANDTOTAL,
  FETCH_OFFER,
  SET_TAXED,
  FETCH_BASE,
  SET_DELIVERYREF,
  UPDATE_ORDERNOW,
  PLACE_ORDER,
  FETCH_PROMO,
  SET_CART,
  SAVE_PROMO,
  GETBOOKINGSETTINGS,
  CONFIRMBOOKING,
  GETBOOKINGDETAILS,
  GETBOOKINGLIST,
  SET_MAX,
  DISH_DET,
  WALLET_CHARGE,
  PROMO_CHARGE,
  DELI_CHARGE,
  SET_FEEDBACK,
  SET_DISH_TYPES,
  PHONE,
  REASON,
  ERROR,
  ID,
} from './actionTypes';

let initialState = {
  order: {
    selectedItems: [],
    totalItems: 0,
    total: 0,
    selectedItemscon: [],
    totalItemscon: 0,
    totalcon: 0,
    rider: {},
    status: 0,
    statuslog: [],
    error: '',
    dishet: [],
    orderref: '',
    amount: 0,
    wallet: 0,
    promo: 0,
    delivery: 0,
    walletcharge: 0,
    id: 0,
    promocharge: 0,
    deliverycharge: 0,
    discount: 0,
    grandtotal: 0,
    deliveryref: '',
    promos: [],
    wallets: '',
    Phone: {},
    promoref: '',
    feedback: {},
    reason: '',
  },
  currentRestaurant: {},
  items: {},
  bookinglist: [],
  bookingsetting: [],
  bookingref: {},
  bookingdetails: {},
  dishtypes: {},
  takeawayDishesType: [],
  offer: [],
  true: '',
  orderdetails: [],
  list: [],
  finalbill: {},
  tempstatus:{},
};

export default (state = initialState, action) => {
  switch (action.type) {
    case FETCH_ITEMS: {
      const details = action.payload || {};

      // Get media list from various possible locations
      const apiMedia = Array.isArray(details.MediaList) ? details.MediaList : [];
      const candidates = [
        apiMedia,
        Array.isArray(details.DefaultPlaylist) ? details.DefaultPlaylist : [],
        Array.isArray(details.DefaultMediaList) ? details.DefaultMediaList : [],
        Array.isArray(details.Media) ? details.Media : [],
      ];

      let chosenMedia = [];
      for (const c of candidates) {
        if (c && c.length) {
          chosenMedia = c;
          break;
        }
      }

      // fallback to previous state's MediaList if still empty
      if (!chosenMedia.length && state.order && Array.isArray(state.order.MediaList)) {
        chosenMedia = state.order.MediaList;
      }

      // ✅ Ensure each media item has a valid Duration
      chosenMedia = chosenMedia.map(item => ({
        ...item,
        Duration: item.Duration !== null && item.Duration !== undefined 
          ? item.Duration 
          : (item.MediaType === 'video' ? null : 10) // Default 10s for images, null for videos
      }));

      const Orientation = details.Orientation !== undefined ? details.Orientation : state.order.Orientation;

      // ✅ NEW: Extract playlist and schedule info for heartbeat
      const DefaultPlaylistName = details.DefaultPlaylistName || details.PlaylistName || 'Default';
      const ScheduleRef = details.ScheduleRef || details.scheduleRef || null;

      return {
        ...state,
        items: details,
        order: {
          ...state.order,
          MediaList: chosenMedia,
          Orientation,
          DefaultPlaylistName,  // ✅ NEW
          ScheduleRef,          // ✅ NEW
        },
      };
    }
    case UPDATE_ORDERNOW: {
      return {
        ...state,
        list: action.payload.restlist,
        true: action.payload.true,
        order: {
          ...state.order,
          selectedItemscon: action.payload.selectedItems,
          totalItemscon: action.payload.totalItems,
          totalcon: action.payload.total,
        },
        //      takeawayDishesType: action.payload.DishTypes,
      };
    }
    case FETCH_PROMO: {
      return {
        ...state,
        order: {
          ...state.order,
          promos: action.payload,
        },
        // promo: action.payload,
      };
    }
    case SET_QUESTIONS:
      return {
        ...state,

        CustomerAppMessages: action.payload.CustomerAppMessages,
      };
      case SET_TRIVIA:
        return {
          ...state,
  
          CustomerApptrivia: action.payload.CustomerApptrivia,
        };
     
    case TRUE:
      return {
        ...state,

        true: true,
      };
    case ORDER_DETAILS:
      return {
        ...state,

        orderdetails: action.payload,
      };
    case ERROR: {
      return {
        ...state,

        order: {
          ...state.order,
          error: action.payload.variable,
        },
      };
    }
    case SET_ITEMS: {
      return {
        ...state,
        items: {...action.payload},
      };
    }
    case FINAL_BILL: {
      return {
        ...state,
        finalbill: {...action.payload},
      };
    }
    case  TEMP_STATUS: {
      return {
        ...state,
        tempstatus: {...action.payload},
      };
    }
    case NEW_ORDER: {
      return {
        ...state,

        order: {
          ...state.order,
          selectedItemscon: [],
          totalItemscon: 0,
          totalcon: 0,
        },
      };
    }
    case FETCH_RESTAURANT_LIST: {
      return {
        ...state,
        list: action.payload,
      };
    }
    case SET_CART: {
      return {
        ...state,
        items: action.payload.items,
        order: {
          ...state.order,
          selectedItems: action.payload.selectedItems,
          totalItems: action.payload.totalItems,
          total: action.payload.total,
        },
      };
    }
    case SET_CURRENT_RESTAURANT: {
      return {
        ...state,
        currentRestaurant: action.payload,
      };
    }
    case UPDATE_ORDER: {
      return {
        ...state,
        items: action.payload.items,
        order: {
          ...state.order,
          selectedItems: action.payload.selectedItems,
          totalItems: action.payload.totalItems,
          total: action.payload.total,
        },
      };
    }
    case UPDATE_ORDERCON: {
      return {
        ...state,
        list: action.payload.restlist,
        order: {
          ...state.order,
          selectedItemscon: action.payload.selectedItems,
          totalItemscon: action.payload.totalItems,
          totalcon: action.payload.total,
        },
      };
    }
    case SAVE_PROMO: {
      return {
        ...state,

        order: {
          ...state.order,
          promoref: action.payload.promoRef,
        },
      };
    }
    case FETCH_OFFER: {
      return {
        ...state,

        offer: action.payload,
      };
    }
    case SET_STATUS: {
      return {
        ...state,

        order: {
          ...state.order,
          status: action.payload,
        },
      };
    }
    case ACtualAmount: {
      return {
        ...state,

        order: {
          ...state.order,
          ActualAmount: action.payload,
        },
      };
    }
    case SET_ORDERREF: {
      return {
        ...state,

        order: {
          ...state.order,
          orderref: action.payload,
        },
      };
    }
    case FETCH_WALLET: {
      return {
        ...state,

        order: {
          ...state.order,
          wallet: action.payload,
        },
      };
    }
    case PLACE_ORDER: {
      return {
        ...state,

        order: {
          ...state.order,
          deliveryref: action.payload.DeliveryRef,
        },
      };
    }
    case SET_DELIVERYREF: {
      return {
        ...state,

        order: {
          ...state.order,
          deliveryref: action.payload,
        },
      };
    }
    case FETCH_BASE: {
      return {
        ...state,

        order: {
          ...state.order,
          delivery: action.payload,
        },
      };
    }
    case SET_MAX: {
      return {
        ...state,

        order: {
          ...state.order,
          max: action.payload,
        },
      };
    }
    case SET_WALLET: {
      return {
        ...state,

        order: {
          ...state.order,
          wallets: action.payload,
        },
      };
    }
    case WALLET_CHARGE: {
      return {
        ...state,

        order: {
          ...state.order,
          walletcharge: action.payload,
        },
      };
    }
    case ID: {
      return {
        ...state,

        order: {
          ...state.order,
          id: action.payload,
        },
      };
    }
    case PROMO_CHARGE: {
      return {
        ...state,

        order: {
          ...state.order,
          promocharge: action.payload,
        },
      };
    }
    case DELI_CHARGE: {
      return {
        ...state,

        order: {
          ...state.order,
          deliverycharge: action.payload,
        },
      };
    }
    case SET_TAXED: {
      return {
        ...state,

        order: {
          ...state.order,
          taxedamount: action.payload,
        },
      };
    }
    case REASON: {
      return {
        ...state,

        order: {
          ...state.order,
          reason: action.payload,
        },
      };
    }
    case SET_PROMO: {
      return {
        ...state,

        order: {
          ...state.order,
          promo: action.payload,
        },
      };
    }
    case SET_DELIVERY: {
      return {
        ...state,

        order: {
          ...state.order,
          delivery: action.payload,
        },
      };
    }

    case SET_DISCOUNTEDCOST: {
      return {
        ...state,

        order: {
          ...state.order,
          discount: action.payload,
        },
      };
    }
    case SET_GRANDTOTAL: {
      return {
        ...state,

        order: {
          ...state.order,
          grandtotal: action.payload,
        },
      };
    }
    case SET_AMOUNT: {
      return {
        ...state,

        order: {
          ...state.order,
          amount: action.payload,
        },
      };
    }
    case SET_FEEDBACK: {
      return {
        ...state,

        order: {
          ...state.order,
          feedback: action.payload,
        },
      };
    }
    case SET_STATUSLOG: {
      return {
        ...state,

        order: {
          ...state.order,
          statuslog: [...action.payload],
        },
      };
    }
    case DISH_DET: {
      return {
        ...state,

        order: {
          ...state.order,
          dishdet: [...action.payload],
        },
      };
    }
    case PHONE: {
      return {
        ...state,

        order: {
          ...state.order,
          Phone: {...action.payload},
        },
      };
    }
    case SET_RIDER: {
      return {
        ...state,

        order: {
          ...state.order,
          rider: action.payload,
        },
      };
    }
    case CLEAR_ORDER: {
      return {
        ...state,
        order: {
          ...state.order,
          selectedItems: [],
          totalItems: 0,
          total: 0,
          promos: action.payload.promos,
          wallet: action.payload.wallet,
        },
      };
    }
    case CLEAR_ORDERCON: {
      return {
        ...state,
        order: {
          ...state.order,
          selectedItemscon: [],
          totalItemscon: 0,
          totalcon: 0,
          
        },
      };
    }
    case GETBOOKINGLIST: {
      return {
        ...state,
        bookinglist: action.payload,
      };
    }
    case GETBOOKINGSETTINGS: {
      return {
        ...state,
        bookingsetting: action.payload,
      };
    }
    case CONFIRMBOOKING: {
      return {
        ...state,
        bookingref: action.payload,
      };
    }
    case GETBOOKINGDETAILS: {
      return {
        ...state,
        bookingdetails: action.payload,
      };
    }
    default: {
      return state;
    }
  }
};
