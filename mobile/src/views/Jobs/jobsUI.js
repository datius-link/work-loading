/**
 * jobsUI.js — Shared design tokens + micro-components for the Jobs module.
 */
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import AppIcon from "../../icons/AppIcon";
import { useAppTheme } from "../../theme";
import { useLanguage } from "../../LanguageContext";

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

const STATUS_MAP = {
  open:{label:"Open",sw:"Wazi",color:"#0B6B63",bg:"#E8F5F4"},
  posted:{label:"Posted",sw:"Imechapishwa",color:"#0B6B63",bg:"#E8F5F4"},
  applied:{label:"Applied",sw:"Umeomba",color:"#2563EB",bg:"#DBEAFE"},
  applications:{label:"Applications",sw:"Maombi",color:"#2563EB",bg:"#DBEAFE"},
  assigned:{label:"Assigned",sw:"Imepangiwa",color:"#0B6B63",bg:"#E8F5F4"},
  waiting_approval:{label:"Pending",sw:"Inasubiri",color:"#F59E0B",bg:"#FEF3C7"},
  requested:{label:"Requested",sw:"Imeombwa",color:"#F59E0B",bg:"#FEF3C7"},
  in_progress:{label:"In Progress",sw:"Inaendelea",color:"#EA580C",bg:"#FFEDD5"},
  active:{label:"Active",sw:"Inaendelea",color:"#EA580C",bg:"#FFEDD5"},
  start_pending:{label:"Start Requested",sw:"Kuanza kumeombwa",color:"#F59E0B",bg:"#FEF3C7"},
  working:{label:"Working",sw:"Inafanyiwa kazi",color:"#EA580C",bg:"#FFEDD5"},
  completion_pending:{label:"Completion Requested",sw:"Kukamilisha kumeombwa",color:"#F59E0B",bg:"#FEF3C7"},
  completed:{label:"Completed",sw:"Imekamilika",color:"#16A34A",bg:"#DCFCE7"},
  filled:{label:"Filled",sw:"Imejazwa",color:"#16A34A",bg:"#DCFCE7"},
  closed:{label:"Closed",sw:"Imefungwa",color:"#64748B",bg:"#F1F5F9"},
  not_attained:{label:"Not Attained",sw:"Hukupata",color:"#DC2626",bg:"#FEE2E2"},
  approved:{label:"Approved",sw:"Imekubaliwa",color:"#16A34A",bg:"#DCFCE7"},
  cancelled:{label:"Cancelled",sw:"Imeghairiwa",color:"#DC2626",bg:"#FEE2E2"},
  declined:{label:"Declined",sw:"Imekataliwa",color:"#DC2626",bg:"#FEE2E2"},
};

export function statusConfig(key) {
  return STATUS_MAP[String(key||"open").replace(/ /g,"_").toLowerCase()]
    ||{label:String(key||"Open"),color:"#0B6B63",bg:"#E8F5F4"};
}

export function StatusBadge({status,size="md"}){
  const {language}=useLanguage();
  const c=statusConfig(status);const sm=size==="sm";
  return(<View style={[{paddingHorizontal:sm?7:10,paddingVertical:sm?2:4,borderRadius:20,backgroundColor:c.bg}]}>
    <Text style={{fontSize:sm?10:12,fontWeight:"700",color:c.color}}>{language==="sw"?(c.sw||c.label):c.label}</Text>
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
    <View style={{minHeight:50,flexDirection:"row",alignItems:"center",paddingHorizontal:14,paddingVertical:7,backgroundColor:theme.colors.surface,borderBottomWidth:1,borderBottomColor:theme.colors.border,gap:10}}>
      <TouchableOpacity style={{width:34,height:34,borderRadius:17,backgroundColor:theme.colors.surfaceSoft,alignItems:"center",justifyContent:"center"}} onPress={onBack} activeOpacity={0.7}>
        <AppIcon name="arrowLeft" size={18} color={theme.colors.text}/>
      </TouchableOpacity>
      <Text style={{flex:1,fontSize:17,fontWeight:"900",color:theme.colors.text}} numberOfLines={1}>{title}</Text>
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
