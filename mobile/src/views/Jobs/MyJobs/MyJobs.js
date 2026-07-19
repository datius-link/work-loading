import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { getUserSession, useUserSession } from "../../../utils/userSession";
import CreateJobModal from "./CreateJobModal";
import { UploadManager } from "../../../utils/UploadManager";
import { formatRelativeDate, formatJobDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { StatusBadge } from "../jobsUI";
import { cachedGet } from "../../../utils/offlineCache";
import { isNetworkError } from "../../../utils/network";
import CachedDataNotice from "../../../components/CachedDataNotice";

const T = {
  en:{title:"My Jobs",subtitle:"Jobs you posted or sent directly.",loginTitle:"Sign in to continue",loginBody:"See your job posts, requests and responses.",loginAction:"Login",postJob:"Post a Job",emptyTitle:"No jobs yet",emptyBody:"Post a job or send a hire request. Everything appears here.",retry:"Try again",applicants:(n)=>`${n} applicant${n===1?"":"s"}`,postedOk:"Job posted",postedOkBody:"Providers can now apply for your job.",postFailed:"Could not post job",location:"Location not set",posted:"Posted",closes:"Closes",today:"Today"},
  sw:{title:"Kazi Zangu",subtitle:"Kazi ulizochapisha au kutuma.",loginTitle:"Ingia kuendelea",loginBody:"Ona kazi zako na maombi.",loginAction:"Ingia",postJob:"Chapisha Kazi",emptyTitle:"Hakuna kazi bado",emptyBody:"Chapisha kazi au tuma ombi.",retry:"Jaribu tena",applicants:(n)=>`${n} ${n===1?"mwombaji":"waombaji"}`,postedOk:"Kazi imechapishwa",postedOkBody:"Watoa huduma wanaweza kuomba.",postFailed:"Imeshindikana",location:"Eneo halijawekwa",posted:"Imechapishwa",closes:"Inafungwa",today:"Leo"},
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
  const s=useMemo(()=>createStyles(theme),[theme]);
  const {refresh:refreshSession}=useUserSession();

  const [jobs,setJobs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [needsLogin,setNeedsLogin]=useState(false);
  const [error,setError]=useState("");
  const [showCreate,setShowCreate]=useState(false);
  const [posting,setPosting]=useState(false);
  const [notice,setNotice]=useState(null);
  const [showingCached,setShowingCached]=useState(false);
  const [retryPayload,setRetryPayload]=useState(null);
  const lastSignal=useRef(createJobSignal);

  const hasLoadedRef=useRef(false);
  const load=useCallback(async({refresh=false}={})=>{
    if(refresh)setRefreshing(true);else if(!hasLoadedRef.current)setLoading(true);
    try{
      setError("");
      const session=await getUserSession();
      if(!session.isLoggedIn){setNeedsLogin(true);setJobs([]);return;}
      setNeedsLogin(false);
      // Stale-while-revalidate: cached jobs paint immediately, live data
      // swaps in via onFresh when the network answers.
      const result=await cachedGet("hiring:my-jobs",()=>viewerRequest("get","/hiring/my-jobs").then(res=>res.data),{
        onFresh:(fresh)=>{if(Array.isArray(fresh?.data?.jobs)){setJobs(fresh.data.jobs);setShowingCached(false);}},
      });
      setJobs(Array.isArray(result?.data?.jobs)?result.data.jobs:[]);
      setShowingCached(!!result.fromCache&&!result.revalidating);
      hasLoadedRef.current=true;
    }catch(err){
      if([401,403].includes(err?.response?.status)){setNeedsLogin(true);setJobs([]);}
      else {setError(getFriendlyApiError(err,language));setShowingCached(false);}
    }finally{setLoading(false);setRefreshing(false);}
  },[language]);

  useFocusEffect(useCallback(()=>{load();},[load]));
  useEffect(()=>{
    if(!createJobSignal||createJobSignal===lastSignal.current)return;
    lastSignal.current=createJobSignal;openPost();
  },[createJobSignal]);

  const openPost=async()=>{
    const session=await getUserSession();
    if(!session.isLoggedIn){nav.navigate("Login",{onSuccess:async()=>{await refreshSession();load();}});return;}
    setShowCreate(true);
  };

  const submitJob=async(payload)=>{
    if(posting)return;setPosting(true);
    try{
      const media=payload.images?.length?await UploadManager.startUpload(payload.images,"jobs"):[];
      await viewerRequest("post","/hiring/jobs",{title:payload.title,description:payload.description,service_type:payload.service_type,location:payload.location,tender_closes_at:payload.tender_closes_at,availability_required:payload.availability_required,scheduled_for:payload.scheduled_for||null,availability_notes:payload.availability_notes||null,budget_min:payload.budget_min||null,budget_max:payload.budget_max||null,requirements:payload.requirements||[],skills:payload.skills||[],media});
      setShowCreate(false);await load({refresh:true});
      setRetryPayload(null);
      setNotice({type:"success",title:t.postedOk,body:t.postedOkBody});
    }catch(err){
      const uploadNetworkFailure=isNetworkError(err)&&payload.images?.length;
      setRetryPayload(uploadNetworkFailure?payload:null);
      setNotice({
        type:"error",
        title:t.postFailed,
        body:uploadNetworkFailure
          ?(language==="sw"?"Media haijapakiwa kwa sababu ya tatizo la mtandao. Jaribu tena.":"Media upload failed because of connection problem. Try again.")
          :getFriendlyApiError(err,language),
        retry:uploadNetworkFailure,
      });
    }
    finally{setPosting(false);}
  };

  const renderItem=({item})=>{
    const phase=jobPhase(item);
    const count=Number(item.applicant_count||0);
    const code=item.job_code||item.code||"JOB";
    const deadline=formatJobDate(item.tender_closes_at);
    return(
      <TouchableOpacity style={s.jobRow} activeOpacity={0.82} onPress={()=>nav.navigate("JobDetails",{jobId:item.id})}>
        <View style={s.cardTop}>
          <View style={s.codeRow}>
            <View style={s.statusDot}/>
            <Text style={s.codeText}>{code}</Text>
          </View>
          <StatusBadge status={phase} size="sm"/>
        </View>
        <View style={s.mainRow}>
          <View style={s.mainCopy}>
            <Text style={s.title} numberOfLines={1}>{item.title}</Text>
            <View style={s.metaRow}><AppIcon name="map-pin" size={11} color={theme.colors.textMuted}/><Text style={s.meta} numberOfLines={1}>{item.location||t.location}</Text></View>
          </View>
          <AppIcon name="chevron-right" size={15} color={theme.colors.textMuted}/>
        </View>
        <View style={s.cardFooter}>
          <Text style={s.metaSm}>{t.posted} {formatRelativeDate(item.created_at)||t.today}</Text>
          {deadline?<Text style={s.metaSm}>· {t.closes} {deadline}</Text>:null}
          {count>0?<View style={s.applicantPill}><Text style={s.applicantTxt}>{t.applicants(count)}</Text></View>:null}
        </View>
      </TouchableOpacity>
    );
  };

  const listEmpty=()=>{
    if(loading)return<View style={s.center}><ActivityIndicator color={theme.colors.primary} size="large"/></View>;
    if(needsLogin)return(
      <View style={s.center}>
        <View style={s.emptyIcon}><AppIcon name="lock" size={28} color={theme.colors.primary}/></View>
        <Text style={s.emptyTitle}>{t.loginTitle}</Text>
        <Text style={s.emptyBody}>{t.loginBody}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={()=>setShowLogin(true)}>
          <AppIcon name="login" size={17} color={theme.colors.onPrimary}/><Text style={s.primaryTxt}>{t.loginAction}</Text>
        </TouchableOpacity>
      </View>
    );
    if(error)return(
      <View style={s.center}>
        <View style={[s.emptyIcon,{backgroundColor:theme.colors.dangerSoft}]}><AppIcon name="warning" size={28} color={theme.colors.danger}/></View>
        <Text style={s.emptyTitle}>{error}</Text>
        <TouchableOpacity style={s.outlineBtn} onPress={()=>load()}><Text style={s.outlineTxt}>{t.retry}</Text></TouchableOpacity>
      </View>
    );
    return(
      <View style={s.center}>
        <View style={s.emptyIcon}><AppIcon name="briefcase" size={28} color={theme.colors.primary}/></View>
        <Text style={s.emptyTitle}>{t.emptyTitle}</Text>
        <Text style={s.emptyBody}>{t.emptyBody}</Text>
        <TouchableOpacity style={s.postBtn} onPress={openPost}>
          <AppIcon name="plus" size={17} color={theme.colors.onAccent}/><Text style={s.postTxt}>{t.postJob}</Text>
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
            <AppIcon name="plus" size={20} color={theme.colors.onAccent}/>
          </TouchableOpacity>
        </View>
      )}
      <CachedDataNotice visible={showingCached}/>
      <FlatList
        data={jobs} keyExtractor={i=>String(i.id)} renderItem={renderItem}
        contentContainerStyle={[s.list,!jobs.length&&{flexGrow:1}]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.colors.primary} onRefresh={()=>load({refresh:true})}/>}
        ListEmptyComponent={listEmpty}
      />
      <CreateJobModal visible={showCreate} onClose={()=>setShowCreate(false)} mode="indirect" onSubmit={submitJob} submitting={posting}/>
      <HiringNoticeModal
        visible={!!notice}
        type={notice?.type}
        title={notice?.title}
        body={notice?.body}
        primaryLabel={notice?.retry?(language==="sw"?"Jaribu tena":"Retry"):"OK"}
        secondaryLabel={notice?.retry?(language==="sw"?"Baadaye":"Later"):undefined}
        onPrimary={()=>{
          const payload=retryPayload;
          setNotice(null);
          if(payload)submitJob(payload);
        }}
        onSecondary={()=>setNotice(null)}
        onClose={()=>setNotice(null)}
      />
    </SafeAreaView>
  );
}

const createStyles=(theme)=>StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center",padding:32,gap:12},
  header:{flexDirection:"row",alignItems:"center",paddingHorizontal:20,paddingVertical:16,backgroundColor:theme.colors.surface,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  headerTitle:{fontSize:24,fontWeight:"900",color:theme.colors.text},
  headerSub:{fontSize:13,color:theme.colors.textMuted,marginTop:2},
  fab:{width:44,height:44,borderRadius:22,backgroundColor:theme.colors.accent,alignItems:"center",justifyContent:"center",shadowColor:theme.colors.accent,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:5},
  list:{paddingHorizontal:16,paddingTop:4,paddingBottom:100},
  jobRow:{paddingVertical:10,borderBottomWidth:1,borderBottomColor:theme.colors.border,gap:5},
  cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  codeRow:{flexDirection:"row",alignItems:"center",gap:6},
  statusDot:{width:6,height:6,borderRadius:3,backgroundColor:theme.colors.primary},
  codeText:{color:theme.colors.textMuted,fontSize:10.5,fontWeight:"800",letterSpacing:.4},
  mainRow:{flexDirection:"row",alignItems:"center",gap:8},
  mainCopy:{flex:1,gap:3},
  title:{fontSize:15,fontWeight:"900",color:theme.colors.text,lineHeight:19},
  metaRow:{flexDirection:"row",alignItems:"center",gap:5},
  meta:{color:theme.colors.textMuted,fontSize:11.5,flex:1},
  metaSm:{color:theme.colors.textMuted,fontSize:10.5},
  cardFooter:{flexDirection:"row",alignItems:"center",gap:5},
  applicantPill:{marginLeft:"auto",backgroundColor:theme.colors.accentSoft,paddingHorizontal:7,paddingVertical:2,borderRadius:7},
  applicantTxt:{color:theme.colors.accent,fontSize:11,fontWeight:"700"},
  emptyIcon:{width:72,height:72,borderRadius:22,backgroundColor:theme.colors.primarySoft,alignItems:"center",justifyContent:"center"},
  emptyTitle:{fontSize:18,fontWeight:"800",color:theme.colors.text,textAlign:"center"},
  emptyBody:{fontSize:14,color:theme.colors.textMuted,textAlign:"center",lineHeight:21},
  primaryBtn:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:24,paddingVertical:13,backgroundColor:theme.colors.primary,borderRadius:12,shadowColor:theme.colors.primary,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  primaryTxt:{color:theme.colors.onPrimary,fontWeight:"800",fontSize:15},
  postBtn:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:24,paddingVertical:13,backgroundColor:theme.colors.accent,borderRadius:12,shadowColor:theme.colors.accent,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4},
  postTxt:{color:theme.colors.onAccent,fontWeight:"800",fontSize:15},
  outlineBtn:{paddingHorizontal:24,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:theme.colors.border},
  outlineTxt:{color:theme.colors.text,fontWeight:"700"},
});
