/**
 * jobsUI.js — Shared design tokens + micro-components for the Jobs module.
 */
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";
import { useLanguage } from "../../LanguageContext";

// Legacy static tokens — kept for screens that haven't been migrated to
// theme-aware colors yet. Prefer theme.colors.* (see theme/theme.js) for
// anything that needs to look correct in both light and dark mode.
export const C = {
  teal:"#0B6B63", tealLight:"#E8F5F4", tealMid:"#D0EDEB",
  amber:"#F59E0B", amberLight:"#FEF3C7",
  green:"#16A34A", greenLight:"#DCFCE7",
  red:"#DC2626",   redLight:"#FEE2E2",
  orange:"#EA580C",orangeLight:"#FFEDD5",
  blue:"#2563EB",  blueLight:"#DBEAFE",
  slate:"#64748B", slateLight:"#F1F5F9",
  white:"#FFFFFF", bg:"#F7F9FB",
};

// Status → design token. The actual color/background is resolved against
// the active theme at render time so badges adapt to light/dark mode
// instead of keeping a fixed light-mode pastel background.
const STATUS_MAP = {
  open:{label:"Open",sw:"Wazi",token:"primary"},
  posted:{label:"Posted",sw:"Imechapishwa",token:"primary"},
  applied:{label:"Applied",sw:"Umeomba",token:"accent"},
  applications:{label:"Applications",sw:"Maombi",token:"accent"},
  assigned:{label:"Assigned",sw:"Imepangiwa",token:"primary"},
  waiting_approval:{label:"Pending",sw:"Inasubiri",token:"warning"},
  requested:{label:"Requested",sw:"Imeombwa",token:"warning"},
  in_progress:{label:"In Progress",sw:"Inaendelea",token:"orange"},
  active:{label:"Active",sw:"Inaendelea",token:"orange"},
  start_pending:{label:"Start Requested",sw:"Kuanza kumeombwa",token:"warning"},
  start_requested:{label:"Start Requested",sw:"Kuanza kumeombwa",token:"warning"},
  working:{label:"Working",sw:"Inafanyiwa kazi",token:"orange"},
  submitted:{label:"Submitted",sw:"Imewasilishwa",token:"accent"},
  revision_requested:{label:"Revision Requested",sw:"Marekebisho Yameombwa",token:"danger"},
  completion_pending:{label:"Completion Requested",sw:"Kukamilisha kumeombwa",token:"warning"},
  completed:{label:"Completed",sw:"Imekamilika",token:"success"},
  filled:{label:"Filled",sw:"Imejazwa",token:"success"},
  closed:{label:"Closed",sw:"Imefungwa",token:"muted"},
  not_attained:{label:"Not Attained",sw:"Hukupata",token:"danger"},
  approved:{label:"Approved",sw:"Imekubaliwa",token:"success"},
  cancelled:{label:"Cancelled",sw:"Imeghairiwa",token:"danger"},
  declined:{label:"Declined",sw:"Imekataliwa",token:"danger"},
};

export function statusConfig(key) {
  return STATUS_MAP[String(key||"open").replace(/ /g,"_").toLowerCase()]
    ||{label:String(key||"Open"),token:"primary"};
}

// Resolves a design token to an actual {color,bg} pair for the active theme.
export function tokenColors(theme, token){
  switch(token){
    case "accent": return { color: theme.colors.accent, bg: theme.colors.accentSoft };
    case "warning": return { color: theme.colors.warning, bg: theme.colors.warningSoft };
    case "orange": return { color: theme.colors.orange, bg: theme.colors.orangeSoft };
    case "success": return { color: theme.colors.success, bg: theme.colors.successSoft };
    case "danger": return { color: theme.colors.danger, bg: theme.colors.dangerSoft };
    case "muted": return { color: theme.colors.textMuted, bg: theme.colors.surfaceSoft };
    case "primary":
    default: return { color: theme.colors.primaryStrong, bg: theme.colors.primarySoft };
  }
}

export function StatusBadge({status,size="md"}){
  const {language}=useLanguage();
  const {theme}=useAppTheme();
  const cfg=statusConfig(status);const sm=size==="sm";
  const {color,bg}=tokenColors(theme,cfg.token);
  return(<View style={[{paddingHorizontal:sm?7:10,paddingVertical:sm?2:4,borderRadius:20,backgroundColor:bg}]}>
    <Text style={{fontSize:sm?10:12,fontWeight:"700",color:color}}>{language==="sw"?(cfg.sw||cfg.label):cfg.label}</Text>
  </View>);
}

export function SectionHeading({label}){
  const {theme}=useAppTheme();
  return <Text style={{fontSize:11,fontWeight:"800",color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:0.9,marginBottom:10}}>{label}</Text>;
}

export function PrimaryButton({label,onPress,disabled,loading,icon,danger}){
  const {theme}=useAppTheme();const bg=danger?theme.colors.danger:theme.colors.primary;
  return(
    <TouchableOpacity style={[{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:52,borderRadius:14,backgroundColor:bg,shadowColor:"#0B6B63",shadowOffset:{width:0,height:4},shadowOpacity:0.28,shadowRadius:10,elevation:5},(disabled||loading)&&{opacity:0.5,shadowOpacity:0}]}
      onPress={onPress} disabled={disabled||loading} activeOpacity={0.85}>
      {loading?<ActivityIndicator color={theme.colors.onPrimary}/>:<>{icon?<AppIcon name={icon} size={18} color={theme.colors.onPrimary}/>:null}<Text style={{color:theme.colors.onPrimary,fontSize:16,fontWeight:"800"}}>{label}</Text></>}
    </TouchableOpacity>
  );
}

export function OutlineButton({label,onPress,disabled,icon,color}){
  const {theme}=useAppTheme();const c=color||theme.colors.primary;
  return(
    <TouchableOpacity style={{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:48,borderRadius:14,borderWidth:1.5,borderColor:c,backgroundColor:theme.colors.surface}}
      onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      {icon?<AppIcon name={icon} size={16} color={c}/>:null}
      <Text style={{fontSize:15,fontWeight:"700",color:c}}>{label}</Text>
    </TouchableOpacity>
  );
}

export function NavHeader({title,onBack,right}){
  const {theme}=useAppTheme();
  return(
    <View style={{minHeight:52,flexDirection:"row",alignItems:"center",paddingHorizontal:14,paddingVertical:7,backgroundColor:theme.colors.surface,borderBottomWidth:1,borderBottomColor:theme.colors.border,gap:10,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:5,elevation:3,zIndex:5}}>
      <TouchableOpacity style={{width:34,height:34,borderRadius:17,backgroundColor:theme.colors.surfaceSoft,alignItems:"center",justifyContent:"center"}} onPress={onBack} activeOpacity={0.7}>
        <AppIcon name="arrowLeft" size={18} color={theme.colors.text}/>
      </TouchableOpacity>
      <Text style={{flex:1,fontSize:18,fontWeight:"900",color:theme.colors.text,letterSpacing:0.2}} numberOfLines={1}>{title}</Text>
      <View style={{minWidth:34}}>{right||null}</View>
    </View>
  );
}

export function InfoRow({label,value,icon}){
  const {theme}=useAppTheme();
  return(
    <View style={{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:10,borderBottomWidth:1,borderBottomColor:theme.colors.border}}>
      {icon?<AppIcon name={icon} size={14} color={theme.colors.primary}/>:null}
      <Text style={{color:theme.colors.textMuted,fontSize:13,fontWeight:"600",width:90}}>{label}</Text>
      <Text style={{flex:1,color:theme.colors.text,fontSize:13,fontWeight:"700",textAlign:"right"}}>{value}</Text>
    </View>
  );
}

export function EmptyState({icon,title,body,action,onAction}){
  const {theme}=useAppTheme();
  return(
    <View style={{flex:1,alignItems:"center",justifyContent:"center",padding:32,gap:12}}>
      <View style={{width:72,height:72,borderRadius:22,backgroundColor:theme.colors.primarySoft,alignItems:"center",justifyContent:"center",marginBottom:4}}>
        <AppIcon name={icon} size={28} color={theme.colors.primary}/>
      </View>
      <Text style={{fontSize:18,fontWeight:"800",color:theme.colors.text,textAlign:"center"}}>{title}</Text>
      {body?<Text style={{fontSize:14,color:theme.colors.textMuted,textAlign:"center",lineHeight:21}}>{body}</Text>:null}
      {action?<TouchableOpacity style={{marginTop:8,paddingHorizontal:24,paddingVertical:12,backgroundColor:theme.colors.primary,borderRadius:12}} onPress={onAction}><Text style={{color:theme.colors.onPrimary,fontWeight:"700"}}>{action}</Text></TouchableOpacity>:null}
    </View>
  );
}

export function Card({children,style}){
  const {theme}=useAppTheme();
  return <View style={[{backgroundColor:theme.colors.surface,borderRadius:14,padding:16,borderWidth:1,borderColor:theme.colors.border,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:6,elevation:2},style]}>{children}</View>;
}
