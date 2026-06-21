import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../../icons/AppIcon";
import { C } from "./jobsUI";
import { useAppTheme } from "../../theme";

export default function HiringNoticeModal({visible,title,body,type="info",primaryLabel="OK",secondaryLabel,loading=false,onPrimary,onSecondary,onClose}){
  const {theme}=useAppTheme();
  const s=React.useMemo(()=>createStyles(theme),[theme]);
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

const createStyles=(theme)=>StyleSheet.create({
  overlay:{flex:1,justifyContent:"flex-end",backgroundColor:theme.colors.overlay},
  sheet:{backgroundColor:theme.colors.surface,borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:18,paddingTop:12,paddingBottom:28},
  handle:{alignSelf:"center",width:40,height:4,borderRadius:2,backgroundColor:theme.colors.border,marginBottom:18},
  iconWrap:{width:60,height:60,borderRadius:18,alignItems:"center",justifyContent:"center",marginBottom:14},
  title:{color:theme.colors.text,fontSize:18,fontWeight:"900",marginBottom:6},
  body:{color:theme.colors.textMuted,fontSize:13,lineHeight:20,marginBottom:18},
  actions:{flexDirection:"row",gap:10},
  primaryBtn:{flex:1,minHeight:52,borderRadius:14,alignItems:"center",justifyContent:"center",shadowColor:C.teal,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  primaryTxt:{color:C.white,fontWeight:"800",fontSize:16},
  secondaryBtn:{flex:1,minHeight:48,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:1.5,borderColor:theme.colors.border},
  secondaryTxt:{color:theme.colors.text,fontWeight:"800",fontSize:14},
});
