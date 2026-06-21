/**
 * JobApplicantDetails.js - redesigned
 * Shown to hirer when reviewing a provider's application.
 * After hiring: shows "Open Workspace" button.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../../theme";
import { useLanguage } from "../../../LanguageContext";
import AppIcon from "../../../icons/AppIcon";
import { getFriendlyApiError, viewerRequest } from "../../../api/api";
import { formatJobDate, formatRelativeDate } from "../jobDate";
import HiringNoticeModal from "../HiringNoticeModal";
import { NavHeader, SectionHeading, PrimaryButton, InfoRow } from "../jobsUI";

const T={
  en:{budget:"Budget",time:"Est. Time",available:"Available From",experience:"Experience",howIWork:"How I'll do this",workImages:"Previous Work / Tools",notes:"Additional Notes",jobInfo:"Job Info",hire:"Hire This Provider",openWorkspace:"Open Job Workspace",closed:"Request Closed",confirmTitle:"Hire provider?",confirmBack:"Cancel",confirmHire:"Hire",hired:"Provider hired!",errHire:"Could not hire",noRating:"Not rated yet"},
  sw:{budget:"Bajeti",time:"Muda",available:"Anapatikana",experience:"Uzoefu",howIWork:"Jinsi nitakavyofanya",workImages:"Kazi Zilizopita / Zana",notes:"Maelezo ya Ziada",jobInfo:"Taarifa ya Kazi",hire:"Mwajiri Mtoa Huduma",openWorkspace:"Fungua Workspace",closed:"Imefungwa",confirmTitle:"Mwajiri?",confirmBack:"Rudi",confirmHire:"Mwajiri",hired:"Ameajiriwa!",errHire:"Imeshindikana",noRating:"Hakuna ukadiriaji"},
};

function formatBudget(v){const r=String(v||"").trim();if(!r)return"Not set";if(/^TZS\b/i.test(r))return r;const n=r.replace(/[^\d.]/g,"");return n?`TZS ${Number(n).toLocaleString("en-US")}`:r;}
function avatarUri(u){if(u?.profilePic||u?.profile_pic)return u.profilePic||u.profile_pic;return`https://ui-avatars.com/api/?name=${encodeURIComponent(u?.username||"P")}&background=0B6B63&color=fff&bold=true&rounded=true`;}

export default function JobApplicantDetails(){
  const nav=useNavigation();const route=useRoute();
  const {theme,mode}=useAppTheme();const {language}=useLanguage();const t=T[language]||T.en;
  const s=useMemo(()=>createStyles(theme),[theme]);
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const isWide=width>=900;
  const [hiring,setHiring]=useState(false);
  const [notice,setNotice]=useState(null);
  const [detailJob,setDetailJob]=useState(null);
  const [hired,setHired]=useState(false);

  const request=route.params?.request||null;
  const provider=request?.provider;
  const jobId=request?.job?.id;

  useEffect(()=>{
    if(!jobId)return;
    let cancelled=false;
    viewerRequest("get",`/hiring/jobs/${jobId}`).then(res=>{
      if(!cancelled&&res?.data?.job){
        setDetailJob(res.data.job);
        const j=res.data.job;
        if(["filled","active","start_pending","working","completion_pending","completed","closed"].includes(j.status))setHired(true);
      }
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[jobId]);

  if(!request||!provider||!request.job){
    return(
      <SafeAreaView style={s.safe} edges={["top"]}>
        <NavHeader title={t.screenTitle||"Provider Request"} onBack={()=>nav.goBack()}/>
        <View style={s.center}><Text style={s.notFoundTxt}>Request not available</Text></View>
      </SafeAreaView>
    );
  }

  const isClosed=request.status==="closed";
  const BOTTOM=80+insets.bottom;

  const hireProvider=()=>{
    if(isClosed){setNotice({type:"error",title:t.closed});return;}
    setNotice({
      type:"confirm",title:t.confirmTitle,
      body:`Hire @${provider.username} for "${request.job.title}"?`,
      primaryLabel:t.confirmHire,secondaryLabel:t.confirmBack,
      onPrimary:async()=>{
        try{
          setHiring(true);
          await viewerRequest("post",`/hiring/jobs/${request.job.id}/assign`,{profile_uuid:provider.uuid});
          setHired(true);
          setNotice({type:"success",title:t.hired,body:`@${provider.username} has been assigned. A job workspace has been created.`,onPrimary:()=>nav.navigate("JobWorkspace", {
            jobId: request.job.id,
            jobCode: request.job.code,
          })});
        }catch(e){setNotice({type:"error",title:t.errHire,body:getFriendlyApiError(e,language)});}
        finally{setHiring(false);}
      },
    });
  };

  return(
    <SafeAreaView style={s.safe} edges={["top"]}>
      <StatusBar barStyle={mode==="dark"?"light-content":"dark-content"} backgroundColor={theme.colors.surface}/>
      <NavHeader title={language==="sw"?"Ombi la Mtoa Huduma":"Provider Request"} onBack={()=>nav.goBack()}/>
      <ScrollView
        style={Platform.OS==="web"&&s.webScroller}
        showsVerticalScrollIndicator={Platform.OS==="web"}
        contentContainerStyle={[s.scroll,{paddingBottom:BOTTOM+16},isWide&&s.scrollWide]}
      >
        <View style={[s.contentShell,isWide&&s.contentShellWide]}>

        {/* Compact provider identity */}
        <View style={s.profileBanner}>
          <Image source={{uri:avatarUri(provider)}} style={s.avatar}/>
          <View style={s.profileCopy}>
            <Text style={s.provUsername}>@{provider.username}</Text>
            <Text style={s.provFull}>{provider.fullName||provider.full_name||""}</Text>
            <View style={s.ratingRow}>
              {provider.rating
                ?<><AppIcon name="star" size={13} color={theme.colors.warning} filled/><Text style={s.ratingTxt}>{provider.rating}</Text></>
                :<Text style={s.ratingTxt}>{t.noRating}</Text>}
            </View>
          </View>
          <TouchableOpacity style={s.profileLink} onPress={()=>nav.navigate("UserProfile",{uuid:provider.uuid})}>
            <AppIcon name="chevron-right" size={17} color={theme.colors.primary}/>
          </TouchableOpacity>
        </View>

        {/* How I'll do it */}
        <View style={s.section}>
          <SectionHeading label={t.howIWork}/>
          <Text style={s.bodyTxt}>{request.explanation||"No explanation provided."}</Text>
        </View>

        {/* Offer summary */}
        <View style={s.section}>
          <SectionHeading label={language==="sw"?"Muhtasari wa ofa":"Offer summary"}/>
          <View>
            {[{l:t.budget,v:formatBudget(request.budget)},{l:t.time,v:request.duration||"Not set"},{l:t.available,v:request.availableFrom||"Not set"},{l:t.experience,v:request.experience||"Not set"}].map(r=>(
              <View key={r.l} style={s.infoRow}>
                <Text style={s.infoLbl}>{r.l}</Text>
                <Text style={s.infoVal}>{r.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Work images */}
        {request.images?.length?(
          <View style={s.section}>
            <SectionHeading label={t.workImages}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10,paddingRight:4}}>
              {request.images.map((uri,i)=><Image key={`${uri}-${i}`} source={{uri}} style={s.workImg}/>)}
            </ScrollView>
          </View>
        ):null}

        {/* Notes */}
        {request.notes?(
          <View style={s.section}><SectionHeading label={t.notes}/><Text style={s.bodyTxt}>{request.notes}</Text></View>
        ):null}

        {/* Job mini card */}
        <View style={s.section}>
          <SectionHeading label={t.jobInfo}/>
          <View style={s.jobCodeRow}>
            <View style={s.jobCodePill}><Text style={s.jobCodeTxt}>{request.job.code}</Text></View>
          </View>
          <Text style={s.jobTitle}>{request.job.title}</Text>
          <InfoRow icon="map-pin" label="Location" value={request.job.location||"Not set"}/>
          <InfoRow icon="calendar" label="Posted" value={formatRelativeDate(request.job.postedAt)||"Today"}/>
        </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[s.bottomBar,{paddingBottom:insets.bottom+14},isWide&&s.bottomBarWide]}>
        {hired?(
          <PrimaryButton label={t.openWorkspace} icon="message"
            onPress={()=>nav.navigate("JobWorkspace", {
              jobId: request.job.id,
              jobCode: request.job.code,
            })}/>
        ):(
          <PrimaryButton
            label={isClosed?t.closed:t.hire} icon={isClosed?"lock":"check"}
            disabled={isClosed||hiring} loading={hiring}
            onPress={hireProvider}/>
        )}
      </View>

      <HiringNoticeModal visible={!!notice} type={notice?.type} title={notice?.title} body={notice?.body}
        primaryLabel={notice?.primaryLabel} secondaryLabel={notice?.secondaryLabel}
        loading={hiring}
        onPrimary={async()=>{const n=notice;if(n?.onPrimary)await n.onPrimary();else setNotice(null);}}
        onSecondary={()=>setNotice(null)} onClose={()=>setNotice(null)}/>
    </SafeAreaView>
  );
}

const createStyles=(theme)=>StyleSheet.create({
  safe:{flex:1,backgroundColor:theme.colors.bg},
  center:{flex:1,alignItems:"center",justifyContent:"center"},
  notFoundTxt:{fontSize:17,fontWeight:"700",color:theme.colors.text},
  webScroller:{height:"100vh"},
  scroll:{paddingHorizontal:16},
  scrollWide:{alignItems:"center"},
  contentShell:{},
  contentShellWide:{width:"100%",maxWidth:1180},
  profileBanner:{flexDirection:"row",alignItems:"center",gap:11,paddingVertical:12,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  avatar:{width:54,height:54,borderRadius:27,borderWidth:2,borderColor:theme.colors.primarySoft,backgroundColor:theme.colors.surfaceSoft},
  profileCopy:{flex:1,minWidth:0},
  profileLink:{width:32,height:32,alignItems:"center",justifyContent:"center"},
  provUsername:{fontSize:16,fontWeight:"900",color:theme.colors.text},
  provFull:{fontSize:11.5,color:theme.colors.textMuted,marginTop:1},
  ratingRow:{flexDirection:"row",alignItems:"center",gap:4},
  ratingTxt:{fontSize:13,fontWeight:"700",color:theme.colors.warning},
  section:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  bodyTxt:{fontSize:14,color:theme.colors.textMuted,lineHeight:22},
  infoRow:{minHeight:38,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,borderBottomWidth:1,borderBottomColor:theme.colors.borderLight},
  infoLbl:{color:theme.colors.textMuted,fontSize:12,fontWeight:"700"},
  infoVal:{color:theme.colors.text,fontSize:13,fontWeight:"900",textAlign:"right"},
  workImg:{width:140,height:110,borderRadius:12,backgroundColor:theme.colors.surfaceSoft},
  jobCodeRow:{marginBottom:6},
  jobCodePill:{backgroundColor:theme.colors.surface,paddingHorizontal:8,paddingVertical:3,borderRadius:8,alignSelf:"flex-start"},
  jobCodeTxt:{color:theme.colors.primary,fontSize:11,fontWeight:"800"},
  jobTitle:{fontSize:17,fontWeight:"800",color:theme.colors.text,marginBottom:4},
  bottomBar:{borderTopWidth:1,borderTopColor:theme.colors.border,paddingHorizontal:16,paddingTop:14,backgroundColor:theme.colors.surface},
  bottomBarWide:{alignSelf:"center",width:"100%",maxWidth:1180,borderLeftWidth:1,borderRightWidth:1,borderColor:theme.colors.border},
});
