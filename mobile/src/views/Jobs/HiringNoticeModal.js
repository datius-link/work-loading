import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import { C } from "./jobsUI";

export default function HiringNoticeModal({visible,title,body,type="info",primaryLabel="OK",secondaryLabel,loading=false,onPrimary,onSecondary,onClose}){
  const icon = type==="error"?"alert-circle":type==="success"?"check-circle":"briefcase";
  const iconBg= type==="error"?C.redLight:type==="success"?C.greenLight:C.tealLight;
  const iconColor=type==="error"?C.red:type==="success"?C.green:C.teal;
  const close=()=>{if(loading)return;onClose?.();};
  return(
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.overlay} onPress={close}>
        <Pressable style={s.sheet}>
          <View style={s.handle}/>
          <View style={[s.iconWrap,{backgroundColor:iconBg}]}>
            <AppIcon name={icon} size={26} color={iconColor}/>
          </View>
          <Text style={s.title}>{title}</Text>
          {body?<Text style={s.body}>{body}</Text>:null}
          <View style={s.actions}>
            {secondaryLabel?<TouchableOpacity style={s.secondaryBtn} onPress={onSecondary||close} disabled={loading}><Text style={s.secondaryTxt}>{secondaryLabel}</Text></TouchableOpacity>:null}
            <TouchableOpacity style={[s.primaryBtn,{backgroundColor:type==="error"?C.red:C.teal}]} onPress={onPrimary||close} disabled={loading}>
              {loading?<ActivityIndicator color={C.white}/>:<Text style={s.primaryTxt}>{primaryLabel}</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s=StyleSheet.create({
  overlay:{flex:1,justifyContent:"flex-end",backgroundColor:"rgba(0,0,0,0.55)"},
  sheet:{backgroundColor:C.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingHorizontal:20,paddingTop:12,paddingBottom:28},
  handle:{alignSelf:"center",width:40,height:4,borderRadius:2,backgroundColor:"#DDD",marginBottom:20},
  iconWrap:{width:60,height:60,borderRadius:18,alignItems:"center",justifyContent:"center",marginBottom:14},
  title:{color:"#1A1A2E",fontSize:20,fontWeight:"800",marginBottom:6},
  body:{color:C.slate,fontSize:14,lineHeight:22,marginBottom:18},
  actions:{flexDirection:"row",gap:10},
  primaryBtn:{flex:1,minHeight:52,borderRadius:14,alignItems:"center",justifyContent:"center",shadowColor:C.teal,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  primaryTxt:{color:C.white,fontWeight:"800",fontSize:16},
  secondaryBtn:{flex:1,minHeight:52,borderRadius:14,alignItems:"center",justifyContent:"center",borderWidth:1.5,borderColor:"#EEF0F4"},
  secondaryTxt:{color:"#1A1A2E",fontWeight:"700",fontSize:15},
});
