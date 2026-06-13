import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { viewerRequest } from "../../../api/api";
import LoginModal from "../../Auth/LoginModal";
import { getUserSession, useUserSession } from "../../../utils/userSession";
import CreateJobModal from "./CreateJobModal";
import { UploadManager } from "../../../utils/UploadManager";
import { formatRelativeDate, formatJobDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { C, StatusBadge } from "../jobsUI";

const T = {
  en:{title:"My Jobs",subtitle:"Jobs you posted or sent directly.",loginTitle:"Sign in to continue",loginBody:"See your job posts, requests and responses.",loginAction:"Login",postJob:"Post a Job",emptyTitle:"No jobs yet",emptyBody:"Post a job or send a hire request. Everything appears here.",retry:"Try again",applicants:(n)=>`${n} applicant${n===1?"":"s"}`,postedOk:"Job posted",postedOkBody:"Providers can now apply for your job.",postFailed:"Could not post job"},
  sw:{title:"Kazi Zangu",subtitle:"Kazi ulizochapisha au kutuma.",loginTitle:"Ingia kuendelea",loginBody:"Ona kazi zako na maombi.",loginAction:"Ingia",postJob:"Chapisha Kazi",emptyTitle:"Hakuna kazi bado",emptyBody:"Chapisha kazi au tuma ombi.",retry:"Jaribu tena",applicants:(n)=>`${n} ${n===1?"mwombaji":"waombaji"}`,postedOk:"Kazi imechapishwa",postedOkBody:"Watoa huduma wanaweza kuomba.",postFailed:"Imeshindikana"},
};

function jobPhase(job){
  const st=String(job?.status||"open");
  const ap=Number(job?.applicant_count||0);
  if(["closed","filled","completed"].includes(st))return "completed";
  if(["active","start_pending","working","completion_pending","started","submitted"].includes(st))return "in_progress";
  if(st==="pending")return "waiting_approval";
  if(st==="applied"||ap>0)return "applications";
  return "posted";
}

export default function MyJobs({embedded=false,createJobSignal=0}){
  const nav=useNavigation();
  const {theme}=useAppTheme();
  const {language}=useLanguage();const t=T[language]||T.en;
  const {refresh:refreshSession}=useUserSession();

  const [jobs,setJobs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [needsLogin,setNeedsLogin]=useState(false);
  const [error,setError]=useState("");
  const [showLogin,setShowLogin]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [posting,setPosting]=useState(false);
  const [notice,setNotice]=useState(null);
  const lastSignal=useRef(createJobSignal);

  const load=useCallback(async({refresh=false}={})=>{
    if(refresh)setRefreshing(true);else setLoading(true);
    try{
      setError("");
      const session=await getUserSession();
      if(!session.isLoggedIn){setNeedsLogin(true);setJobs([]);return;}
      setNeedsLogin(false);
      const res=await viewerRequest("get","/hiring/my-jobs");
      setJobs(Array.isArray(res?.data?.jobs)?res.data.jobs:[]);
    }catch(err){
      if([401,403].includes(err?.response?.status)){setNeedsLogin(true);setJobs([]);}
      else setError(err?.response?.data?.message||"Failed to load jobs");
    }finally{setLoading(false);setRefreshing(false);}
  },[]);

  useFocusEffect(useCallback(()=>{load();},[load]));
  useEffect(()=>{
    if(!createJobSignal||createJobSignal===lastSignal.current)return;
    lastSignal.current=createJobSignal;openPost();
  },[createJobSignal]);

  const openPost=async()=>{
    const session=await getUserSession();
    if(!session.isLoggedIn){setShowLogin(true);return;}
    setShowCreate(true);
  };

  const submitJob=async(payload)=>{
    if(posting)return;setPosting(true);
    try{
      const media=payload.images?.length?await UploadManager.startUpload(payload.images,"jobs"):[];
      await viewerRequest("post","/hiring/jobs",{title:payload.title,description:payload.description,service_type:payload.service_type,location:payload.location,tender_closes_at:payload.tender_closes_at,availability_required:payload.availability_required,scheduled_for:payload.scheduled_for||null,availability_notes:payload.availability_notes||null,media});
      setShowCreate(false);await load({refresh:true});
      setNotice({type:"success",title:t.postedOk,body:t.postedOkBody});
    }catch(err){setNotice({type:"error",title:t.postFailed,body:err?.response?.data?.message||"Please try again."});}
    finally{setPosting(false);}
  };

  const renderItem=({item})=>{
    const phase=jobPhase(item);
    const count=Number(item.applicant_count||0);
    const code=item.job_code||item.code||"JOB";
    const deadline=formatJobDate(item.tender_closes_at);
    return(
      <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={()=>nav.navigate("JobDetails",{jobId:item.id})}>
        <View style={s.cardTop}>
          <View style={s.codePill}><Text style={s.codeText}>{code}</Text></View>
          <StatusBadge status={phase} size="sm"/>
        </View>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        <View style={s.metaRow}><AppIcon name="map-pin" size={12} color={C.slate}/><Text style={s.meta} numberOfLines={1}>{item.location||"Location not set"}</Text></View>
        <View style={s.cardFooter}>
          <View style={s.metaRow}><AppIcon name="calendar" size={12} color={C.slate}/><Text style={s.metaSm}>Posted {formatRelativeDate(item.created_at)||"Today"}</Text></View>
          {deadline?<View style={s.metaRow}><AppIcon name="calendar" size={12} color={C.slate}/><Text style={s.metaSm}>Closes {deadline}</Text></View>:null}
          {count>0?<View style={s.applicantPill}><Text style={s.applicantTxt}>{t.applicants(count)}</Text></View>:null}
        </View>
      </TouchableOpacity>
    );
  };

  const listEmpty=()=>{
    if(loading)return<View style={s.center}><ActivityIndicator color={C.teal} size="large"/></View>;
    if(needsLogin)return(
      <View style={s.center}>
        <View style={s.emptyIcon}><AppIcon name="lock" size={28} color={C.teal}/></View>
        <Text style={s.emptyTitle}>{t.loginTitle}</Text>
        <Text style={s.emptyBody}>{t.loginBody}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={()=>setShowLogin(true)}>
          <AppIcon name="login" size={17} color={C.white}/><Text style={s.primaryTxt}>{t.loginAction}</Text>
        </TouchableOpacity>
      </View>
    );
    if(error)return(
      <View style={s.center}>
        <View style={[s.emptyIcon,{backgroundColor:C.redLight}]}><AppIcon name="warning" size={28} color={C.red}/></View>
        <Text style={s.emptyTitle}>{error}</Text>
        <TouchableOpacity style={s.outlineBtn} onPress={()=>load()}><Text style={s.outlineTxt}>{t.retry}</Text></TouchableOpacity>
      </View>
    );
    return(
      <View style={s.center}>
        <View style={s.emptyIcon}><AppIcon name="briefcase" size={28} color={C.teal}/></View>
        <Text style={s.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={s.emptyBody}>{t.emptyBody}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={openPost}>
          <AppIcon name="plus" size={17} color={C.white}/><Text style={s.primaryTxt}>{t.postJob}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return(
    <SafeAreaView style={s.safe} edges={embedded?[]:["top"]}>
      {!embedded&&(
        <View style={s.header}>
          <View style={{flex:1}}>
            <Text style={s.headerTitle}>{t.title}</Text>
            <Text style={s.headerSub}>{t.subtitle}</Text>
          </View>
          <TouchableOpacity style={s.fab} onPress={openPost}>
            <AppIcon name="plus" size={20} color={C.white}/>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={jobs} keyExtractor={i=>String(i.id)} renderItem={renderItem}
        contentContainerStyle={[s.list,!jobs.length&&{flexGrow:1}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.teal} onRefresh={()=>load({refresh:true})}/>}
        ListEmptyComponent={listEmpty}
      />
      <LoginModal visible={showLogin} onClose={()=>setShowLogin(false)} onSuccess={async()=>{setShowLogin(false);await refreshSession();load();}}/>
      <CreateJobModal visible={showCreate} onClose={()=>setShowCreate(false)} mode="indirect" onSubmit={submitJob} submitting={posting}/>
      <HiringNoticeModal visible={!!notice} type={notice?.type} title={notice?.title} body={notice?.body} onPrimary={()=>setNotice(null)} onClose={()=>setNotice(null)}/>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center",padding:32,gap:12},
  header:{flexDirection:"row",alignItems:"center",paddingHorizontal:20,paddingVertical:16,backgroundColor:C.white,borderBottomWidth:1,borderBottomColor:"#EEF0F4"},
  headerTitle:{fontSize:24,fontWeight:"900",color:"#1A1A2E"},
  headerSub:{fontSize:13,color:C.slate,marginTop:2},
  fab:{width:44,height:44,borderRadius:22,backgroundColor:C.teal,alignItems:"center",justifyContent:"center",shadowColor:C.teal,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:5},
  list:{paddingHorizontal:16,paddingTop:12,paddingBottom:100,gap:10},
  card:{backgroundColor:C.white,borderRadius:16,padding:14,borderWidth:1,borderColor:"#EEF0F4",shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:2,gap:6},
  cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:2},
  codePill:{backgroundColor:C.tealLight,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  codeText:{color:C.teal,fontSize:11,fontWeight:"800"},
  title:{fontSize:16,fontWeight:"800",color:"#1A1A2E",lineHeight:22},
  metaRow:{flexDirection:"row",alignItems:"center",gap:5},
  meta:{color:C.slate,fontSize:13,flex:1},
  metaSm:{color:C.slate,fontSize:12},
  cardFooter:{flexDirection:"row",alignItems:"center",gap:12,marginTop:4,flexWrap:"wrap"},
  applicantPill:{marginLeft:"auto",backgroundColor:C.blueLight,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  applicantTxt:{color:C.blue,fontSize:11,fontWeight:"700"},
  emptyIcon:{width:72,height:72,borderRadius:22,backgroundColor:C.tealLight,alignItems:"center",justifyContent:"center"},
  emptyTitle:{fontSize:18,fontWeight:"800",color:"#1A1A2E",textAlign:"center"},
  emptyBody:{fontSize:14,color:C.slate,textAlign:"center",lineHeight:21},
  primaryBtn:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:24,paddingVertical:13,backgroundColor:C.teal,borderRadius:14,shadowColor:C.teal,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  primaryTxt:{color:C.white,fontWeight:"800",fontSize:15},
  outlineBtn:{paddingHorizontal:24,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:C.slate},
  outlineTxt:{color:C.slate,fontWeight:"700"},
});
