import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";

// Generic, theme-aware notice/confirm sheet — used across the app (hiring
// flow, post creation, etc.) instead of native Alert.alert. Supports
// success / error / warning / info (confirmation just uses "info" plus a
// secondaryLabel), a loading primary button, and safe-area-aware bottom
// padding so it sits correctly above gesture-nav bars.
const TYPE_ICONS = {
  error: "alert-circle",
  success: "check-circle",
  warning: "warning",
  info: "briefcase",
};

export default function HiringNoticeModal({visible,title,body,type="info",primaryLabel="OK",secondaryLabel,loading=false,onPrimary,onSecondary,onClose}){
  const {theme}=useAppTheme();
  const insets = useSafeAreaInsets();
  const s=React.useMemo(()=>createStyles(theme),[theme]);
  const icon = TYPE_ICONS[type] || TYPE_ICONS.info;
  const iconBg = type==="error"?theme.colors.dangerSoft:type==="success"?theme.colors.successSoft:type==="warning"?theme.colors.warningSoft:theme.colors.primarySoft;
  const iconColor = type==="error"?theme.colors.danger:type==="success"?theme.colors.success:type==="warning"?theme.colors.warning:theme.colors.primaryStrong;
  const primaryBg = type==="error"?theme.colors.danger:type==="warning"?theme.colors.warning:theme.colors.primary;
  const close=()=>{if(loading)return;onClose?.();};
  return(
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.overlay} onPress={close}>
        <Pressable style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={s.handle}/>
          <View style={[s.iconWrap,{backgroundColor:iconBg}]}>
            <AppIcon name={icon} size={26} color={iconColor}/>
          </View>
          <Text style={s.title}>{title}</Text>
          {body?<Text style={s.body}>{body}</Text>:null}
          <View style={s.actions}>
            {secondaryLabel?<TouchableOpacity style={s.secondaryBtn} onPress={onSecondary||close} disabled={loading}><Text style={s.secondaryTxt}>{secondaryLabel}</Text></TouchableOpacity>:null}
            <TouchableOpacity style={[s.primaryBtn,{backgroundColor:primaryBg,shadowColor:primaryBg}]} onPress={onPrimary||close} disabled={loading}>
              {loading?<ActivityIndicator color={theme.colors.onPrimary}/>:<Text style={s.primaryTxt}>{primaryLabel}</Text>}
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
  primaryBtn:{flex:1,minHeight:52,borderRadius:14,alignItems:"center",justifyContent:"center",shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  primaryTxt:{color:theme.colors.onPrimary,fontWeight:"800",fontSize:16},
  secondaryBtn:{flex:1,minHeight:48,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:1.5,borderColor:theme.colors.border},
  secondaryTxt:{color:theme.colors.text,fontWeight:"800",fontSize:14},
});
