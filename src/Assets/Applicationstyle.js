import { moderateScale, scale, verticalScale } from 'react-native-size-matters'
import Colors from './Colors/Colors'

const ApplicationStyles = {
    boldFonts:{
        fontWeight:'bold',
        fontFamily:"Poppin-SemiBold",
    },
    boldFont18:{
        fontWeight:'bold',
        fontSize:scale(18)
    },
    boldFont20:{
        fontWeight:'bold',
        fontSize:scale(20)
    },
    
    boldFont16:{
        fontWeight:'bold',
        fontSize:scale(16)
    },
    rowSpaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between'
      },
    horizontal: {
        flexDirection: 'row'
      },
    marginV10:{
        marginVertical:verticalScale(10)
    },
    marginV5:{
        marginVertical:verticalScale(5)
    },
    marginH5:{
        marginHorizontal:'5%'
    },
    marginH8:{
        marginHorizontal:'8%'
    },
    paddingH5:{
        paddingHorizontal:'5%'
    },
    paddingH7:{
        paddingHorizontal:'7%'
    },
    titleText:{
        fontSize:scale(14),
        fontFamily:"ITCAvantGardeStdMd",
       
    },
    description:{
        fontSize:scale(12),
        color:Colors.grey,
        fontFamily:"Gilroy-Medium"
    },
    boldText:{
        fontSize:scale(12),
        color:Colors.darkorange,
        fontWeight:'bold'
        //fontFamily:"Gilroy-Medium"
    },

}
export default ApplicationStyles