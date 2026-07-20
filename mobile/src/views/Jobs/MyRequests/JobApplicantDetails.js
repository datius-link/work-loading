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
import { NavHeader, SectionHeading, PrimaryButton } from "../jobsUI";

const T={
  en:{budget:"Budget",time:"Est. Time",available:"Available",experience:"Experience",proposalNote:"Proposal Note",workImages:"Previous Work / Tools",notes:"Additional Notes",jobInfo:"Job Info",hire:"Hire This Provider",openWorkspace:"Open Job Workspace",closed:"Request Closed",confirmTitle:"Hire provider?",confirmBack:"Cancel",confirmHire:"Hire",hired:"Provider hired!",errHire:"Could not hire",noRating:"Not rated yet"},
  sw:{budget:"Bajeti",time:"Muda",available:"Anapatikana",experience:"Uzoefu",proposalNote:"Maelezo ya Pendekezo",workImages:"Kazi Zilizopita / Zana",notes:"Maelezo ya Ziada",jobInfo:"Taarifa ya Kazi",hire:"Mwajiri Mtoa Huduma",openWorkspace:"Fungua Workspace",closed:"Imefungwa",confirmTitle:"Mwajiri?",confirmBack:"Rudi",confirmHire:"Mwajiri",hired:"Ameajiriwa!",errHire:"Imeshindikana",noRating:"Hakuna ukadiriaji"},
};

function formatBudget(v){const r=String(v||"").trim();if(!r)return"Not set";if(/^TZS\b/i.test(r))return r;const n=r.replace(/[^\d.]/g,"");return n?`TZS ${Number(n).toLocaleString("en-US")}`:r;}
function avatarUri(u){if(u?.profilePic||u?.profile_pic)return u.profilePic||u.profile_pic;return`https://ui-avatars.com/api/?name=${encodeURIComponent(u?.username||"P")}&background=1683C7&color=fff&bold=true&rounded=true`;}

// Small soft box (icon + label + value) used in the 2x2 offer-summary grid.
function GridItem({icon,label,value,theme,styles}){
  return(
    <View style={styles.gridItem}>
      <View style={styles.gridIconWrap}>
        <AppIcon name={icon} size={14} color={theme.colors.primaryStrong}/>
      </View>
      <View style={{flex:1,minWidth:0}}>
        <Text style={styles.gridLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.gridValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export default function JobApplicantDetails(){
  const nav=useNavigation();const route=useRoute();
  const {theme,mode}=useAppTheme();const {language}=useLanguage();const t=T[language]||T.en;
  const s=useMemo(()=>createStyles(theme),[theme]);
  const insets=useSafeAreaInsets();
  const {width}=useWindowDimensions();
  const isWide=width>=900;
  const request=route.params?.request||null;
  const provider=request?.provider;
  const jobId=request?.job?.id;

  const [hiring,setHiring]=useState(false);
  const [notice,setNotice]=useState(null);
  const [detailJob,setDetailJob]=useState(null);
  // "Hired" means THIS provider is the one assigned to the job — not merely
  // that the job has moved past "open". The old check only looked at
  // job.status, so once ANY applicant got hired, every OTHER applicant's
  // detail screen also flipped to "Open Workspace" (wrong), while a slow or
  // failed background refetch (silently swallowed below) could leave the
  // actually-hired applicant's screen stuck showing "Hire This Provider"
  // (also wrong, and the one reported). Seeding from the job data already in
  // route params makes the correct state available on first render, with no
  // network round trip required.
  const [hired,setHired]=useState(
    ()=>!!(request?.job?.assigned_provider_uuid && request.job.assigned_provider_uuid===provider?.uuid)
  );

  useEffect(()=>{
    if(!jobId)return;
    let cancelled=false;
    viewerRequest("get",`/hiring/jobs/${jobId}`).then(res=>{
      if(!cancelled&&res?.data?.job){
        setDetailJob(res.data.job);
        const j=res.data.job;
        if(j.assigned_provider_uuid&&provider?.uuid&&j.assigned_provider_uuid===provider.uuid)setHired(true);
      }
    }).catch(()=>{});
    return()=>{cancelled=true;};
  },[jobId,provider?.uuid]);

  if(!request||!provider||!request.job){
    return(
      <SafeAreaView style={s.safe} edges={["top"]}>
        <NavHeader title={t.screenTitle||"Provider Request"} onBack={()=>nav.goBack()}/>
        <View style={s.center}><Text style={s.notFoundTxt}>Request not available</Text></View>
      </SafeAreaView>
    );
  }

  const isClosed=request.status==="closed";
  const BOTTOM=68+insets.bottom;

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
                ?<>
                  {[1,2,3,4,5].map((star)=>(
                    <AppIcon key={star} name="star" size={13} color="#F5B301" filled={star<=Math.round(Math.max(0,Math.min(5,Number(provider.rating)||0)))}/>
                  ))}
                  <Text style={s.ratingTxt}>{Math.max(0,Math.min(5,Number(provider.rating)||0)).toFixed(1)}</Text>
                </>
                :<Text style={s.ratingTxt}>{t.noRating}</Text>}
            </View>
          </View>
          <TouchableOpacity style={s.profileLink} onPress={()=>nav.navigate("UserProfile",{uuid:provider.uuid})}>
            <AppIcon name="chevron-right" size={17} color={theme.colors.primary}/>
          </TouchableOpacity>
        </View>

        {/* Proposal note — compact, not a big block */}
        <View style={s.section}>
          <SectionHeading label={t.proposalNote}/>
          <Text style={s.bodyTxt}>{request.explanation||"No explanation provided."}</Text>
        </View>

        {/* Offer summary — 2x2 grid instead of 4 stacked rows */}
        <View style={s.section}>
          <SectionHeading label={language==="sw"?"Muhtasari wa ofa":"Offer Summary"}/>
          <View style={s.infoGrid}>
            <GridItem icon="wallet" label={t.budget} value={formatBudget(request.budget)} theme={theme} styles={s}/>
            <GridItem icon="clock" label={t.time} value={request.duration||"Not set"} theme={theme} styles={s}/>
            <GridItem icon="calendar" label={t.available} value={request.availableFrom||"Not set"} theme={theme} styles={s}/>
            <GridItem icon="award" label={t.experience} value={request.experience||"Not set"} theme={theme} styles={s}/>
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

        {/* Job info — one compact block, no per-row dividers */}
        <View style={[s.section,s.sectionLast]}>
          <SectionHeading label={t.jobInfo}/>
          <View style={s.jobInfoRow}>
            <View style={s.jobCodePill}><Text style={s.jobCodeTxt}>{request.job.code}</Text></View>
            <Text style={s.jobTitleInline} numberOfLines={1}>{request.job.title}</Text>
          </View>
          <View style={s.jobMetaRow}>
            <AppIcon name="map-pin" size={13} color={theme.colors.textMuted}/>
            <Text style={s.jobMetaTxt}>{request.job.location||"Not set"}</Text>
            <Text style={s.jobMetaDot}>•</Text>
            <AppIcon name="calendar" size={13} color={theme.colors.textMuted}/>
            <Text style={s.jobMetaTxt}>{formatRelativeDate(request.job.postedAt)||"Today"}</Text>
          </View>
        </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[s.bottomBar,{paddingBottom:insets.bottom+10},isWide&&s.bottomBarWide]}>
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
            accent={!isClosed}
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
  scroll:{paddingHorizontal:24},
  scrollWide:{alignItems:"center"},
  contentShell:{},
  contentShellWide:{width:"100%",maxWidth:1180},

  // Compact provider identity — smaller gaps, no extra air.
  profileBanner:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  avatar:{width:64,height:64,borderRadius:32,borderWidth:1.5,borderColor:theme.colors.primarySoft,backgroundColor:theme.colors.surfaceSoft},
  profileCopy:{flex:1,minWidth:0,gap:2},
  profileLink:{width:30,height:30,alignItems:"center",justifyContent:"center"},
  provUsername:{fontSize:16,fontWeight:"900",color:theme.colors.text},
  provFull:{fontSize:11.5,color:theme.colors.textMuted},
  ratingRow:{flexDirection:"row",alignItems:"center",gap:4},
  ratingTxt:{fontSize:13,fontWeight:"700",color:theme.colors.warning},

  // Sections flow with a hairline only at each section boundary — no
  // internal per-row dividers.
  section:{paddingVertical:14,borderBottomWidth:1,borderBottomColor:theme.colors.border},
  sectionLast:{borderBottomWidth:0,paddingBottom:4},
  bodyTxt:{fontSize:14,color:theme.colors.textMuted,lineHeight:21},

  // Offer summary — 2x2 grid of small soft boxes instead of 4 tall rows.
  infoGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:2},
  gridItem:{
    flexBasis:"47%",flexGrow:1,flexDirection:"row",alignItems:"center",gap:8,
    backgroundColor:theme.colors.surfaceSoft,borderRadius:12,padding:10,
  },
  gridIconWrap:{width:28,height:28,borderRadius:9,backgroundColor:theme.colors.primarySoft,alignItems:"center",justifyContent:"center"},
  gridLabel:{color:theme.colors.textMuted,fontSize:10.5,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.3},
  gridValue:{color:theme.colors.text,fontSize:13,fontWeight:"800",marginTop:1},

  workImg:{width:140,height:110,borderRadius:12,backgroundColor:theme.colors.surfaceSoft},

  // Job info — one compact block: code + title inline, then a single
  // meta row with location and posted date. No per-row dividers.
  jobInfoRow:{flexDirection:"row",alignItems:"center",gap:8,marginTop:2},
  jobCodePill:{backgroundColor:theme.colors.surfaceSoft,paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  jobCodeTxt:{color:theme.colors.primary,fontSize:11,fontWeight:"800"},
  jobTitleInline:{flex:1,fontSize:15,fontWeight:"800",color:theme.colors.text},
  jobMetaRow:{flexDirection:"row",alignItems:"center",gap:5,marginTop:8},
  jobMetaTxt:{color:theme.colors.textMuted,fontSize:12.5,fontWeight:"600"},
  jobMetaDot:{color:theme.colors.textVeryMuted||theme.colors.textMuted,fontSize:12,marginHorizontal:1},

  // Sticky bottom bar — trimmed padding so it reads as a slim action strip.
  bottomBar:{borderTopWidth:1,borderTopColor:theme.colors.border,paddingHorizontal:16,paddingTop:10,backgroundColor:theme.colors.surface},
  bottomBarWide:{alignSelf:"center",width:"100%",maxWidth:1180,borderLeftWidth:1,borderRightWidth:1,borderColor:theme.colors.border},
});
