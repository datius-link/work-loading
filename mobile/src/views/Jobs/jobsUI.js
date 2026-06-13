/**
 * jobsUI.js — Shared design tokens + micro-components for the Jobs module.
 */
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import AppIcon from "../../icons/AppIcon";

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
  open:{label:"Open",color:"#0B6B63",bg:"#E8F5F4"},
  posted:{label:"Posted",color:"#0B6B63",bg:"#E8F5F4"},
  applied:{label:"Applied",color:"#2563EB",bg:"#DBEAFE"},
  applications:{label:"Applications",color:"#2563EB",bg:"#DBEAFE"},
  assigned:{label:"Assigned",color:"#0B6B63",bg:"#E8F5F4"},
  waiting_approval:{label:"Pending",color:"#F59E0B",bg:"#FEF3C7"},
  requested:{label:"Requested",color:"#F59E0B",bg:"#FEF3C7"},
  in_progress:{label:"In Progress",color:"#EA580C",bg:"#FFEDD5"},
  active:{label:"Active",color:"#EA580C",bg:"#FFEDD5"},
  completed:{label:"Completed",color:"#16A34A",bg:"#DCFCE7"},
  filled:{label:"Filled",color:"#16A34A",bg:"#DCFCE7"},
  closed:{label:"Closed",color:"#64748B",bg:"#F1F5F9"},
  not_attained:{label:"Not Attained",color:"#DC2626",bg:"#FEE2E2"},
  approved:{label:"Approved",color:"#16A34A",bg:"#DCFCE7"},
  cancelled:{label:"Cancelled",color:"#DC2626",bg:"#FEE2E2"},
  declined:{label:"Declined",color:"#DC2626",bg:"#FEE2E2"},
};

export function statusConfig(key) {
  return STATUS_MAP[String(key||"open").replace(/ /g,"_").toLowerCase()]
    ||{label:String(key||"Open"),color:"#0B6B63",bg:"#E8F5F4"};
}

export function StatusBadge({status,size="md"}){
  const c=statusConfig(status);const sm=size==="sm";
  return(<View style={[{paddingHorizontal:sm?7:10,paddingVertical:sm?2:4,borderRadius:20,backgroundColor:c.bg}]}>
    <Text style={{fontSize:sm?10:12,fontWeight:"700",color:c.color}}>{c.label}</Text>
  </View>);
}

export function SectionHeading({label}){
  return <Text style={{fontSize:11,fontWeight:"800",color:"#64748B",textTransform:"uppercase",letterSpacing:0.9,marginBottom:10}}>{label}</Text>;
}

export function PrimaryButton({label,onPress,disabled,loading,icon,danger}){
  const bg=danger?"#DC2626":"#0B6B63";
  return(
    <TouchableOpacity style={[{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:52,borderRadius:14,backgroundColor:bg,shadowColor:"#0B6B63",shadowOffset:{width:0,height:4},shadowOpacity:0.28,shadowRadius:10,elevation:5},(disabled||loading)&&{opacity:0.5,shadowOpacity:0}]}
      onPress={onPress} disabled={disabled||loading} activeOpacity={0.85}>
      {loading?<ActivityIndicator color="#fff"/>:<>{icon?<AppIcon name={icon} size={18} color="#fff"/>:null}<Text style={{color:"#fff",fontSize:16,fontWeight:"800"}}>{label}</Text></>}
    </TouchableOpacity>
  );
}

export function OutlineButton({label,onPress,disabled,icon,color}){
  const c=color||"#0B6B63";
  return(
    <TouchableOpacity style={{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:48,borderRadius:14,borderWidth:1.5,borderColor:c,backgroundColor:"#fff"}}
      onPress={onPress} disabled={disabled} activeOpacity={0.85}>
      {icon?<AppIcon name={icon} size={16} color={c}/>:null}
      <Text style={{fontSize:15,fontWeight:"700",color:c}}>{label}</Text>
    </TouchableOpacity>
  );
}

export function NavHeader({title,onBack,right}){
  return(
    <View style={{flexDirection:"row",alignItems:"center",paddingHorizontal:16,paddingVertical:12,backgroundColor:"#fff",borderBottomWidth:1,borderBottomColor:"#EEF0F4",gap:12}}>
      <TouchableOpacity style={{width:38,height:38,borderRadius:19,backgroundColor:"#F1F5F9",alignItems:"center",justifyContent:"center"}} onPress={onBack} activeOpacity={0.7}>
        <AppIcon name="arrowLeft" size={20} color="#1A1A2E"/>
      </TouchableOpacity>
      <Text style={{flex:1,fontSize:18,fontWeight:"800",color:"#1A1A2E"}} numberOfLines={1}>{title}</Text>
      <View style={{minWidth:38}}>{right||null}</View>
    </View>
  );
}

export function InfoRow({label,value,icon}){
  return(
    <View style={{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#F0F2F5"}}>
      {icon?<AppIcon name={icon} size={14} color="#0B6B63"/>:null}
      <Text style={{color:"#64748B",fontSize:13,fontWeight:"600",width:90}}>{label}</Text>
      <Text style={{flex:1,color:"#1A1A2E",fontSize:13,fontWeight:"700",textAlign:"right"}}>{value}</Text>
    </View>
  );
}

export function EmptyState({icon,title,body,action,onAction}){
  return(
    <View style={{flex:1,alignItems:"center",justifyContent:"center",padding:32,gap:12}}>
      <View style={{width:72,height:72,borderRadius:22,backgroundColor:"#E8F5F4",alignItems:"center",justifyContent:"center",marginBottom:4}}>
        <AppIcon name={icon} size={28} color="#0B6B63"/>
      </View>
      <Text style={{fontSize:18,fontWeight:"800",color:"#1A1A2E",textAlign:"center"}}>{title}</Text>
      {body?<Text style={{fontSize:14,color:"#64748B",textAlign:"center",lineHeight:21}}>{body}</Text>:null}
      {action?<TouchableOpacity style={{marginTop:8,paddingHorizontal:24,paddingVertical:12,backgroundColor:"#0B6B63",borderRadius:12}} onPress={onAction}><Text style={{color:"#fff",fontWeight:"700"}}>{action}</Text></TouchableOpacity>:null}
    </View>
  );
}

export function Card({children,style}){
  return <View style={[{backgroundColor:"#fff",borderRadius:16,padding:16,borderWidth:1,borderColor:"#EEF0F4",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:6,elevation:2},style]}>{children}</View>;
}
